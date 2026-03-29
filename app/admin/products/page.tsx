'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useAdminGuard } from '@/hooks/admin/use-admin-guard';
import { createAdminApiClient, ProductRecord } from '@/lib/admin';
import { Input } from '@/components/ui/input';
import { CatalogList } from '@/components/admin/products';

export default function AdminProductsPage() {
  const { session } = useAuth();
  const { uniqueItemCount } = useCart();
  const { isAdmin, checkingAdmin } = useAdminGuard();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductRecord | null>(null);

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

  // Show success message when returning from editor routes.
  useEffect(() => {
    const status = searchParams.get('status');
    if (!status) return;
    if (status === 'created') {
      setMessage('Product created');
    } else if (status === 'updated') {
      setMessage('Product updated');
    }
    // Clear the param to avoid stale messages on navigation/back.
    router.replace('/admin/products');
  }, [router, searchParams]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      [product.name, product.sku, product.id, product.category, product.color]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [products, searchQuery]);

  const handleDelete = (product: ProductRecord) => {
    setPendingDelete(product);
    setErrorMessage(null);
    setMessage(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    setErrorMessage(null);
    setMessage(null);

    try {
      await apiRequest(`/api/admin/products/${pendingDelete.id}`, { method: 'DELETE' });
      setProducts((current) => current.filter((item) => item.id !== pendingDelete.id));
      setMessage('Product deleted');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to delete product');
    } finally {
      setPendingDelete(null);
    }
  };

  const cancelDelete = () => setPendingDelete(null);

  if (checkingAdmin) {
    return (
      <>
        <Navbar cartCount={uniqueItemCount} onCartClick={() => {}} onSearchClick={() => {}} />
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
      <Navbar cartCount={uniqueItemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background pt-4xl pb-4xl">
        <div className="max-w-7xl mx-auto px-xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-wide">Product Operations</h1>
              <p className="text-muted-foreground mt-2">Create, edit, and retire products with live variant inventory.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products" className="w-full lg:w-72" />
              <button onClick={() => router.push('/admin/products/new')} className="inline-flex h-10 w-full items-center justify-center border-2 border-foreground/40 bg-foreground px-4 text-xs uppercase tracking-[0.2em] text-background transition-colors duration-300 hover:bg-foreground/90 sm:w-auto">
                New Product
              </button>
            </div>
          </div>

          {message && <div className="border-2 border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700">{message}</div>}
          {errorMessage && <div className="border-2 border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

          <CatalogList
            loading={loading}
            products={filteredProducts}
            onEdit={(product) => router.push(`/admin/products/${product.id}`)}
            onDelete={handleDelete}
          />
        </div>
      </main>

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md border-2 border-foreground/40 bg-background shadow-xl">
            <div className="border-b-2 border-foreground/40 px-5 py-3">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Delete product</p>
            </div>
            <div className="space-y-4 px-5 py-4">
              <p className="text-base font-light tracking-wide">Delete {pendingDelete.name}?</p>
              <p className="text-sm text-muted-foreground">This cannot be undone.</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={confirmDelete}
                  className="inline-flex h-10 flex-1 items-center justify-center border-2 border-red-600/60 bg-red-600 text-background px-4 text-xs uppercase tracking-[0.2em] transition-colors hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={cancelDelete}
                  className="inline-flex h-10 flex-1 items-center justify-center border-2 border-foreground/40 px-4 text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
