import type { UserRole } from './types';

/** Navigation / feature keys used across the app. */
export type FeatureKey =
  | 'dashboard'
  | 'vendors'
  | 'rfqs'
  | 'quotations'
  | 'approvals'
  | 'purchase-orders'
  | 'invoices'
  | 'activity'
  | 'reports';

const ACCESS: Record<UserRole, FeatureKey[]> = {
  admin: [
    'dashboard',
    'vendors',
    'rfqs',
    'quotations',
    'approvals',
    'purchase-orders',
    'invoices',
    'activity',
    'reports',
  ],
  manager: ['dashboard', 'approvals', 'reports', 'rfqs', 'quotations', 'vendors', 'purchase-orders', 'invoices', 'activity'],
  procurement_officer: [
    'dashboard',
    'vendors',
    'rfqs',
    'quotations',
    'purchase-orders',
    'invoices',
    'activity',
  ],
  vendor: ['dashboard', 'rfqs', 'quotations', 'purchase-orders', 'invoices'],
};

export function canAccess(role: UserRole | undefined, feature: FeatureKey): boolean {
  if (!role) return false;
  return ACCESS[role].includes(feature);
}

/** Write/mutation capabilities — used to disable action buttons. */
export function can(role: UserRole | undefined, capability: Capability): boolean {
  if (!role) return false;
  return CAPABILITIES[role].includes(capability);
}

export type Capability =
  | 'manageVendors'
  | 'manageRfqs'
  | 'submitQuotation'
  | 'reviewQuotation'
  | 'approve'
  | 'managePO'
  | 'manageInvoices';

const CAPABILITIES: Record<UserRole, Capability[]> = {
  admin: [
    'manageVendors',
    'manageRfqs',
    'submitQuotation',
    'reviewQuotation',
    'approve',
    'managePO',
    'manageInvoices',
  ],
  manager: ['reviewQuotation', 'approve'],
  procurement_officer: [
    'manageVendors',
    'manageRfqs',
    'reviewQuotation',
    'managePO',
    'manageInvoices',
  ],
  vendor: ['submitQuotation'],
};
