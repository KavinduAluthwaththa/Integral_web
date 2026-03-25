import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/server-admin-auth';
import { normalizeProductPayload, validateProductPayload } from '@/lib/admin';

const PRODUCT_IMAGE_BUCKET = 'product-images';

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;

  const { client } = auth;
  const payload = normalizeProductPayload(await req.json());
  const validationError = validateProductPayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data: existingProduct, error: existingProductError } = await client
    .from('products')
    .select('images')
    .eq('id', id)
    .maybeSingle();

  if (existingProductError) {
    return NextResponse.json({ error: existingProductError.message }, { status: 500 });
  }

  if (!existingProduct) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const { data: existingVariants, error: existingVariantsError } = await client
    .from('product_variants')
    .select('id')
    .eq('product_id', id);

  if (existingVariantsError) {
    return NextResponse.json({ error: existingVariantsError.message }, { status: 500 });
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
    })
    .eq('id', id);

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }

  const keepVariantIds = payload.variants.map((variant) => variant.id).filter(Boolean) as string[];
  const variantRows = payload.variants.map((variant) => ({
    id: variant.id,
    product_id: id,
    size: variant.size,
    stock: variant.stock,
  }));

  const { error: upsertError } = await client
    .from('product_variants')
    .upsert(variantRows, { onConflict: 'id' });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
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
      return NextResponse.json({ error: deleteVariantsError.message }, { status: 500 });
    }
  }

  const existingImagePaths = new Set(getBucketPathsFromImages(existingProduct.images));
  const nextImagePaths = new Set(getBucketPathsFromImages(payload.images));
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;

  const { client } = auth;
  const { data: product, error: productFetchError } = await client
    .from('products')
    .select('images')
    .eq('id', id)
    .maybeSingle();

  if (productFetchError) {
    return NextResponse.json({ error: productFetchError.message }, { status: 500 });
  }

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const imagePaths = getBucketPathsFromImages(product.images);

  if (imagePaths.length > 0) {
    const { error: storageError } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove(imagePaths);

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }
  }

  const { error } = await client.from('products').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
