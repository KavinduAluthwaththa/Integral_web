'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/hooks/admin/use-admin-guard';
import { createAdminApiClient, ProductFormState, ProductRecord } from '@/lib/admin';
import { Input } from '@/components/ui/input';
import { CatalogList, ProductEditorPanel } from '@/components/admin/products';

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

const emptyForm = (): ProductFormState => ({
  sku: '',
  name: '',
  description: '',
  price: '',
  category: '',
  color: '',
  is_featured: false,
  images: '',
  variants: [{ size: '', stock: 0 }],
});

export default function AdminProductsPage() {
  const { session } = useAuth();
  const { itemCount } = useCart();
  const { isAdmin, checkingAdmin } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const parseImages = (value: string) =>
    value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

  const replaceImages = (images: string[]) => {
    setForm((current) => ({ ...current, images: images.join('\n') }));
  };
  const apiRequest = useMemo(() => createAdminApiClient(session?.access_token), [session?.access_token]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const payload = await apiRequest('/api/admin/products', { method: 'GET' });
      setProducts((payload.data || []) as ProductRecord[]);
    } catch (error: any) {
      setProducts([]);
      setErrorMessage(error?.message || 'Failed to load products');
    }

    setLoading(false);
  }, [apiRequest]);

  useEffect(() => {
    if (isAdmin && session?.access_token) {
      void loadProducts();
    }
  }, [isAdmin, loadProducts, session?.access_token]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.sku, product.category, product.color]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [products, searchQuery]);

  const startCreate = () => {
    setSelectedProduct(null);
    setForm(emptyForm());
    setMessage(null);
    setErrorMessage(null);
  };

  const startEdit = (product: ProductRecord) => {
    setSelectedProduct(product);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category,
      color: product.color,
      is_featured: Boolean(product.is_featured),
      images: (product.images || []).join('\n'),
      variants: (product.product_variants || []).map((variant) => ({
        id: variant.id,
        size: variant.size,
        stock: variant.stock,
      })),
    });
    setMessage(null);
    setErrorMessage(null);
  };

  const updateVariant = (index: number, field: 'size' | 'stock', value: string) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) {
          return variant;
        }

        return {
          ...variant,
          [field]: field === 'stock' ? Number(value) || 0 : value,
        };
      }),
    }));
  };

  const addVariant = () => {
    setForm((current) => ({
      ...current,
      variants: [...current.variants, { size: '', stock: 0 }],
    }));
  };

  const removeVariant = (index: number) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const body = {
        sku: form.sku,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        color: form.color,
        is_featured: form.is_featured,
        images: parseImages(form.images),
        variants: form.variants,
      };

      const url = selectedProduct ? `/api/admin/products/${selectedProduct.id}` : '/api/admin/products';
      const method = selectedProduct ? 'PATCH' : 'POST';
      const payload = await apiRequest(url, {
        method,
        body: JSON.stringify(body),
      });

      const savedProduct = payload.data as ProductRecord;
      setProducts((current) => {
        if (selectedProduct) {
          return current.map((product) => (product.id === savedProduct.id ? savedProduct : product));
        }

        return [savedProduct, ...current];
      });
      setSelectedProduct(savedProduct);
      setMessage(selectedProduct ? 'Product updated' : 'Product created');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to save product');
    }

    setSaving(false);
  };

  const handleDelete = async (product: ProductRecord) => {
    const confirmed = window.confirm(`Delete ${product.name}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setMessage(null);

    try {
      await apiRequest(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      setProducts((current) => current.filter((item) => item.id !== product.id));
      if (selectedProduct?.id === product.id) {
        startCreate();
      }
      setMessage('Product deleted');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to delete product');
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

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

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      const nextImages = [...parseImages(form.images), ...uploadedUrls];
      replaceImages(nextImages);
      setMessage('Image upload complete');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to upload image');
    }

    setUploadingImages(false);
  };

  const removeImage = (index: number) => {
    const nextImages = parseImages(form.images).filter((_, itemIndex) => itemIndex !== index);
    replaceImages(nextImages);
  };

  const replaceImage = async (index: number, file: File | null) => {
    if (!file) {
      return;
    }

    setUploadingImages(true);
    setErrorMessage(null);

    try {
      const currentImages = parseImages(form.images);
      const currentUrl = currentImages[index];

      if (!currentUrl) {
        throw new Error('Image to replace was not found');
      }

      const existingPath = getBucketPathFromImageUrl(currentUrl);
      let nextUrl = currentUrl;

      if (existingPath) {
        const { error: overwriteError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(existingPath, file, { upsert: true });

        if (overwriteError) {
          throw overwriteError;
        }

        const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(existingPath);
        nextUrl = data.publicUrl;
      } else {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(path, file, { upsert: false });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
        nextUrl = data.publicUrl;
      }

      const nextImages = [...currentImages];
      nextImages[index] = nextUrl;
      replaceImages(nextImages);
      setMessage(existingPath ? 'Image replaced in storage path' : 'Image replaced with new storage file');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to replace image');
    }

    setUploadingImages(false);
  };

  if (checkingAdmin) {
    return (
      <>
        <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
        <main className="min-h-screen bg-background pt-4xl pb-4xl">
          <div className="max-w-7xl mx-auto px-xl flex items-center justify-center h-64 text-muted-foreground">
            Loading admin products...
          </div>
        </main>
      </>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background pt-4xl pb-4xl">
        <div className="max-w-7xl mx-auto px-xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-wide">Product Operations</h1>
              <p className="text-muted-foreground mt-2">Create, edit, and retire products with live variant inventory.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products" className="w-full lg:w-72" />
              <button onClick={startCreate} className="inline-flex h-10 w-full items-center justify-center border-2 border-foreground bg-foreground px-4 text-xs uppercase tracking-[0.2em] text-background transition-colors duration-300 hover:bg-foreground/90 sm:w-auto">
                New Product
              </button>
            </div>
          </div>

          {message && <div className="border-2 border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700">{message}</div>}
          {errorMessage && <div className="border-2 border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <CatalogList
              loading={loading}
              products={filteredProducts}
              onEdit={startEdit}
              onDelete={handleDelete}
            />

            <ProductEditorPanel
              form={form}
              saving={saving}
              uploadingImages={uploadingImages}
              selectedProduct={selectedProduct}
              parseImages={parseImages}
              onFormChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
              onUpdateVariant={updateVariant}
              onAddVariant={addVariant}
              onRemoveVariant={removeVariant}
              onRemoveImage={removeImage}
              onReplaceImage={(index, file) => void replaceImage(index, file)}
              onImageUpload={(files) => void handleImageUpload(files)}
              onSave={() => void handleSave()}
              onReset={startCreate}
            />
          </div>
        </div>
      </main>
    </>
  );
}
