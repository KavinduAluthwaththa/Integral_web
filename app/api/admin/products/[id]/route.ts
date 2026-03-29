import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/server-admin-auth';
import { normalizeProductPayload, validateProductPayload } from '@/lib/admin';

const PRODUCT_IMAGE_BUCKET = 'product-images';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function isValidProductId(id: string) {
  return /^[0-9a-fA-F-]{16,}$/.test(id.trim());
}

function getBucketPathFromImageUrl(url: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const encodedPath = parsed.pathname.slice(markerIndex + marker.length);
    const decodedPath = decodeURIComponent(encodedPath);

    return decodedPath || null;
  } catch {
    return null;
  }
}

function getBucketPathsFromImages(images: unknown): string[] {
  return Array.from(
    new Set(
      (Array.isArray(images) ? images : [])
        .map((image: unknown) => getBucketPathFromImageUrl(String(image || '')))
        .filter((value: string | null): value is string => Boolean(value))
    )
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  if (!isValidProductId(id)) {
    return jsonError('Invalid product id', 400);
  }

  const { client } = auth;
  const { data, error } = await client
    .from('products')
    .select(`
      *,
      product_variants (*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data) {
    return jsonError('Product not found', 404);
  }

  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  if (!isValidProductId(id)) {
    return jsonError('Invalid product id', 400);
  }

  const { client } = auth;
  let rawBody: any;
  try {
    rawBody = await readJson(req);
  } catch (error: any) {
    return jsonError(error?.message || 'Invalid JSON body', 400);
  }

  const payload = normalizeProductPayload(rawBody);
  const validationError = validateProductPayload(payload);

  if (validationError) {
    return jsonError(validationError, 400);
  }

  const { data: existingProduct, error: existingProductError } = await client
    .from('products')
    .select('images, size_chart_images')
    .eq('id', id)
    .maybeSingle();

  if (existingProductError) {
    return jsonError(existingProductError.message, 500);
  }

  if (!existingProduct) {
    return jsonError('Product not found', 404);
  }

  const { data: existingVariants, error: existingVariantsError } = await client
    .from('product_variants')
    .select('id')
    .eq('product_id', id);

  if (existingVariantsError) {
    return jsonError(existingVariantsError.message, 500);
  }

  const { error: productError } = await client
    .from('products')
    .update({
      sku: payload.sku,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      category: payload.category,
      color: payload.color,
      is_featured: payload.is_featured,
      images: payload.images,
      is_hidden: payload.is_hidden,
      is_limited_edition: payload.is_limited_edition,
      size_chart_images: payload.size_chart_images,
    })
    .eq('id', id);

  if (productError) {
    return jsonError(productError.message, 500);
  }

  const keepVariantIds = payload.variants.map((variant) => variant.id).filter(Boolean) as string[];

  // Split variants into update vs insert to avoid null IDs in upsert
  const variantsToUpdate = payload.variants
    .filter((variant) => Boolean(variant.id))
    .map((variant) => ({
      id: variant.id as string,
      product_id: id,
      size: variant.size,
      stock: variant.stock,
    }));

  const variantsToInsert = payload.variants
    .filter((variant) => !variant.id)
    .map((variant) => ({
      product_id: id,
      size: variant.size,
      stock: variant.stock,
    }));
  const variantRows = payload.variants.map((variant) => {
    const base = {
      product_id: id,
      size: variant.size,
      stock: variant.stock,
    } as { id?: string; product_id: string; size: string; stock: number };

    if (variant.id) {
      base.id = variant.id;
    }

    return base;
  });

  if (variantsToUpdate.length > 0) {
    const { error: updateVariantsError } = await client
      .from('product_variants')
      .upsert(variantsToUpdate, { onConflict: 'id' });

    if (updateVariantsError) {
      return jsonError(updateVariantsError.message, 500);
    }
  }

  if (variantsToInsert.length > 0) {
    const { error: insertVariantsError } = await client
      .from('product_variants')
      .insert(variantsToInsert);

    if (insertVariantsError) {
      return jsonError(insertVariantsError.message, 500);
    }
  }

  const staleVariantIds = (existingVariants || [])
    .map((variant: { id: string }) => variant.id)
    .filter((id: string) => !keepVariantIds.includes(id));

  if (staleVariantIds.length > 0) {
    const { error: deleteVariantsError } = await client
      .from('product_variants')
      .delete()
      .in('id', staleVariantIds);

    if (deleteVariantsError) {
      return jsonError(deleteVariantsError.message, 500);
    }
  }

  const existingImagePaths = new Set([
    ...getBucketPathsFromImages(existingProduct.images),
    ...getBucketPathsFromImages(existingProduct.size_chart_images),
  ]);
  const nextImagePaths = new Set([
    ...getBucketPathsFromImages(payload.images),
    ...getBucketPathsFromImages(payload.size_chart_images),
  ]);
  const removedImagePaths = Array.from(existingImagePaths).filter((path) => !nextImagePaths.has(path));

  if (removedImagePaths.length > 0) {
    const { error: removeImagesError } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove(removedImagePaths);

    if (removeImagesError) {
      console.error('Failed to remove stale product images:', removeImagesError);
    }
  }

  const { data, error } = await client
    .from('products')
    .select(`
      *,
      product_variants (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = params;
  if (!isValidProductId(id)) {
    return jsonError('Invalid product id', 400);
  }

  const { client } = auth;
  const { data: product, error: productFetchError } = await client
    .from('products')
    .select('images, size_chart_images')
    .eq('id', id)
    .maybeSingle();

  if (productFetchError) {
    return jsonError(productFetchError.message, 500);
  }

  if (!product) {
    return jsonError('Product not found', 404);
  }

  const imagePaths = getBucketPathsFromImages([...(product.images || []), ...(product.size_chart_images || [])]);

  if (imagePaths.length > 0) {
    const { error: storageError } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove(imagePaths);

    if (storageError) {
      return jsonError(storageError.message, 500);
    }
  }

  const { error } = await client.from('products').delete().eq('id', id);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ success: true });
}
