import Link from 'next/link';
import Image from 'next/image';
import { RecommendedProduct } from '@/lib/recommendations';

interface ProductRecommendationsProps {
  relatedProducts: RecommendedProduct[];
  sourceProductId: string;
  userId?: string;
  onRecommendationClick: (recommendedProductId: string, sourceProductId: string, userId?: string) => void;
}

export function ProductRecommendations({
  relatedProducts,
  sourceProductId,
  userId,
  onRecommendationClick,
}: ProductRecommendationsProps) {
  return (
    <>
      {relatedProducts.length > 0 && (
        <div className="mt-24 pt-12 border-t border-foreground/10">
          <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-10">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((related, index) => {
              const isAboveTheFold = index === 0;
              return (
              <Link
                key={related.id}
                href={`/product/${related.sku}`}
                className="group"
                onClick={() => onRecommendationClick(related.id, sourceProductId, userId)}
              >
                <div className="relative aspect-[3/4] bg-secondary overflow-hidden mb-4">
                  <Image
                    src={related.images[0]}
                    alt={related.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    loading={isAboveTheFold ? 'eager' : 'lazy'}
                    priority={isAboveTheFold}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider mb-1">{related.name}</h3>
                  <p className="text-xs text-muted-foreground">${related.price.toFixed(2)}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {related.recommendationReason}
                  </p>
                </div>
              </Link>
            );
            })}
          </div>
        </div>
      )}
    </>
  );
}