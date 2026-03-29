'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/hooks/admin/use-admin-guard';
import { createAdminApiClient, ProductFormState, ProductRecord } from '@/lib/admin';
import { ProductEditorPanel } from '@/components/admin/products';
import { Button } from '@/components/ui/button';

const PRODUCT_IMAGE_BUCKET = 'product-images';

function getBucketPathFromImageUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    const encodedPath = parsed.pathname.slice(markerIndex + marker.length);
    const decodedPath = decodeURIComponent(encodedPath);
    return decodedPath || null;
  } catch {
    return null;
  }
}

const emptyForm = (): ProductFormState => ({
  sku: '',
  name: '',
  description: '',
  price: '',
  category: '',
  color: '',
  is_featured: false,
  is_hidden: false,
  is_limited_edition: false,
  images: '',
  size_chart_images: '',
  variants: [{ size: '', stock: 0 }],
});

function productToForm(product: ProductRecord): ProductFormState {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    price: product.price.toString(),
    category: product.category,
    color: product.color,
    is_featured: Boolean(product.is_featured),
    is_hidden: Boolean(product.is_hidden),
    is_limited_edition: Boolean(product.is_limited_edition),
    images: (product.images || []).join('\n'),
    size_chart_images: (product.size_chart_images || []).join('\n'),
    variants: (product.product_variants || []).map((variant) => ({
      id: variant.id,
      size: variant.size,
      stock: variant.stock,
    })),
  };
}

type ProductEditorPageProps = {
  productId?: string;
};

