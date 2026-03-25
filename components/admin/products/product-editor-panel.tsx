import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductFormState, ProductRecord } from '@/lib/admin/page-types';
import { Checkbox } from '@/components/ui/checkbox';

interface ProductEditorPanelProps {
  form: ProductFormState;
  saving: boolean;
  uploadingImages: boolean;
  selectedProduct: ProductRecord | null;
  parseImages: (value: string) => string[];
  onFormChange: (patch: Partial<ProductFormState>) => void;
  onUpdateVariant: (index: number, field: 'size' | 'stock', value: string) => void;
  onAddVariant: () => void;
  onRemoveVariant: (index: number) => void;
  onRemoveImage: (index: number) => void;
  onReplaceImage: (index: number, file: File | null) => void;
  onImageUpload: (files: FileList | null) => void;
  onSave: () => void;
  onReset: () => void;
}

export function ProductEditorPanel({
  form,
  saving,
  uploadingImages,
  selectedProduct,
  parseImages,
  onFormChange,
  onUpdateVariant,
  onAddVariant,
  onRemoveVariant,
  onRemoveImage,
  onReplaceImage,
  onImageUpload,
  onSave,
  onReset,
}: ProductEditorPanelProps) {
  return (
    <section className="border-2 border-foreground">
      <div className="border-b-2 border-foreground px-lg py-md">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{selectedProduct ? 'Edit Product' : 'Create Product'}</h2>
      </div>
      <div className="space-y-4 px-lg py-lg">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">SKU</label>
            <Input value={form.sku} onChange={(event) => onFormChange({ sku: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Name</label>
            <Input value={form.name} onChange={(event) => onFormChange({ name: event.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Description</label>
          <Textarea value={form.description} onChange={(event) => onFormChange({ description: event.target.value })} rows={4} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Price</label>
            <Input type="number" min="0" step="0.01" value={form.price} onChange={(event) => onFormChange({ price: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Category</label>
            <Input value={form.category} onChange={(event) => onFormChange({ category: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Color</label>
            <Input value={form.color} onChange={(event) => onFormChange({ color: event.target.value })} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="is-featured"
            checked={form.is_featured}
            onCheckedChange={(value) => onFormChange({ is_featured: Boolean(value) })}
            className="h-4 w-4 rounded-none border-2 border-foreground bg-background focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
          />
          <label htmlFor="is-featured" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Feature on home page
          </label>
        </div>

        <div className="space-y-3">
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Product Images</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            multiple
            onChange={(event) => onImageUpload(event.target.files)}
            disabled={uploadingImages}
            className="block w-full border-2 border-foreground bg-background px-md py-sm text-sm text-foreground transition-colors focus-visible:bg-input focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 file:mr-md file:border-2 file:border-foreground file:bg-background file:px-md file:py-xs file:text-xs file:uppercase file:tracking-[0.2em] file:text-foreground file:transition-colors hover:file:bg-foreground hover:file:text-background disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            {uploadingImages ? 'Uploading images...' : 'Upload images to Supabase storage. Max file size is 5MB each.'}
          </p>
          <div className="space-y-2">
            {parseImages(form.images).length === 0 ? (
              <p className="text-xs text-muted-foreground">No images uploaded yet.</p>
            ) : (
              parseImages(form.images).map((image, index) => (
                <div key={`${image}-${index}`} className="flex flex-col items-start gap-3 border-2 border-foreground px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="truncate text-xs text-muted-foreground">{image}</span>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                    <label className="inline-flex h-8 w-full cursor-pointer items-center justify-center border-2 border-foreground px-3 text-xs uppercase tracking-[0.2em] text-foreground transition-colors duration-300 hover:bg-foreground hover:text-background sm:w-auto">
                      Replace
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          onReplaceImage(index, file);
                          event.currentTarget.value = '';
                        }}
                        disabled={uploadingImages}
                      />
                    </label>
                    <button
                      onClick={() => onRemoveImage(index)}
                      className="inline-flex h-8 w-full items-center justify-center border-2 border-red-600/40 px-3 text-xs uppercase tracking-[0.2em] text-red-700 transition-colors duration-300 hover:bg-red-600 hover:text-background sm:w-auto"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Variants</label>
            <button onClick={onAddVariant} className="inline-flex h-9 items-center justify-center border-2 border-foreground px-3 text-xs uppercase tracking-[0.2em] text-foreground transition-colors duration-300 hover:bg-foreground hover:text-background">
              Add Variant
            </button>
          </div>
          <div className="space-y-3">
            {form.variants.map((variant, index) => (
              <div key={variant.id || `new-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_100px] md:items-end">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Size</label>
                  <Input value={variant.size} onChange={(event) => onUpdateVariant(index, 'size', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stock</label>
                  <Input type="number" min="0" step="1" value={variant.stock} onChange={(event) => onUpdateVariant(index, 'stock', event.target.value)} />
                </div>
                <button onClick={() => onRemoveVariant(index)} disabled={form.variants.length === 1} className="inline-flex h-10 items-center justify-center border-2 border-foreground px-4 text-xs uppercase tracking-[0.2em] text-foreground transition-colors duration-300 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={onSave} disabled={saving} className="inline-flex h-10 items-center justify-center border-2 border-foreground bg-foreground px-4 text-xs uppercase tracking-[0.2em] text-background transition-colors duration-300 hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Saving...' : selectedProduct ? 'Update Product' : 'Create Product'}
          </button>
          <button onClick={onReset} className="inline-flex h-10 items-center justify-center border-2 border-foreground px-4 text-xs uppercase tracking-[0.2em] text-foreground transition-colors duration-300 hover:bg-foreground hover:text-background">
            Reset Form
          </button>
        </div>
      </div>
    </section>
  );
}