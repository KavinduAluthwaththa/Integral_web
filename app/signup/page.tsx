'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { trackUserRegistrationStarted, trackUserRegistrationCompleted } from '@/lib/analytics';

export default function SignupPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, signInWithApple, resendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const { uniqueItemCount } = useCart();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);

  useEffect(() => {
    trackUserRegistrationStarted();
  }, []);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { error, data } = await signUp(email, password, fullName);

    if (error) {
      toast({
        title: 'Signup failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      if (data?.user) {
        await trackUserRegistrationCompleted(data.user.id, email);
      }

      if (!data?.session) {
        setVerificationPending(true);
        toast({
          title: 'Verify your email',
          description: 'We sent you a confirmation link. Open it to finish creating your account.',
        });
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        toast({
          title: 'Account created!',
          description: 'Welcome! Your account has been successfully created.',
        });
        router.push('/dashboard');
      }
    }

    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: 'Signup failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAppleSignup = async () => {
    const { error } = await signInWithApple();
    if (error) {
      toast({
        title: 'Signup failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Navbar cartCount={uniqueItemCount} onCartClick={() => {}} onSearchClick={() => {}} />

      <main className="min-h-screen bg-background pt-4xl pb-4xl">
        <div className="max-w-md mx-auto px-xl">
          <div className="space-y-3xl">
            <div className="text-center space-y-md">
              <h1 className="text-3xl font-light tracking-wide">Create Account</h1>
              <p className="text-muted-foreground">
                Join us to unlock exclusive benefits and features.
              </p>
            </div>

            <div className="space-y-xl">
              <div className="space-y-md">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignup}
                >
                  <svg className="w-5 h-5 mr-sm" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleAppleSignup}
                >
                  <svg className="w-5 h-5 mr-sm" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M16.37 1.43c0 1.14-.42 2.21-1.16 3.02-.87.94-2.28 1.67-3.5 1.57-.15-1.09.39-2.24 1.12-3 .81-.85 2.2-1.48 3.54-1.59zm4.5 16.24c-.47 1.08-1.03 2.08-1.73 3.03-.96 1.32-1.74 2.23-2.82 2.24-.97.02-1.22-.62-2.54-.62-1.31 0-1.59.61-2.54.64-1.04.04-1.84-1.05-2.81-2.37-2.71-3.69-3-8.02-1.32-10.59 1.19-1.84 3.08-2.92 4.86-2.92 1.08 0 2.09.73 2.8.73.69 0 1.98-.9 3.34-.77.57.03 2.19.23 3.23 1.75-.08.05-1.93 1.13-1.91 3.38.02 2.69 2.34 3.59 2.44 3.62z"
                    />
                  </svg>
                  Continue with Apple
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-foreground/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-md text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailSignup} className="space-y-lg">
                <div className="space-y-sm">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>

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

                <div className="space-y-sm">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              <div className="text-center text-sm space-y-sm">
                {verificationPending && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center border border-foreground/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground/75 transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background"
                    onClick={async () => {
                      const { error } = await resendVerificationEmail(email);
                      toast({
                        title: error ? 'Resend failed' : 'Verification email sent',
                        description: error ? error.message : 'Please check your inbox again.',
                        variant: error ? 'destructive' : 'default',
                      });
                    }}
                  >
                    Resend verification email
                  </button>
                )}
                <p className="text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/login" className="underline hover:text-foreground">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
