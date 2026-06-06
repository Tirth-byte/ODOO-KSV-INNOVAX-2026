import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  CheckSquare,
  ShoppingCart,
  Receipt,
  Activity,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureKey } from './permissions';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  feature: FeatureKey;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, feature: 'dashboard' },
  { label: 'Vendors', href: '/vendors', icon: Users, feature: 'vendors' },
  { label: 'RFQs', href: '/rfqs', icon: FileText, feature: 'rfqs' },
  { label: 'Quotations', href: '/quotations', icon: ClipboardList, feature: 'quotations' },
  { label: 'Approvals', href: '/approvals', icon: CheckSquare, feature: 'approvals' },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart, feature: 'purchase-orders' },
  { label: 'Invoices', href: '/invoices', icon: Receipt, feature: 'invoices' },
  { label: 'Activity', href: '/activity', icon: Activity, feature: 'activity' },
  { label: 'Reports', href: '/reports', icon: BarChart3, feature: 'reports' },
];