export function ProductEditorPage({ productId }: ProductEditorPageProps) {
  const { session } = useAuth();
  const { uniqueItemCount } = useCart();
  const { isAdmin, checkingAdmin } = useAdminGuard();
  const router = useRouter();

  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingSizeCharts, setUploadingSizeCharts] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState<boolean>(Boolean(productId));

  const apiRequest = useMemo(() => createAdminApiClient(session?.access_token), [session?.access_token]);

  const parseLines = (value: string) =>
    value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

  const parseImages = (value: string) => parseLines(value);
  const parseSizeCharts = (value: string) => parseLines(value);

  useEffect(() => {
    if (!productId || !isAdmin || !session?.access_token) return;
    let isMounted = true;

    const loadProduct = async () => {
      setLoadingProduct(true);
      setMessage(null);
      setErrorMessage(null);

      try {
        const payload = await apiRequest(`/api/admin/products/${productId}`, { method: 'GET' });
        const product = payload.data as ProductRecord | null;
        if (!product) {
          throw new Error('Product not found');
        }
        if (!isMounted) return;
        setSelectedProduct(product);
        setForm(productToForm(product));
      } catch (error: any) {
        if (!isMounted) return;
        setSelectedProduct(null);
        setErrorMessage(error?.message || 'Failed to load product');
      } finally {
        if (isMounted) {
          setLoadingProduct(false);
        }
      }
    };

    void loadProduct();

    return () => {
      isMounted = false;
    };
  }, [apiRequest, isAdmin, productId, session?.access_token]);

  const replaceImages = (images: string[]) => setForm((current) => ({ ...current, images: images.join('\n') }));
  const replaceSizeCharts = (images: string[]) => setForm((current) => ({ ...current, size_chart_images: images.join('\n') }));

  const resetForm = () => {
    setMessage(null);
    setErrorMessage(null);
    if (selectedProduct) {
      setForm(productToForm(selectedProduct));
    } else {
      setForm(emptyForm());
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);
    const isUpdating = Boolean(selectedProduct);

    try {
      const body = {
        sku: form.sku,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        color: form.color,
        is_featured: form.is_featured,
        is_hidden: form.is_hidden,
        is_limited_edition: form.is_limited_edition,
        images: parseImages(form.images),
        size_chart_images: parseSizeCharts(form.size_chart_images),
        variants: form.variants,
      };

      const url = isUpdating && selectedProduct ? `/api/admin/products/${selectedProduct.id}` : '/api/admin/products';
      const method = isUpdating ? 'PATCH' : 'POST';
      const payload = await apiRequest(url, { method, body: JSON.stringify(body) });

      const savedProduct = payload.data as ProductRecord;
      setSelectedProduct(savedProduct);
      setForm(productToForm(savedProduct));
      const status = isUpdating ? 'updated' : 'created';
      setMessage(isUpdating ? 'Product updated' : 'Product created');
      router.push(`/admin/products?status=${status}`);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to save product');
    }

    setSaving(false);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    setErrorMessage(null);

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      replaceImages([...parseImages(form.images), ...uploadedUrls]);
      setMessage('Image upload complete');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to upload image');
    }

    setUploadingImages(false);
  };

  const replaceImage = async (index: number, file: File | null) => {
    if (!file) return;

    setUploadingImages(true);
    setErrorMessage(null);

    try {
      const currentImages = parseImages(form.images);
      const currentUrl = currentImages[index];
      if (!currentUrl) throw new Error('Image to replace was not found');

      const existingPath = getBucketPathFromImageUrl(currentUrl);
      let nextUrl = currentUrl;

      if (existingPath) {
        const { error: overwriteError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(existingPath, file, { upsert: true });
        if (overwriteError) throw overwriteError;
        const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(existingPath);
        nextUrl = data.publicUrl;
      } else {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
        nextUrl = data.publicUrl;
      }

      const nextImages = [...currentImages];
      nextImages[index] = nextUrl;
      replaceImages(nextImages);
      setMessage('Image replaced');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to replace image');
    }

    setUploadingImages(false);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const current = parseImages(form.images);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    const [removed] = next.splice(index, 1);
    next.splice(targetIndex, 0, removed);
    replaceImages(next);
  };

  const removeImage = (index: number) => {
    const nextImages = parseImages(form.images).filter((_, itemIndex) => itemIndex !== index);
    replaceImages(nextImages);
  };

  const handleSizeChartUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingSizeCharts(true);
    setErrorMessage(null);

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `size-charts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      replaceSizeCharts([...parseSizeCharts(form.size_chart_images), ...uploadedUrls]);
      setMessage('Size chart upload complete');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to upload size chart image');
    }

    setUploadingSizeCharts(false);
  };

  const replaceSizeChartImage = async (index: number, file: File | null) => {
    if (!file) return;

    setUploadingSizeCharts(true);
    setErrorMessage(null);

    try {
      const currentImages = parseSizeCharts(form.size_chart_images);
      const currentUrl = currentImages[index];
      if (!currentUrl) throw new Error('Size chart image to replace was not found');

      const existingPath = getBucketPathFromImageUrl(currentUrl);
      let nextUrl = currentUrl;

      if (existingPath) {
        const { error: overwriteError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(existingPath, file, { upsert: true });
        if (overwriteError) throw overwriteError;
        const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(existingPath);
        nextUrl = data.publicUrl;
      } else {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `size-charts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
        nextUrl = data.publicUrl;
      }

      const nextImages = [...currentImages];
      nextImages[index] = nextUrl;
      replaceSizeCharts(nextImages);
      setMessage('Size chart image updated');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to replace size chart image');
    }

    setUploadingSizeCharts(false);
  };

  const moveSizeChartImage = (index: number, direction: 'up' | 'down') => {
    const current = parseSizeCharts(form.size_chart_images);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    const [removed] = next.splice(index, 1);
    next.splice(targetIndex, 0, removed);
    replaceSizeCharts(next);
  };

  const removeSizeChartImage = (index: number) => {
    const nextImages = parseSizeCharts(form.size_chart_images).filter((_, itemIndex) => itemIndex !== index);
    replaceSizeCharts(nextImages);
  };

  if (checkingAdmin) {
    return (
      <>
        <Navbar cartCount={uniqueItemCount} onCartClick={() => {}} onSearchClick={() => {}} />
        <main className="min-h-screen bg-background pt-4xl pb-4xl">
          <div className="max-w-5xl mx-auto px-xl flex items-center justify-center h-64 text-muted-foreground">
            Loading admin products...
          </div>
        </main>
      </>
    );
  }

  if (!isAdmin) return null;

  const isEditing = Boolean(productId || selectedProduct);
  const heading = isEditing ? 'Edit Product' : 'Create Product';
  const subheading = isEditing ? 'Update catalog details, media, and variants.' : 'Use the full-page editor to add catalog details and media.';

  return (
    <>
      <Navbar cartCount={uniqueItemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background pt-4xl pb-5xl">
        <div className="max-w-5xl mx-auto px-xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-wide">{heading}</h1>
              <p className="text-muted-foreground mt-2">{subheading}</p>
            </div>
            <Link href="/admin/products" className="inline-flex">
              <Button variant="outline" className="uppercase tracking-[0.2em] text-xs">Back to Products</Button>
            </Link>
          </div>

          {message && <div className="border-2 border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700">{message}</div>}
          {errorMessage && <div className="border-2 border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

          {loadingProduct ? (
            <div className="border-2 border-foreground/40 px-4 py-10 text-sm text-muted-foreground">Loading product...</div>
          ) : (
            <ProductEditorPanel
              form={form}
              saving={saving}
              uploadingImages={uploadingImages}
              uploadingSizeCharts={uploadingSizeCharts}
              selectedProduct={selectedProduct}
              parseImages={parseImages}
              parseSizeCharts={parseSizeCharts}
              onFormChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
              onUpdateVariant={(index, field, value) => setForm((current) => ({
                ...current,
                variants: current.variants.map((variant, variantIndex) => {
                  if (variantIndex !== index) return variant;
                  return { ...variant, [field]: field === 'stock' ? Number(value) || 0 : value };
                }),
              }))}
              onAddVariant={() => setForm((current) => ({ ...current, variants: [...current.variants, { size: '', stock: 0 }] }))}
              onRemoveVariant={(index) => setForm((current) => ({ ...current, variants: current.variants.filter((_, i) => i !== index) }))}
              onRemoveImage={removeImage}
              onMoveImage={moveImage}
              onReplaceImage={(index, file) => void replaceImage(index, file)}
              onImageUpload={(files) => void handleImageUpload(files)}
              onSizeChartUpload={(files) => void handleSizeChartUpload(files)}
              onRemoveSizeChartImage={removeSizeChartImage}
              onMoveSizeChartImage={moveSizeChartImage}
              onReplaceSizeChartImage={(index, file) => void replaceSizeChartImage(index, file)}
              onSave={() => void handleSave()}
              onReset={resetForm}
            />
          )}
        </div>
      </main>
    </>
  );
}
