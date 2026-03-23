/**
 * Currency context with geolocation auto-detection
 * No database required - uses external APIs and browser storage
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrencyCode, DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from './currencies';
import { getSuggestedCurrencyFromLocation } from './geolocation-currency';
import { supabase } from './supabase';

interface CurrencyContextType {
  currentCurrency: CurrencyCode;
  suggestedCurrency: CurrencyCode | null;
  setCurrency: (currency: CurrencyCode) => void;
  isLoading: boolean;
  acceptSuggestion: (currency: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [suggestedCurrency, setSuggestedCurrency] = useState<CurrencyCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, []);

  const loadCurrency = async () => {
    try {
      // Step 1: Check localStorage first (fastest)
      const storedCurrency = localStorage.getItem('preferred_currency');
      if (storedCurrency && storedCurrency in SUPPORTED_CURRENCIES) {
        setCurrentCurrency(storedCurrency as CurrencyCode);
        setIsLoading(false);
        return;
      }

      // Step 2: Check user profile if authenticated
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        try {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('preferred_currency')
            .eq('id', authData.user.id)
            .single();

          if (profileData?.preferred_currency && profileData.preferred_currency in SUPPORTED_CURRENCIES) {
            const currency = profileData.preferred_currency as CurrencyCode;
            setCurrentCurrency(currency);
            localStorage.setItem('preferred_currency', currency);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Error loading currency from profile:', error);
        }
      }

      // Step 3: Auto-detect from geolocation
      const suggestedCurrency = await getSuggestedCurrencyFromLocation();
      setSuggestedCurrency(suggestedCurrency);

      // Use suggested currency if different from default
      if (suggestedCurrency && suggestedCurrency !== DEFAULT_CURRENCY) {
        setCurrentCurrency(suggestedCurrency);
        localStorage.setItem('preferred_currency', suggestedCurrency);
      } else {
        setCurrentCurrency(DEFAULT_CURRENCY);
        localStorage.setItem('preferred_currency', DEFAULT_CURRENCY);
      }
    } catch (error) {
      console.error('Error loading currency:', error);
      setCurrentCurrency(DEFAULT_CURRENCY);
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrency = (currency: CurrencyCode) => {
    setCurrentCurrency(currency);
    localStorage.setItem('preferred_currency', currency);

    // Optionally save to database if user is authenticated
    const saveToProfile = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return;

        await supabase
          .from('user_profiles')
          .update({ preferred_currency: currency })
          .eq('id', authData.user.id);
      } catch (error) {
        console.warn('Error saving currency preference:', error);
      }
    };

    void saveToProfile();
  };

  const acceptSuggestion = (currency: CurrencyCode) => {
    setCurrency(currency);
    setSuggestedCurrency(null);
  };

  return (
    <CurrencyContext.Provider
      value={{ currentCurrency, suggestedCurrency, setCurrency, isLoading, acceptSuggestion }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
