import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/server-admin-auth';
import { normalizeProductPayload, validateProductPayload } from '@/lib/admin';

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

export async function GET(req: NextRequest) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { client } = auth;
  const { data, error } = await client
    .from('products')
    .select(`
      *,
      product_variants (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
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

  const { data: product, error: productError } = await client
    .from('products')
    .insert({
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
    .select('*')
    .single();

  if (productError || !product) {
    return jsonError(productError?.message || 'Failed to create product', 500);
  }

  const variantRows = payload.variants.map((variant) => ({
    product_id: product.id,
    size: variant.size,
    stock: variant.stock,
  }));

  const { error: variantsError } = await client.from('product_variants').insert(variantRows);

  if (variantsError) {
    await client.from('products').delete().eq('id', product.id);
    return jsonError(variantsError.message, 500);
  }

  const { data: createdProduct, error: createdProductError } = await client
    .from('products')
    .select(`
      *,
      product_variants (*)
    `)
    .eq('id', product.id)
    .single();

  if (createdProductError) {
    return jsonError(createdProductError.message, 500);
  }

  return NextResponse.json({ data: createdProduct }, { status: 201 });
}
