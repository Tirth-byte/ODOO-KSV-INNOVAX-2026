import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'manager' | 'procurement_officer' | 'vendor';

export type VendorStatus = 'active' | 'inactive' | 'pending';
export type RFQStatus = 'draft' | 'open' | 'closed' | 'cancelled';
export type QuotationStatus = 'draft' | 'submitted' | 'accepted' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type POStatus = 'draft' | 'confirmed' | 'delivered' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export type EntityType = 'RFQ' | 'Vendor' | 'PO' | 'Invoice' | 'Approval' | 'Quotation';

/** Firestore timestamps may arrive as Timestamp, ISO string, or millis. */
export type FireDate = Timestamp | string | number | null;

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  country?: string;
  avatarUrl?: string;
  additionalInfo?: string;
  createdAt?: FireDate;
}

export interface Vendor {
  id: string;
  userId?: string;
  companyName: string;
  category: string;
  gstNumber: string;
  email: string;
  phone: string;
  country: string;
  status: VendorStatus;
  rating: number;
  additionalInfo?: string;
  createdAt?: FireDate;
  paymentTerms?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfscCode?: string;
  notes?: string;
}

export interface ProductDetail {
  name: string;
  quantity: number;
  unit: string;
}

export interface RFQ {
  id: string;
  title: string;
  description: string;
  productDetails: ProductDetail[];
  deadline: FireDate;
  status: RFQStatus;
  createdBy: string;
  attachmentUrls?: string[];
  invitedVendorIds?: string[];
  createdAt?: FireDate;
}

export interface RFQVendor {
  id: string;
  rfqId: string;
  vendorId: string;
  invitedAt?: FireDate;
}

export interface LineItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  rfqId: string;
  vendorId: string;
  lineItems: LineItem[];
  totalAmount: number;
  taxRate?: number;
  taxAmount?: number;
  deliveryDays: number;
  paymentTerms?: string;
  notes?: string;
  status: QuotationStatus;
  submittedAt?: FireDate;
  validityDate?: FireDate;
}

export interface Approval {
  id: string;
  rfqId: string;
  quotationId: string;
  requestedBy: string;
  approverId?: string;
  status: ApprovalStatus;
  remarks?: string;
  vendorId?: string;
  amount?: number;
  createdAt?: FireDate;
  resolvedAt?: FireDate;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  quotationId: string;
  rfqId: string;
  vendorId: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  status: POStatus;
  poDate: FireDate;
  deliveryDate?: FireDate;
  createdBy: string;
  createdAt?: FireDate;
  deliveryNote?: {
    deliveryRef?: string;
    actualDate?: string;
    notes?: string;
    receivedBy?: string;
  };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  poId: string;
  vendorId: string;
  rfqId: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  status: InvoiceStatus;
  dueDate: FireDate;
  sentAt?: FireDate;
  paidAt?: FireDate;
  createdAt?: FireDate;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  entityType: EntityType;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt?: FireDate;
}
