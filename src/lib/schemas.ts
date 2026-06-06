import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().min(6, 'Enter a valid phone number'),
    country: z.string().min(1, 'Select a country'),
    role: z.enum(['admin', 'manager', 'procurement_officer', 'vendor']),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    additionalInfo: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const completeProfileSchema = z.object({
  role: z.enum(['admin', 'manager', 'procurement_officer', 'vendor']),
  phone: z.string().min(6, 'Enter a valid phone number'),
  country: z.string().min(1, 'Select a country'),
});
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

export const vendorSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  category: z.string().min(1, 'Select a category'),
  gstNumber: z.string().min(3, 'GST number is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(6, 'Enter a valid phone number'),
  country: z.string().min(1, 'Select a country'),
  status: z.enum(['active', 'inactive', 'pending']),
  rating: z.coerce.number().min(0).max(5),
  additionalInfo: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankIfscCode: z.string().optional(),
  notes: z.string().optional(),
});
export type VendorInput = z.infer<typeof vendorSchema>;

export const rfqBasicSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(5, 'Description is required'),
  deadline: z.string().min(1, 'Deadline is required'),
});

export const productDetailSchema = z.object({
  name: z.string().min(1, 'Product name required'),
  quantity: z.coerce.number().positive('Qty must be > 0'),
  unit: z.string().min(1, 'Unit required'),
});
