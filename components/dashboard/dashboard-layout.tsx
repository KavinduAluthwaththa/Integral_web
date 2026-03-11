'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { User, MapPin, Package, Heart, Eye, LogOut, ChartBar as BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Profile', icon: User },
  { href: '/dashboard/addresses', label: 'Address Book', icon: MapPin },
  { href: '/dashboard/orders', label: 'Order History', icon: Package },
  { href: '/dashboard/favorites', label: 'Favorites', icon: Heart },
  { href: '/dashboard/recently-viewed', label: 'Recently Viewed', icon: Eye },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { itemCount } = useCart();

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />

      <main className="min-h-screen bg-background py-5xl">
        <div className="max-w-7xl mx-auto px-xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5xl">
            <aside className="lg:col-span-1">
              <div className="space-y-xl">
                <div className="space-y-sm">
                  <h2 className="text-xl font-light tracking-wider">My Account</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>

                <nav className="space-y-xs">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            'flex items-center gap-sm px-md py-sm rounded-sm transition-colors',
                            isActive
                              ? 'bg-foreground text-background'
                              : 'hover:bg-foreground/5'
                          )}
                        >
                          <Icon size={18} strokeWidth={1.5} />
                          <span className="text-sm tracking-wide">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}

                  <button
                    onClick={signOut}
                    className="flex items-center gap-sm px-md py-sm rounded-sm hover:bg-foreground/5 transition-colors w-full text-left"
                  >
                    <LogOut size={18} strokeWidth={1.5} />
                    <span className="text-sm tracking-wide">Sign Out</span>
                  </button>
                </nav>
              </div>
            </aside>

            <div className="lg:col-span-3">{children}</div>
          </div>
        </div>
      </main>
    </>
  );
}
