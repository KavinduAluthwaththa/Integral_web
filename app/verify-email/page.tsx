'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const { itemCount } = useCart();
  const { resendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setSending(true);
    const { error } = await resendVerificationEmail(email);

    toast({
      title: error ? 'Resend failed' : 'Verification email sent',
      description: error ? error.message : 'Check your inbox for the new verification link.',
      variant: error ? 'destructive' : 'default',
    });

    setSending(false);
  };

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background py-5xl">
        <div className="max-w-md mx-auto px-xl text-center space-y-xl">
          <h1 className="text-3xl font-light tracking-wide">Verify Your Email</h1>
          <p className="text-muted-foreground">
            We sent a verification link to {email || 'your email address'}. Open that email to activate your account.
          </p>
          <Button onClick={handleResend} disabled={sending || !email} className="w-full">
            {sending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
          <Link href="/login" className="block text-sm underline hover:text-foreground">
            Back to sign in
          </Link>
        </div>
      </main>
    </>
  );
}
