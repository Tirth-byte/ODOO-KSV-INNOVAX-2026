'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Clock, 
  IndianRupee, 
  Users, 
  Plus, 
  BarChart3, 
  ShoppingCart, 
  CheckCircle2, 
  XCircle, 
  Info, 
  PlusCircle, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatINR, formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import { toDate, formatDate, relativeTime, greeting, daysUntil, initials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { RFQ, Approval, PurchaseOrder, Vendor, ActivityLog, Invoice, Quotation } from '@/lib/types';
import { StatCard } from '@/components/dashboard/StatCard';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { StatCardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Misc';
import { SpendBarChart, CategoryPieChart, TopVendorsChart } from '@/components/charts/Charts';
import { VENDOR_CATEGORIES } from '@/lib/constants';
import { seedDatabase } from '@/lib/seedData';
import { toast } from '@/components/ui/Toast';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [vendorCount, setVendorCount] = useState<number | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const checkVendors = async () => {
      const snapshot = await getDocs(collection(db, 'vendors'))
      setVendorCount(snapshot.size)
    }
    checkVendors()
  }, [])

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snap) => {
      if (isMounted) setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor)));
    });

    const unsubRfqs = onSnapshot(collection(db, 'rfqs'), (snap) => {
      if (isMounted) setRfqs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQ)));
    });

    const unsubApprovals = onSnapshot(collection(db, 'approvals'), (snap) => {
      if (isMounted) setApprovals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Approval)));
    });

    const unsubPos = onSnapshot(collection(db, 'purchaseOrders'), (snap) => {
      if (isMounted) setPos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PurchaseOrder)));
    });

    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
      if (isMounted) setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)));
    });

    const unsubQuotations = onSnapshot(collection(db, 'quotations'), (snap) => {
      if (isMounted) setQuotations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quotation)));
    });

    const unsubLogs = onSnapshot(
      query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(10)),
      (snap) => {
        if (isMounted) {
          setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog)));
          setLoading(false);
        }
      },
      () => {
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubVendors();
      unsubRfqs();
      unsubApprovals();
      unsubPos();
      unsubInvoices();
      unsubQuotations();
      unsubLogs();
    };
  }, []);

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedDatabase(user?.id, user?.fullName);
      toast.success('Demo data loaded successfully!');
    } catch (err) {
      toast.error('Failed to load demo data. Please try again.');
      console.error(err);
    } finally {
      setSeeding(false);
    }
  }

  // Time-based greeting with capitalization
  const rawGreeting = greeting();
  const timeGreeting = rawGreeting.charAt(0).toUpperCase() + rawGreeting.slice(1);
  const timeBasedGreeting = `${timeGreeting}, ${user?.fullName?.split(' ')[0] ?? 'Guest'}`;

  // Stat Cards values
  const activeRfqs = rfqs.filter((r) => r.status === 'open').length;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;
  const activeVendors = vendors.filter((v) => v.status === 'active').length;

  const now = new Date();
  const monthSpend = pos
    .filter((p) => {
      const d = toDate(p.poDate) ?? toDate(p.createdAt);
      return (
        (p.status === 'confirmed' || p.status === 'delivered') &&
        d &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, p) => sum + (p.grandTotal || 0), 0);

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthSpend = pos
    .filter((p) => {
      const d = toDate(p.poDate) ?? toDate(p.createdAt);
      return (
        (p.status === 'confirmed' || p.status === 'delivered') &&
        d &&
        d.getMonth() === lastMonth.getMonth() &&
        d.getFullYear() === lastMonth.getFullYear()
      );
    })
    .reduce((sum, p) => sum + (p.grandTotal || 0), 0);

  // Dynamic Percentage Trends
  function calculatePercentageChange(current: number, previous: number) {
    if (previous === 0) return current > 0 ? { value: '+100%', up: true } : { value: '0%', up: true };
    const pct = ((current - previous) / previous) * 100;
    return { value: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`, up: pct >= 0 };
  }

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const lastMonthActiveRfqs = rfqs.filter((r) => {
    const cd = toDate(r.createdAt);
    return r.status === 'open' && cd && cd < thirtyDaysAgo;
  }).length;
  const rfqTrend = calculatePercentageChange(activeRfqs, lastMonthActiveRfqs || 1);

  const lastMonthPendingApprovals = approvals.filter((a) => {
    const cd = toDate(a.createdAt);
    return a.status === 'pending' && cd && cd < thirtyDaysAgo;
  }).length;
  const approvalsTrend = calculatePercentageChange(pendingApprovals, lastMonthPendingApprovals || 1);

  const spendTrend = calculatePercentageChange(monthSpend, lastMonthSpend);

  const lastMonthActiveVendors = vendors.filter((v) => {
    const cd = toDate(v.createdAt);
    return v.status === 'active' && cd && cd < thirtyDaysAgo;
  }).length;
  const vendorsTrend = calculatePercentageChange(activeVendors, lastMonthActiveVendors || 3);

  // Procurement Health Score
  const closedRfqs = rfqs.filter((r) => r.status === 'closed').length;
  const totalRfqs = rfqs.length;
  const rfqScore = totalRfqs > 0 ? (closedRfqs / totalRfqs) * 100 : 80;

  const approvedApprovals = approvals.filter((a) => a.status === 'approved').length;
  const totalApprovals = approvals.length;
  const approvalScore = totalApprovals > 0 ? (approvedApprovals / totalApprovals) * 100 : 85;

  const deliveredPos = pos.filter((p) => p.status === 'delivered').length;
  const totalPos = pos.length;
  const poScore = totalPos > 0 ? (deliveredPos / totalPos) * 100 : 75;

  const healthScore = totalRfqs === 0 && totalApprovals === 0 && totalPos === 0 
    ? 90 
    : Math.round((rfqScore * 0.3) + (approvalScore * 0.4) + (poScore * 0.3));

  // Role-Based Pending Actions
  const getPendingActions = () => {
    const actions: { id: string; title: string; description: string; href: string; actionText: string }[] = [];

    if (!user) return actions;

    if (user.role === 'admin' || user.role === 'manager') {
      // Pending Approvals
      approvals.filter((a) => a.status === 'pending').forEach((a) => {
        actions.push({
          id: `approval-${a.id}`,
          title: 'Approval Requested',
          description: `Quotation for RFQ #${a.rfqId.slice(-5).toUpperCase()} needs approval. Amount: ${formatCurrency(a.amount)}.`,
          href: '/approvals',
          actionText: 'Review Approval',
        });
      });

      // Overdue invoices
      invoices.filter((i) => i.status === 'sent' && toDate(i.dueDate) && toDate(i.dueDate)!.getTime() < Date.now()).forEach((i) => {
        actions.push({
          id: `invoice-${i.id}`,
          title: 'Overdue Invoice Payment',
          description: `Invoice ${i.invoiceNumber} is past due date. Total: ${formatCurrency(i.grandTotal)}.`,
          href: `/invoices/${i.id}`,
          actionText: 'Review Invoice',
        });
      });
    }

    if (user.role === 'procurement_officer') {
      // RFQs closing soon
      rfqs.filter((r) => {
        const days = daysUntil(r.deadline);
        return r.status === 'open' && days !== null && days >= 0 && days <= 3;
      }).forEach((r) => {
        actions.push({
          id: `rfq-deadline-${r.id}`,
          title: 'RFQ Deadline Approaching',
          description: `"${r.title}" is closing in ${daysUntil(r.deadline)} days. Ensure vendors are invited.`,
          href: `/rfqs/${r.id}`,
          actionText: 'View RFQ',
        });
      });

      // Quotations submitted, pending approval request
      quotations.filter((q) => {
        const hasApproval = approvals.some((a) => a.quotationId === q.id);
        return q.status === 'submitted' && !hasApproval;
      }).forEach((q) => {
        const vName = vendors.find((v) => v.id === q.vendorId)?.companyName ?? 'Vendor';
        actions.push({
          id: `quote-review-${q.id}`,
          title: 'Review New Quotation',
          description: `Quotation from ${vName} for RFQ #${q.rfqId.slice(-5).toUpperCase()} has been submitted.`,
          href: `/rfqs/${q.rfqId}`,
          actionText: 'Compare & Submit',
        });
      });
    }

    if (user.role === 'vendor') {
      const currentVendor = vendors.find((v) => v.email === user.email || v.userId === user.id);
      if (currentVendor) {
        // Invited RFQs that haven't been quoted
        rfqs.filter((r) => {
          const invited = r.invitedVendorIds?.includes(currentVendor.id);
          const alreadyQuoted = quotations.some((q) => q.rfqId === r.id && q.vendorId === currentVendor.id);
          return r.status === 'open' && invited && !alreadyQuoted;
        }).forEach((r) => {
          actions.push({
            id: `bid-rfq-${r.id}`,
            title: 'RFQ Invitation Received',
            description: `You have been invited to quote for "${r.title}". Deadline: ${formatDate(r.deadline)}.`,
            href: `/rfqs/${r.id}`,
            actionText: 'Submit Quotation',
          });
        });

        // Confirmed POs waiting for delivery
        pos.filter((p) => p.vendorId === currentVendor.id && p.status === 'confirmed').forEach((po) => {
          actions.push({
            id: `deliv-po-${po.id}`,
            title: 'Prepare PO Delivery',
            description: `PO ${po.poNumber} is confirmed. Please arrange dispatch and add delivery note.`,
            href: `/purchase-orders/${po.id}`,
            actionText: 'Manage Delivery',
          });
        });
      }
    }

    return actions.slice(0, 5); // max 5 items
  };

  const pendingActionsList = getPendingActions();

  // Activity Log styled icon and color
  function getActivityStyle(description: string) {
    const desc = description.toLowerCase();
    if (desc.includes('approved') || desc.includes('confirmed') || desc.includes('paid')) {
      return {
        icon: CheckCircle2,
        color: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
      };
    }
    if (desc.includes('rejected') || desc.includes('cancelled') || desc.includes('overdue')) {
      return {
        icon: XCircle,
        color: 'text-rose-600 bg-rose-50 border border-rose-100',
      };
    }
    if (desc.includes('created') || desc.includes('submit') || desc.includes('added') || desc.includes('invited')) {
      return {
        icon: PlusCircle,
        color: 'text-blue-600 bg-blue-50 border border-blue-100',
      };
    }
    return {
      icon: Info,
      color: 'text-amber-600 bg-amber-50 border border-amber-100',
    };
  }

  // Spend charts data - Show all 12 months from all POs
  const spendData = MONTHS.map((month, index) => {
    const filteredPos = pos.filter((p) => {
      const pd = toDate(p.poDate) ?? toDate(p.createdAt);
      return pd && pd.getMonth() === index;
    });

    const value = filteredPos.reduce((s, p) => s + (p.grandTotal || 0), 0);
    const count = filteredPos.length;

    return { label: month, value, count };
  });

  // Aggregate vendors by category and count them
  const categoryData = vendors.reduce((acc, v) => {
    const cat = v.category || 'Other';
    const existing = acc.find((x) => x.label === cat);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ label: cat, value: 1 });
    }
    return acc;
  }, [] as { label: string; value: number }[]);

  // Top 5 Vendors by Spend
  const topVendorsData = vendors
    .map((v) => {
      const totalSpend = pos
        .filter((p) => p.vendorId === v.id && (p.status === 'confirmed' || p.status === 'delivered'))
        .reduce((sum, p) => sum + (p.grandTotal || 0), 0);
      return { label: v.companyName, value: totalSpend };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .filter((v) => v.value > 0);

  const recentPos = [...pos]
    .sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0))
    .slice(0, 5);

  return (
    <div className="page-enter">
      <PageHeader
        title={timeBasedGreeting}
        subtitle="Here is what is happening across your procurement operations today."
      />

      {/* Demo Seeding banner */}
      {vendorCount === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between mb-6">
          <div>
            <p className="font-semibold text-orange-800">Welcome to VendorBridge!</p>
            <p className="text-sm text-orange-600">Load 12 months of realistic demo data to explore all features.</p>
          </div>
          <button
            onClick={async () => {
              setSeeding(true)
              await seedDatabase(user?.id, user?.fullName)
              setVendorCount(999)
              setSeeding(false)
            }}
            disabled={seeding}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-orange-600 flex items-center gap-2"
          >
            {seeding ? <><Loader2 className="w-4 h-4 animate-spin" /> Seeding...</> : 'Load Demo Data'}
          </button>
        </div>
      )}

      {/* Prominent Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <Link href="/rfqs/new" className="group flex items-start gap-4 rounded-xl border border-orange-100 bg-white p-4 shadow-sm transition hover:border-orange-500 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-primary transition group-hover:bg-primary group-hover:text-white">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary group-hover:text-primary">Create RFQ</h3>
            <p className="text-xs text-text-secondary mt-0.5">Send a request for quotation to multiple vendors</p>
          </div>
        </Link>
        <Link href="/vendors" className="group flex items-start gap-4 rounded-xl border border-orange-100 bg-white p-4 shadow-sm transition hover:border-orange-500 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary group-hover:text-blue-600">Supplier Directory</h3>
            <p className="text-xs text-text-secondary mt-0.5">Register a new vendor and manage details</p>
          </div>
        </Link>
        <Link href="/reports" className="group flex items-start gap-4 rounded-xl border border-orange-100 bg-white p-4 shadow-sm transition hover:border-orange-500 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary group-hover:text-emerald-600">Analytics & Reports</h3>
            <p className="text-xs text-text-secondary mt-0.5">View spend analysis, savings and KPIs</p>
          </div>
        </Link>
      </div>

      {/* Grid: Stat Cards + Procurement Health Score */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Active RFQs" value={activeRfqs} icon={FileText} trend={rfqTrend} tint="orange" />
            <StatCard label="Pending Approvals" value={pendingApprovals} icon={Clock} trend={approvalsTrend} tint="amber" />
            <StatCard label="Spend This Month" value={monthSpend} icon={IndianRupee} trend={spendTrend} tint="green" isCurrency={true} />
            <StatCard label="Active Vendors" value={activeVendors} icon={Users} trend={vendorsTrend} tint="blue" />
            
            {/* Procurement Health Score Card */}
            <Card className="p-5 h-full flex flex-col justify-between items-center bg-white shadow-sm border border-brand-border">
              <div className="flex w-full items-start justify-between">
                <p className="text-sm font-medium text-text-secondary">Procurement Health</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-primary">
                  <BarChart3 className="h-[18px] w-[18px]" />
                </div>
              </div>
              <div className="mt-2 flex flex-1 items-center justify-center">
                <CircularProgress 
                  value={healthScore} 
                  size={90} 
                  stroke={8} 
                  label={`${healthScore}%`} 
                  sublabel={healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Review'} 
                />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Pending Actions section */}
      {!loading && pendingActionsList.length > 0 && (
        <Card className="mt-6 border border-amber-200 bg-amber-50/20">
          <CardHeader className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/40 py-3">
            <AlertCircle className="h-5 w-5 text-warning" />
            <CardTitle className="text-amber-800">Pending Actions Needs Your Attention</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-amber-100 p-0">
            {pendingActionsList.map((action) => (
              <div key={action.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 text-sm hover:bg-amber-50/30 transition">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{action.title}</p>
                  <p className="text-gray-600 mt-0.5">{action.description}</p>
                </div>
                <Link href={action.href} className="shrink-0">
                  <Button size="sm" variant="secondary" className="bg-white hover:bg-amber-50 text-amber-700 border border-amber-200">
                    {action.actionText} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Row 2: Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Procurement Spend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[300px] w-full" /> : <SpendBarChart data={spendData} />}
          </CardContent>
        </Card>
        <Card className="min-h-[420px]">
          <CardHeader>
            <CardTitle>Vendor Categories</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            {loading ? <Skeleton className="h-[300px] w-full" /> : <CategoryPieChart data={categoryData} />}
          </CardContent>
        </Card>
      </div>

      {/* Row: Top Vendors Chart */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Vendors by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : topVendorsData.length === 0 ? (
              <EmptyState icon={Users} title="No spend data available" description="Complete purchase orders to see top vendor analytics." />
            ) : (
              <TopVendorsChart data={topVendorsData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Recent POs + Recent Activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Purchase Orders</CardTitle>
            <Link href="/purchase-orders" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          {loading ? (
            <div className="p-5">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : recentPos.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="No purchase orders yet" description="Approved quotations generate POs automatically." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>PO Number</TH>
                  <TH>Vendor</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {recentPos.map((po) => {
                  const vendorName = vendors.find((v) => v.id === po.vendorId)?.companyName ?? '—';
                  return (
                    <TR key={po.id}>
                      <TD className="font-medium">
                        <Link href={`/purchase-orders/${po.id}`} className="text-primary hover:underline">
                          {po.poNumber}
                        </Link>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-[10px] font-bold text-white shadow-sm">
                            {initials(vendorName)}
                          </div>
                          <span className="truncate max-w-[150px]">{vendorName}</span>
                        </div>
                      </TD>
                      <TD className="font-semibold text-text-primary">{formatCurrency(po.grandTotal)}</TD>
                      <TD>
                        <StatusBadge status={po.status} />
                      </TD>
                      <TD className="text-text-secondary">{formatDate(po.poDate ?? po.createdAt)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">No activity yet.</p>
            ) : (
              logs.map((log) => {
                const style = getActivityStyle(log.description);
                const Icon = style.icon;
                return (
                  <div key={log.id} className="flex gap-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary leading-snug">{log.description}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{relativeTime(log.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
