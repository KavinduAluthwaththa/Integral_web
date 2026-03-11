'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/navigation/navbar';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { Modal } from '@/components/modal/modal';
import { SearchBar } from '@/components/search/search-bar';
import { useCart } from '@/lib/cart-context';

const products = [
  {
    id: '1',
    sku: 'ESS-HOODIE-001',
    name: 'Essential Hoodie',
    price: 89.99,
    category: 'Hoodies',
    color: 'Black',
    size: ['S', 'M', 'L', 'XL'],
    image: 'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=800',
    date: '2024-03-01',
    popularity: 95,
  },
  {
    id: '2',
    sku: 'OVR-TEE-002',
    name: 'Oversized Tee',
    price: 34.99,
    category: 'T-Shirts',
    color: 'White',
    size: ['S', 'M', 'L', 'XL', 'XXL'],
    image: 'https://images.pexels.com/photos/4069148/pexels-photo-4069148.jpeg?auto=compress&cs=tinysrgb&w=800',
    date: '2024-02-28',
    popularity: 88,
  },
  {
    id: '3',
    sku: 'WIDE-PANT-003',
    name: 'Wide Leg Pants',
    price: 79.99,
    category: 'Pants',
    color: 'Olive',
    size: ['28', '30', '32', '34', '36'],
    image: 'https://images.pexels.com/photos/3622622/pexels-photo-3622622.jpeg?auto=compress&cs=tinysrgb&w=800',
    date: '2024-03-05',
    popularity: 92,
  },
  {
    id: '4',
    sku: 'VTG-CAP-004',
    name: 'Vintage Snapback',
    price: 44.99,
    category: 'Accessories',
    color: 'Black',
    size: ['One Size'],
    image: 'https://images.pexels.com/photos/3622614/pexels-photo-3622614.jpeg?auto=compress&cs=tinysrgb&w=800',
    date: '2024-02-20',
    popularity: 75,
  },
  {
    id: '5',
    sku: 'BMR-JKT-005',
    name: 'Bomber Jacket',
    price: 129.99,
    category: 'Jackets',
    color: 'Olive',
    size: ['S', 'M', 'L', 'XL'],
    image: 'https://images.pexels.com/photos/3622620/pexels-photo-3622620.jpeg?auto=compress&cs=tinysrgb&w=800',
    date: '2024-03-10',
    popularity: 98,
  },
  {
    id: '6',
    sku: 'CRG-SHRT-006',
    name: 'Cargo Shorts',
    price: 59.99,
    category: 'Shorts',
    color: 'Gray',
    size: ['28', '30', '32', '34'],
    image: 'https://images.pexels.com/photos/3622618/pexels-photo-3622618.jpeg?auto=compress&cs=tinysrgb&w=800',
    date: '2024-02-15',
    popularity: 70,
  },
  {
    id: '7',
    sku: 'CRW-SWEAT-007',
    name: 'Crewneck Sweatshirt',
    price: 69.99,
    category: 'Hoodies',
    color: 'Gray',
    size: ['S', 'M', 'L', 'XL'],
    image: 'https://images.pexels.com/photos/5325566/pexels-photo-5325566.jpeg?auto=compress&cs=tinysrgb&w=800',
    date: '2024-03-08',
    popularity: 85,
  },
  {
    id: '8',
    sku: 'GRP-TEE-008',
    name: 'Graphic Tee',
    price: 39.99,
    category: 'T-Shirts',
    color: 'Black',
    size: ['S', 'M', 'L', 'XL'],
    image: 'https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=800',
    date: '2024-03-12',
    popularity: 90,
  },
  {
    id: '9',
    sku: 'SLM-JEAN-009',
    name: 'Slim Fit Jeans',
    price: 89.99,
    category: 'Pants',
    color: 'Black',
    size: ['28', '30', '32', '34', '36'],
    image: 'https://images.pexels.com/photos/1346187/pexels-photo-1346187.jpeg?auto=compress&cs=tinysrgb&w=800',
    date: '2024-02-25',
    popularity: 82,
  },
];

export default function ShopPage() {
  const { itemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Limited', 'Mens', 'Womens'];

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((product) => product.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <>
      <Navbar
        cartCount={itemCount}
        onCartClick={() => setIsCartOpen(true)}
        onSearchClick={() => setIsSearchOpen(true)}
      />

      <main className="bg-background min-h-screen">
        <div className="max-w-[1400px] mx-auto px-6 md:px-16 py-16">
          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-10 mb-16 border-b border-foreground/10 pb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`text-xs uppercase tracking-[0.25em] whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/60'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-32">
              <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
              {filteredProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.sku}`} className="group flex flex-col items-center">
                  <div className="relative w-full aspect-[3/4] bg-secondary overflow-hidden mb-5">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      quality={85}
                      loading="lazy"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">{product.sku}</p>
                    <h3 className="text-xs uppercase tracking-[0.2em] group-hover:text-muted-foreground transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <Modal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Search Products"
        size="lg"
      >
        <SearchBar
          suggestions={products.map((p) => p.name)}
          className="w-full"
        />
      </Modal>
    </>
  );
}
