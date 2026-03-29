'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { uniqueItemCount } = useCart();
  const { session, loading, updatePassword } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login');
    }
  }, [loading, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please confirm the same password twice.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const { error } = await updatePassword(password);

    if (error) {
      toast({
        title: 'Password update failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
      });
      router.push('/login');
    }

    setSaving(false);
  };

  return (
    <>
      <Navbar cartCount={uniqueItemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background py-5xl">
        <div className="max-w-md mx-auto px-xl">
          <div className="space-y-3xl">
            <div className="text-center space-y-md">
              <h1 className="text-3xl font-light tracking-wide">Choose New Password</h1>
              <p className="text-muted-foreground">
                Set a new password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-lg">
              <div className="space-y-sm">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-sm">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving || !session}>
                {saving ? 'Updating...' : 'Update Password'}
              </Button>
            </form>

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
