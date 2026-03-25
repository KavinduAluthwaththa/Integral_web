import { useEffect, useState } from 'react';
import { FeaturedProduct, getFeaturedProducts, getProductNameSuggestions } from '@/lib/domain/products';

export function useHomeCatalog() {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [loadingFeaturedProducts, setLoadingFeaturedProducts] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadHomeCatalog = async () => {
      setLoadingFeaturedProducts(true);

      const [featured, names] = await Promise.all([
        getFeaturedProducts(3),
        getProductNameSuggestions(120),
      ]);

      if (!isActive) {
        return;
      }

      setFeaturedProducts(featured);
      setProductNames(names);
      setLoadingFeaturedProducts(false);
    };

    void loadHomeCatalog();

    return () => {
      isActive = false;
    };
  }, []);

  return {
    featuredProducts,
    productNames,
    loadingFeaturedProducts,
  };
}
