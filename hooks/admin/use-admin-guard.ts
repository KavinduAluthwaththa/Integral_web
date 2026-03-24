'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export function useAdminGuard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      setIsAdmin(false);
      setCheckingAdmin(false);
      router.push('/login');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    let isActive = true;

    const verifyAdmin = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        if (isActive) {
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
        return;
      }

      setCheckingAdmin(true);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!isActive) {
        return;
      }

      if (error || !data?.is_admin) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      setCheckingAdmin(false);
    };

    void verifyAdmin();

    return () => {
      isActive = false;
    };
  }, [authLoading, router, user]);

  return {
    isAdmin,
    checkingAdmin: authLoading || checkingAdmin,
  };
}
