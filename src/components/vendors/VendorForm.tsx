'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendorSchema, type VendorInput } from '@/lib/schemas';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { VENDOR_CATEGORIES, COUNTRIES } from '@/lib/constants';
import type { Vendor } from '@/lib/types';

export function VendorForm({
  initial,
  onSubmit,
  submitting,
  onCancel,
}: {
  initial?: Vendor | null;
  onSubmit: (data: VendorInput) => void;
  submitting: boolean;
  onCancel?: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VendorInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      companyName: initial?.companyName ?? '',
      category: initial?.category ?? VENDOR_CATEGORIES[0],
      gstNumber: initial?.gstNumber ?? '',
      email: initial?.email ?? '',
      phone: initial?.phone ?? '',
      country: initial?.country ?? 'India',
      status: initial?.status ?? 'active',
      rating: initial?.rating ?? 0,
      additionalInfo: initial?.additionalInfo ?? '',
      paymentTerms: initial?.paymentTerms ?? '',
      bankAccountName: initial?.bankAccountName ?? '',
      bankAccountNumber: initial?.bankAccountNumber ?? '',
      bankName: initial?.bankName ?? '',
      bankIfscCode: initial?.bankIfscCode ?? '',
      notes: initial?.notes ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="companyName" required>Company name</Label>
        <Input id="companyName" error={errors.companyName?.message} {...register('companyName')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category" required>Category</Label>
          <Select id="category" error={errors.category?.message} {...register('category')}>
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="gstNumber">GST number</Label>
          <Input id="gstNumber" error={errors.gstNumber?.message} {...register('gstNumber')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email" required>Email</Label>
          <Input id="email" type="email" error={errors.email?.message} {...register('email')} />
        </div>
        <div>
          <Label htmlFor="phone" required>Phone</Label>
          <Input id="phone" error={errors.phone?.message} {...register('phone')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country" required>Country</Label>
          <Select id="country" error={errors.country?.message} {...register('country')}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" error={errors.status?.message} {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rating">Rating (0–5)</Label>
          <Input id="rating" type="number" step="0.1" min="0" max="5" error={errors.rating?.message} {...register('rating')} />
        </div>
        <div>
          <Label htmlFor="paymentTerms">Payment Terms</Label>
          <Input id="paymentTerms" placeholder="e.g. Net 30, Due on Receipt" error={errors.paymentTerms?.message} {...register('paymentTerms')} />
        </div>
      </div>

      <div className="border-t border-brand-border pt-4">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Bank Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bankAccountName">Account Name</Label>
            <Input id="bankAccountName" error={errors.bankAccountName?.message} {...register('bankAccountName')} />
          </div>
          <div>
            <Label htmlFor="bankAccountNumber">Account Number</Label>
            <Input id="bankAccountNumber" error={errors.bankAccountNumber?.message} {...register('bankAccountNumber')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" error={errors.bankName?.message} {...register('bankName')} />
          </div>
          <div>
            <Label htmlFor="bankIfscCode">IFSC Code</Label>
            <Input id="bankIfscCode" error={errors.bankIfscCode?.message} {...register('bankIfscCode')} />
          </div>
        </div>
      </div>

      <div className="border-t border-brand-border pt-4">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Internal supplier notes..." error={errors.notes?.message} {...register('notes')} />
      </div>

      <div>
        <Label htmlFor="additionalInfo">Additional info</Label>
        <Textarea id="additionalInfo" {...register('additionalInfo')} />
      </div>

      <div className="sticky -bottom-6 bg-white border-t border-gray-100 py-4 mt-6 flex justify-end gap-3 z-10">
        {onCancel && (
          <Button variant="secondary" type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {initial ? 'Save changes' : 'Create vendor'}
        </Button>
      </div>
    </form>
  );
}
