'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackTrafficSource, trackSession } from '@/lib/analytics';
import { useAuth } from '@/lib/auth-context';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    trackTrafficSource();
  }, []);

  useEffect(() => {
    trackSession(user?.id);
  }, [pathname, user?.id]);

  return null;
}
