import type { UserRole } from './types';

export const VENDOR_CATEGORIES = [
  'Raw Materials',
  'Electronics',
  'Office Supplies',
  'IT Services',
  'Logistics',
  'Manufacturing',
  'Packaging',
  'Consulting',
  'Maintenance',
  'Construction',
  'Chemicals',
  'Textile',
  'Food & Beverage',
  'Automotive',
  'Other',
] as const;

export const PRODUCT_UNITS = [
  'pcs',
  'kg',
  'g',
  'liters',
  'meters',
  'boxes',
  'pallets',
  'units',
  'hours',
  'sets',
] as const;

export const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Canada',
  'Australia',
  'Singapore',
  'United Arab Emirates',
  'Japan',
  'China',
  'Other',
] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  procurement_officer: 'Procurement Officer',
  vendor: 'Vendor',
};

export const DEFAULT_TAX_RATE = 18;
