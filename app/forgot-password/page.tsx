'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const { itemCount } = useCart();
  const { sendPasswordReset } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await sendPasswordReset(email);

    if (error) {
      toast({
        title: 'Reset failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setSubmitted(true);
      toast({
        title: 'Reset email sent',
        description: 'Check your inbox for a password reset link.',
      });
    }

    setLoading(false);
  };

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background py-5xl">
        <div className="max-w-md mx-auto px-xl">
          <div className="space-y-3xl">
            <div className="text-center space-y-md">
              <h1 className="text-3xl font-light tracking-wide">Reset Password</h1>
              <p className="text-muted-foreground">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-lg">
              <div className="space-y-sm">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            {submitted && (
              <p className="text-sm text-muted-foreground text-center">
                If that email exists, a reset link has been sent.
              </p>
            )}

            <div className="text-center text-sm">
              <Link href="/login" className="underline hover:text-foreground">
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
