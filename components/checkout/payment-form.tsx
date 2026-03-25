'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock } from 'lucide-react';

export interface PaymentFormData {
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => void;
  onBack: () => void;
  isProcessing?: boolean;
}

export function PaymentForm(props: PaymentFormProps) {
  const { onSubmit, onBack, isProcessing } = props;

  const [formData, setFormData] = useState<PaymentFormData>({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PaymentFormData, string>>>({});

  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiryDate = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PaymentFormData, string>> = {};

    const cardNumberClean = formData.cardNumber.replace(/\s/g, '');
    if (!cardNumberClean) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cardNumberClean.length < 15 || cardNumberClean.length > 16) {
      newErrors.cardNumber = 'Invalid card number';
    }

    if (!formData.cardName.trim()) {
      newErrors.cardName = 'Cardholder name is required';
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      newErrors.expiryDate = 'Invalid expiry date (MM/YY)';
    } else {
      const parts = formData.expiryDate.split('/');
      const month = Number(parts[0]);
      const year = Number(parts[1]);
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;

      if (month < 1 || month > 12) {
        newErrors.expiryDate = 'Invalid month';
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        newErrors.expiryDate = 'Card has expired';
      }
    }

    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (formData.cvv.length < 3 || formData.cvv.length > 4) {
      newErrors.cvv = 'Invalid CVV';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    setFormData({ ...formData, cardNumber: formatCardNumber(value) });
    if (errors.cardNumber) {
      setErrors({ ...errors, cardNumber: undefined });
    }
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFormData({ ...formData, expiryDate: formatExpiryDate(value) });
    if (errors.expiryDate) {
      setErrors({ ...errors, expiryDate: undefined });
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFormData({ ...formData, cvv: value });
    if (errors.cvv) {
      setErrors({ ...errors, cvv: undefined });
    }
  };

  const handleCardNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cardName: e.target.value });
    if (errors.cardName) {
      setErrors({ ...errors, cardName: undefined });
    }
  };

  return (
    <div className="space-y-xl">
      <div className="space-y-lg">
        <div className="flex flex-col gap-md border-b border-foreground/10 pb-lg md:flex-row md:items-end md:justify-between">
          <div className="space-y-sm">
            <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Step Two
            </p>
            <h2 className="text-2xl font-light tracking-wide">Payment Information</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Complete your order securely with card details. This is a demo payment flow for the storefront.
            </p>
          </div>
          <div className="flex items-center gap-xs text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            <Lock size={14} strokeWidth={1.5} />
            <span>Secure Payment</span>
          </div>
        </div>

        <div className="space-y-sm border-2 border-foreground px-lg py-md">
          <div className="flex items-center gap-sm text-muted-foreground">
            <CreditCard size={16} strokeWidth={1.5} />
            <p className="text-xs uppercase tracking-[0.18em]">
              Test mode: Use card number 4242 4242 4242 4242
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Any future expiry date and any 3-digit CVV
          </p>
        </div>

        <div className="space-y-lg">
          <div className="space-y-sm">
            <Label htmlFor="cardNumber">Card Number *</Label>
            <Input
              id="cardNumber"
              value={formData.cardNumber}
              onChange={handleCardNumberChange}
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              className={errors.cardNumber ? 'border-red-500' : ''}
            />
            {errors.cardNumber && (
              <p className="text-xs text-red-500">{errors.cardNumber}</p>
            )}
          </div>

          <div className="space-y-sm">
            <Label htmlFor="cardName">Cardholder Name *</Label>
            <Input
              id="cardName"
              value={formData.cardName}
              onChange={handleCardNameChange}
              placeholder="John Doe"
              className={errors.cardName ? 'border-red-500' : ''}
            />
            {errors.cardName && (
              <p className="text-xs text-red-500">{errors.cardName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-lg">
            <div className="space-y-sm">
              <Label htmlFor="expiryDate">Expiry Date *</Label>
              <Input
                id="expiryDate"
                value={formData.expiryDate}
                onChange={handleExpiryDateChange}
                placeholder="MM/YY"
                maxLength={5}
                className={errors.expiryDate ? 'border-red-500' : ''}
              />
              {errors.expiryDate && (
                <p className="text-xs text-red-500">{errors.expiryDate}</p>
              )}
            </div>

            <div className="space-y-sm">
              <Label htmlFor="cvv">CVV *</Label>
              <Input
                id="cvv"
                type="password"
                value={formData.cvv}
                onChange={handleCvvChange}
                placeholder="123"
                maxLength={4}
                className={errors.cvv ? 'border-red-500' : ''}
              />
              {errors.cvv && <p className="text-xs text-red-500">{errors.cvv}</p>}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-md pt-lg border-t border-foreground/10">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isProcessing}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : 'Place Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
