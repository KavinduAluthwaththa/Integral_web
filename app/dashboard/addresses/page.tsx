'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, MapPin, Trash2, CreditCard as Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadAddresses();
    }
  }, [user, authLoading, router]);

  const loadAddresses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAddresses(data);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    const addressData = {
      ...formData,
      user_id: user.id,
    };

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
      full_name: address.full_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
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
    });
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
        <div className="flex items-center justify-between">
          <div className="space-y-sm">
            <h1 className="text-2xl font-light tracking-wide">Address Book</h1>
            <p className="text-muted-foreground">
              Manage your shipping and billing addresses.
            </p>
          </div>
          <Button
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
            {addresses.map((address) => (
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
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </DialogTitle>
            </DialogHeader>

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
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-sm">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                />
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
                />
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
                  />
                </div>

                <div className="space-y-sm">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    placeholder="NY"
                  />
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
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    placeholder="United States"
                  />
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
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
