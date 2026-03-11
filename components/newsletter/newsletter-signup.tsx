'use client';

import { useState } from 'react';
import { subscribeToNewsletter } from '@/lib/email-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, CircleCheck as CheckCircle2, CircleAlert as AlertCircle } from 'lucide-react';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const result = await subscribeToNewsletter(email, firstName || undefined);

      if (result.success) {
        setStatus('success');
        setMessage('Successfully subscribed! Check your email for confirmation.');
        setEmail('');
        setFirstName('');
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to subscribe. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5" />
        <h3 className="text-lg font-medium">Subscribe to Our Newsletter</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Get exclusive offers, new arrivals, and style tips delivered to your inbox.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="First Name (optional)"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading}
            className="w-full"
          />
        </div>

        <div>
          <Input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            className="w-full"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </Button>

        {status === 'success' && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded text-green-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{message}</p>
          </div>
        )}
      </form>

      <p className="text-xs text-muted-foreground mt-4">
        By subscribing, you agree to receive marketing emails. You can unsubscribe at any time.
      </p>
    </div>
  );
}
