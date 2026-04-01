'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, MapPin, Trash2, CreditCard as Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { countries, getCountryIso2ByName } from '@/lib/countries';
import { cn } from '@/lib/utils';
import PhoneInput, { type CountryData } from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Label } from '@/components/ui/label';

function isPhoneCountryData(data: CountryData | object): data is CountryData {
  return data != null && typeof data === 'object' && 'countryCode' in data;
}

interface Address {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [profileDefaults, setProfileDefaults] = useState<{ full_name: string; phone: string }>({ full_name: '', phone: '' });
  const [sortOrder, setSortOrder] = useState<'newest' | 'priceLowHigh' | 'priceHighLow' | 'nameAZ' | 'nameZA'>('newest');
  const [category, setCategory] = useState<string>('all'); // Placeholder for category
  const [formData, setFormData] = useState({
    label: 'Home',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United States',
    is_default: false,
    countryCode: 'us',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadAddresses = useCallback(async () => {
    if (!user?.id) return;

    const [addressesResult, profileResult] = await Promise.all([
      supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('user_profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (!addressesResult.error && addressesResult.data) {
      setAddresses(addressesResult.data);
    }

    if (!profileResult.error && profileResult.data) {
      const defaults = {
        full_name: profileResult.data.full_name || '',
        phone: profileResult.data.phone || '',
      };
      setProfileDefaults(defaults);
      setFormData((current) => ({
        ...current,
        full_name: defaults.full_name || current.full_name,
        phone: (current.phone || defaults.phone || '').replace(/\D/g, ''),
      }));
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      void loadAddresses();
    }
  }, [user, authLoading, router, loadAddresses]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const digits = formData.phone.replace(/\D/g, '');
    // react-phone-input-2 stores full international number without leading +
    if (!digits.length || digits.length < 8) {
      errors.phone = 'Enter a valid number with country code (pick the flag or search countries).';
    }
    if (!formData.address_line1.trim()) {
      errors.address_line1 = 'Address line 1 is required';
    }
    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }
    if (!formData.state.trim()) {
      errors.state = 'State / Province is required';
    }
    if (!formData.country.trim()) {
      errors.country = 'Country is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!user) return;

    if (!validateForm()) {
      toast({
        title: 'Missing required fields',
        description: 'Phone, address line 1, city, state/province, and country are required.',
        variant: 'destructive',
      });
      return;
    }

    const fullName = (profileDefaults.full_name || formData.full_name || '').trim() || 'Account holder';

    const addressData = {
      ...formData,
      full_name: fullName,
      phone: formData.phone.trim(),
      address_line1: formData.address_line1.trim(),
      address_line2: formData.address_line2.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      postal_code: formData.postal_code.trim(),
      country: formData.country.trim(),
      user_id: user.id,
    };

    setFormErrors({});

    let error;

    if (editingAddress) {
      const { error: updateError } = await supabase
        .from('user_addresses')
        .update(addressData)
        .eq('id', editingAddress.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('user_addresses')
        .insert(addressData);
      error = insertError;
    }

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save address. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: editingAddress ? 'Address updated' : 'Address added',
        description: 'Your address has been successfully saved.',
      });
      setShowDialog(false);
      setEditingAddress(null);
      resetForm();
      loadAddresses();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete address. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Address deleted',
        description: 'The address has been removed.',
      });
      loadAddresses();
    }
  };

