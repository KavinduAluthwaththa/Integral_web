import { useCallback, useEffect, useState } from 'react';
import { getShopFilterData, getShopProducts, ShopProduct, ShopSortBy } from '@/lib/domain/products';

const PAGE_SIZE = 8;

export function useShopCatalog() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedColor, setSelectedColor] = useState('All');
  const [sortBy, setSortBy] = useState<ShopSortBy>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadFilterData = async () => {
      const filterData = await getShopFilterData();

      if (!isActive) {
        return;
      }

      setCategories(filterData.categories);
      setColors(filterData.colors);
      setProductNames(filterData.productNames);
    };

    void loadFilterData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedColor, sortBy, searchQuery]);

  const loadProducts = useCallback(async () => {
    setLoading(true);

    const result = await getShopProducts({
      page,
      pageSize: PAGE_SIZE,
      category: selectedCategory,
      color: selectedColor,
      searchQuery,
      sortBy,
    });

    setProducts(result.products);
    setTotalPages(result.totalPages);
    setLoading(false);
  }, [page, searchQuery, selectedCategory, selectedColor, sortBy]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  return {
    products,
    productNames,
    categories,
    colors,
    selectedCategory,
    setSelectedCategory,
    selectedColor,
    setSelectedColor,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    totalPages,
    loading,
  };
}
