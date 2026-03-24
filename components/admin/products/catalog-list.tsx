import { ProductRecord } from '@/lib/admin/page-types';

interface CatalogListProps {
  loading: boolean;
  products: ProductRecord[];
  onEdit: (product: ProductRecord) => void;
  onDelete: (product: ProductRecord) => void;
}

export function CatalogList({ loading, products, onEdit, onDelete }: CatalogListProps) {
  return (
    <section className="border-2 border-foreground">
      <div className="border-b-2 border-foreground px-lg py-md">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Catalog</h2>
      </div>
      {loading ? (
        <div className="px-lg py-10 text-sm text-muted-foreground">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="px-lg py-10 text-sm text-muted-foreground">No products found.</div>
      ) : (
        <div className="divide-y divide-foreground/10">
          {products.map((product) => (
            <div key={product.id} className="flex flex-col gap-3 px-lg py-lg md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-light tracking-wide">{product.name}</h3>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{product.sku}</span>
                </div>
                <p className="text-sm text-muted-foreground">{product.category} / {product.color}</p>
                {product.is_featured ? (
                  <p className="text-[10px] uppercase tracking-[0.25em] text-foreground">Featured</p>
                ) : null}
                <p className="text-sm font-light tracking-wide">${product.price.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  Variants: {product.product_variants.map((variant) => `${variant.size} (${variant.stock})`).join(', ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onEdit(product)} className="inline-flex h-10 w-full items-center justify-center border-2 border-foreground px-4 text-xs uppercase tracking-[0.2em] text-foreground transition-colors duration-300 hover:bg-foreground hover:text-background sm:w-auto">
                  Edit
                </button>
                <button onClick={() => onDelete(product)} className="inline-flex h-10 w-full items-center justify-center border-2 border-red-600/40 px-4 text-xs uppercase tracking-[0.2em] text-red-700 transition-colors duration-300 hover:bg-red-600 hover:text-background sm:w-auto">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}