  const openEditDialog = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      full_name: profileDefaults.full_name || address.full_name,
      phone: address.phone.replace(/\D/g, ''),
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default,
      countryCode: getCountryIso2ByName(address.country),
    });
    setFormErrors({});
    setShowDialog(true);
  };

  const resetForm = () => {
    const defaultCountry = 'United States';
    const profilePhone = profileDefaults.phone?.replace(/\D/g, '') || '';
    setFormData({
      label: 'Home',
      full_name: profileDefaults.full_name,
      phone: profilePhone,
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: defaultCountry,
      is_default: false,
      countryCode: getCountryIso2ByName(defaultCountry),
    });
    setFormErrors({});
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-5xl">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-sm">
            <h1 className="text-2xl font-light tracking-wide">Address Book</h1>
            <p className="text-muted-foreground">
              Manage your shipping and billing addresses.
            </p>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              resetForm();
              setEditingAddress(null);
              setShowDialog(true);
            }}
          >
            <Plus size={16} className="mr-xs" />
            Add Address
          </Button>
        </div>

        {/* Inline filter/sort row */}
        <div className="flex flex-row items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-2">
            <label htmlFor="category-select" className="text-sm font-medium">Category</label>
            <select
              id="category-select"
              className="border rounded px-2 py-1"
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ minWidth: 120 }}
            >
              <option value="all">All</option>
              {/* Add more categories as needed */}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-sm font-medium">Sort</label>
            <select
              id="sort-select"
              className="border rounded px-2 py-1"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
              style={{ minWidth: 180 }}
            >
              <option value="newest">Newest</option>
              <option value="priceLowHigh">Price: Low to High</option>
              <option value="priceHighLow">Price: High to Low</option>
              <option value="nameAZ">Name: A to Z</option>
              <option value="nameZA">Name: Z to A</option>
            </select>
          </div>
        </div>

        {/* Address list */}
        {addresses.length === 0 ? (
          <div className="text-center py-5xl space-y-md">
            <MapPin size={48} strokeWidth={1} className="mx-auto text-muted-foreground" />
            <div className="space-y-sm">
              <p className="text-lg">No addresses yet</p>
              <p className="text-muted-foreground">Add an address to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {(() => {
              let sorted = [...addresses];
              if (sortOrder === 'newest') {
                sorted.sort((a, b) => (b as any).created_at?.localeCompare((a as any).created_at));
              } else if (sortOrder === 'priceLowHigh') {
                sorted.sort((a, b) => (a as any).price - (b as any).price);
              } else if (sortOrder === 'priceHighLow') {
                sorted.sort((a, b) => (b as any).price - (a as any).price);
              } else if (sortOrder === 'nameAZ') {
                sorted.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
              } else if (sortOrder === 'nameZA') {
                sorted.sort((a, b) => (b.label || '').localeCompare(a.label || ''));
              }
              // Optionally filter by category if implemented
              return sorted.map((address) => (
                <div
                  key={address.id}
                  className="border border-foreground/10 p-lg space-y-md relative"
                >
                  {address.is_default && (
                    <div className="absolute top-md right-md">
                      <span className="text-xs bg-foreground text-background px-sm py-xs">
                        DEFAULT
                      </span>
                    </div>
                  )}

                  <div className="space-y-xs">
                    <p className="font-medium tracking-wide">{address.label}</p>
                    <p className="text-sm">{address.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {address.address_line1}
                    </p>
                    {address.address_line2 && (
                      <p className="text-sm text-muted-foreground">
                        {address.address_line2}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.state} {address.postal_code}
                    </p>
                    <p className="text-sm text-muted-foreground">{address.phone}</p>
                  </div>

                  <div className="flex gap-sm pt-md border-t border-foreground/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(address)}
                    >
                      <Edit size={14} className="mr-xs" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                    >
                      <Trash2 size={14} className="mr-xs" />
                      Delete
                    </Button>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <div className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6">
              <DialogHeader className="space-y-0 text-left">
                <DialogTitle>
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
            <div className="space-y-lg">
              <div className="space-y-sm">
                <Label htmlFor="label">Address Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                  placeholder="Home, Work, etc."
                />
              </div>

              <div className="space-y-sm">
                <Label htmlFor="full_name">Full Name</Label>
                <p className="text-sm font-medium" id="full_name">
                  {formData.full_name || profileDefaults.full_name || 'Not set. Update in Profile Settings.'}
                </p>
                <p className="text-xs text-muted-foreground">Name is managed in Profile Settings.</p>
                {formErrors.full_name && (
                  <p className="text-xs text-red-600">{formErrors.full_name}</p>
                )}
              </div>

              <div className="space-y-sm">
                <Label htmlFor="phone">Phone *</Label>
                <PhoneInput
                  country={formData.countryCode}
                  value={formData.phone}
                  preferredCountries={['lk', 'au', 'us', 'gb', 'nz', 'sg']}
                  enableSearch
                  disableSearchIcon={false}
                  searchPlaceholder="Search country or code"
                  enableLongNumbers
                  countryCodeEditable={false}
                  autoFormat
                  containerClass={cn(
                    'phone-input-addressbook',
                    formErrors.phone && 'phone-input-error'
                  )}
                  inputProps={{
                    id: 'phone',
                    name: 'phone',
                    type: 'tel',
                    inputMode: 'tel',
                    autoComplete: 'tel',
                    required: true,
                    'aria-invalid': formErrors.phone ? true : undefined,
                    'aria-describedby': formErrors.phone ? 'phone-error' : 'phone-hint',
                  }}
                  dropdownStyle={{ zIndex: 200 }}
                  onChange={(value, country) => {
                    setFormData({
                      ...formData,
                      phone: value,
                      country: isPhoneCountryData(country) ? country.name : formData.country,
                      countryCode: isPhoneCountryData(country)
                        ? country.countryCode.toLowerCase()
                        : formData.countryCode,
                    });
                  }}
                />
                <p id="phone-hint" className="text-xs text-muted-foreground">
                  Choose country with the flag, or search. Your number is saved with country code for shipping and SMS.
                </p>
                {formErrors.phone && (
                  <p id="phone-error" role="alert" className="text-xs text-red-600">
                    {formErrors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-sm">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line1: e.target.value })
                  }
                  placeholder="123 Main Street"
                  className={formErrors.address_line1 ? 'border-red-600' : ''}
                />
                {formErrors.address_line1 && (
                  <p className="text-xs text-red-600">{formErrors.address_line1}</p>
                )}
              </div>

              <div className="space-y-sm">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line2: e.target.value })
                  }
                  placeholder="Apt, Suite, Unit (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-lg">
                <div className="space-y-sm">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="New York"
                    className={formErrors.city ? 'border-red-600' : ''}
                  />
                  {formErrors.city && (
                    <p className="text-xs text-red-600">{formErrors.city}</p>
                  )}
                </div>

                <div className="space-y-sm">
                  <Label htmlFor="state">State / Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    placeholder="NY"
                    className={formErrors.state ? 'border-red-600' : ''}
                  />
                  {formErrors.state && (
                    <p className="text-xs text-red-600">{formErrors.state}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-lg">
                <div className="space-y-sm">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) =>
                      setFormData({ ...formData, postal_code: e.target.value })
                    }
                    placeholder="10001"
                  />
                </div>

                <div className="space-y-sm">
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={(e) => {
                      const selected = countries.find(c => c.name === e.target.value);
                      setFormData({
                        ...formData,
                        country: e.target.value,
                        countryCode: selected?.code || formData.countryCode,
                      });
                    }}
                    className={`w-full border rounded px-3 py-2 ${formErrors.country ? 'border-red-600' : ''}`}
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.name}>{country.name}</option>
                    ))}
                  </select>
                  {formErrors.country && (
                    <p className="text-xs text-red-600">{formErrors.country}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) =>
                    setFormData({ ...formData, is_default: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="is_default" className="cursor-pointer">
                  Set as default address
                </Label>
              </div>

              <div className="flex gap-md pt-lg border-t border-foreground/10">
                <Button onClick={handleSave} className="flex-1">
                  {editingAddress ? 'Update Address' : 'Add Address'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingAddress(null);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
