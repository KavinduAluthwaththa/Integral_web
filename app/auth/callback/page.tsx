'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isRecoveryFlow, parseAuthCallbackParams } from '@/lib/auth/recovery';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { code, next, flowType } = parseAuthCallbackParams(window.location.href, window.location.hash);

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Auth exchange error:', exchangeError);
          router.push('/login?error=callback_failed');
          return;
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        router.push('/login?error=callback_failed');
        return;
      }

      if (isRecoveryFlow(flowType)) {
        router.push('/reset-password');
        return;
      }

      if (session?.user) {
        await supabase.from('user_profiles').upsert({
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
        });

        router.push(next);
      } else {
        router.push('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-md">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
