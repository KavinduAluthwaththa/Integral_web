import './globals.css';
import type { Metadata } from 'next';
import { Space_Mono } from 'next/font/google';
import { CartProvider } from '@/lib/cart-context';
import { AuthProvider } from '@/lib/auth-context';
import { CurrencyProvider } from '@/lib/currency-context-geo';
import { Toaster } from '@/components/ui/toaster';
import { AnalyticsTracker } from '@/components/analytics/analytics-tracker';
import { Footer } from '@/components/navigation/footer';

const spaceMono = Space_Mono({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://streetwear.example.com'),
  title: {
    default: 'INTEGRAL - Premium Streetwear',
    template: '%s | Integral',
  },
  icons: {
    icon: '/brand/logo/logo.svg',
    shortcut: '/brand/logo/logo.svg',
    apple: '/brand/logo/logo.svg',
  },
  description: 'Discover premium streetwear with minimal aesthetic and bold attitude. Shop the latest collections of hoodies, t-shirts, and accessories.',
  keywords: ['streetwear', 'fashion', 'urban clothing', 'hoodies', 't-shirts', 'accessories', 'premium fashion'],
  authors: [{ name: 'Streetwear' }],
  creator: 'Streetwear',
  publisher: 'Streetwear',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://streetwear.example.com',
    title: 'Streetwear - Premium Urban Fashion',
    description: 'Discover premium streetwear with minimal aesthetic and bold attitude',
    siteName: 'Streetwear',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Streetwear - Premium Urban Fashion',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Streetwear - Premium Urban Fashion',
    description: 'Discover premium streetwear with minimal aesthetic and bold attitude',
    creator: '@streetwear',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={spaceMono.className}>
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              <AnalyticsTracker />
              {children}
              <Footer />
              <Toaster />
            </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
