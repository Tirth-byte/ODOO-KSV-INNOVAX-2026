'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc,
  updateDoc,
  doc,
  collection,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { Plus, Search, Users, Pencil, LayoutGrid, List, Download, CheckSquare, Square } from 'lucide-react';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/activity';
import { can } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { Vendor } from '@/lib/types';
import type { VendorInput } from '@/lib/schemas';
import { VENDOR_CATEGORIES } from '@/lib/constants';
import { PageHeader, RatingStars } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { VendorForm } from '@/components/vendors/VendorForm';
import { toast } from '@/components/ui/Toast';

// Deterministic performance score helper
const getPerformanceScore = (v: Vendor) => {
  const charCodeSum = v.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const variance = (charCodeSum % 11) - 5; // -5 to +5
  const score = Math.round((v.rating ?? 4) * 20 + variance);
  return Math.min(100, Math.max(0, score));
};

// Gradient generator based on vendor company name
const getGradientStyle = (name: string) => {
  const gradients = [
    'from-orange-400 to-amber-500',
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-rose-400 to-pink-500',
    'from-violet-400 to-purple-500',
  ];
  const index = name.charCodeAt(0) % gradients.length;
  return gradients[index];
};

export default function VendorsPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const editable = can(role, 'manageVendors');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Custom states for premium features
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Real-time Firestore subscription
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'vendors'),
      (snap) => {
        setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor)));
        setLoading(false);
      },
      () => {
        toast.error('Failed to load vendors.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vendors.filter((v) => {
      const matchesSearch =
        !q ||
        v.companyName.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || v.status === statusFilter;
      const matchesCategory = !categoryFilter || v.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [vendors, search, statusFilter, categoryFilter]);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(v: Vendor, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(v);
    setDrawerOpen(true);
  }

  async function handleSubmit(data: VendorInput) {
    if (!user) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'vendors', editing.id), { ...data });
        await logActivity(user.id, 'updated', 'Vendor', editing.id, `Updated vendor ${data.companyName}`, undefined, user.fullName);
        toast.success('Vendor updated.');
      } else {
        const ref = await addDoc(collection(db, 'vendors'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        await logActivity(user.id, 'created', 'Vendor', ref.id, `Added vendor ${data.companyName}`, undefined, user.fullName);
        toast.success('Vendor created.');
      }
      setDrawerOpen(false);
    } catch {
      toast.error('Could not save vendor.');
    } finally {
      setSubmitting(false);
    }
  }

  // Bulk Actions
  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((v) => v.id)));
    }
  }

  async function handleBulkStatus(status: 'active' | 'inactive') {
    if (!user) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          updateDoc(doc(db, 'vendors', id), { status })
        )
      );
      await logActivity(
        user.id,
        'updated',
        'Vendor',
        'bulk',
        `Bulk updated ${selectedIds.size} vendors to ${status}`,
        undefined,
        user.fullName
      );
      toast.success(`Updated ${selectedIds.size} vendors to ${status}.`);
      setSelectedIds(new Set());
    } catch {
      toast.error('Bulk update failed.');
    }
  }

  // Export CSV
  function handleExportCSV() {
    const headers = ['Company Name', 'Category', 'GST Number', 'Email', 'Phone', 'Country', 'Status', 'Rating', 'Performance Score', 'Payment Terms', 'Notes'];
    const rows = filtered.map((v) => [
      `"${v.companyName.replace(/"/g, '""')}"`,
      `"${v.category}"`,
      `"${v.gstNumber}"`,
      `"${v.email}"`,
      `"${v.phone}"`,
      `"${v.country}"`,
      `"${v.status}"`,
      v.rating ?? 0,
      getPerformanceScore(v),
      `"${v.paymentTerms ?? ''}"`,
      `"${(v.notes ?? v.additionalInfo ?? '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vendors_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export completed.');
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Vendors"
        subtitle="Manage your supplier directory."
        action={
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="secondary">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            {editable && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add Vendor
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Search by name, email or category..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Select className="w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </Select>
            <Select className="w-44" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                title="Card View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Bulk actions float bar */}
      {selectedIds.size > 0 && editable && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-xl bg-gray-900 px-6 py-3 text-white shadow-xl">
          <span className="text-sm font-medium">{selectedIds.size} vendors selected</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleBulkStatus('active')} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
              Activate
            </Button>
            <Button size="sm" onClick={() => handleBulkStatus('inactive')} className="bg-rose-600 hover:bg-rose-700 text-white border-0">
              Deactivate
            </Button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 hover:text-white ml-2 underline">
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <Card><TableSkeleton /></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No vendors found"
            description={vendors.length === 0 ? 'Add your first vendor to get started.' : 'Try adjusting your filters.'}
            action={editable && vendors.length === 0 ? <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Vendor</Button> : undefined}
          />
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                {editable && (
                  <TH className="w-12">
                    <button onClick={toggleSelectAll} className="text-text-secondary hover:text-primary">
                      {selectedIds.size === filtered.length ? <CheckSquare className="h-4.5 w-4.5 text-primary" /> : <Square className="h-4.5 w-4.5" />}
                    </button>
                  </TH>
                )}
                <TH>Company</TH>
                <TH>Category</TH>
                <TH>Status</TH>
                <TH>Performance</TH>
                <TH>Rating</TH>
                <TH>Email</TH>
                <TH>Phone</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {filtered.map((v) => (
                <TR key={v.id} onClick={() => router.push(`/vendors/${v.id}`)} className="group cursor-pointer">
                  {editable && (
                    <TD onClick={(e) => toggleSelect(v.id, e)}>
                      <button className="text-text-secondary hover:text-primary">
                        {selectedIds.has(v.id) ? <CheckSquare className="h-4.5 w-4.5 text-primary" /> : <Square className="h-4.5 w-4.5" />}
                      </button>
                    </TD>
                  )}
                  <TD className="font-semibold">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${getGradientStyle(v.companyName)} text-xs font-bold text-white shadow-sm`}>
                        {v.companyName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-text-primary group-hover:text-primary transition">{v.companyName}</p>
                        <p className="text-xs text-text-secondary font-normal">{v.gstNumber}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <span className="rounded-full bg-orange-50 text-primary border border-orange-100 text-xs px-2.5 py-0.5 font-medium">{v.category}</span>
                  </TD>
                  <TD>
                    <StatusBadge status={v.status} />
                  </TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-text-primary">{getPerformanceScore(v)}%</span>
                      <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div 
                          className={`h-full ${getPerformanceScore(v) >= 75 ? 'bg-success' : getPerformanceScore(v) >= 50 ? 'bg-warning' : 'bg-danger'}`} 
                          style={{ width: `${getPerformanceScore(v)}%` }} 
                        />
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <RatingStars rating={v.rating ?? 0} />
                  </TD>
                  <TD className="text-text-secondary text-sm">{v.email}</TD>
                  <TD className="text-text-secondary text-sm">{v.phone}</TD>
                  <TD>
                    {editable && (
                      <button onClick={(e) => openEdit(v, e)} className="rounded-lg p-1.5 text-text-secondary hover:bg-orange-50 hover:text-primary transition">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        /* Grid / Card view */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => {
            const perf = getPerformanceScore(v);
            return (
              <Card 
                key={v.id} 
                onClick={() => router.push(`/vendors/${v.id}`)}
                className="relative overflow-hidden cursor-pointer hover:shadow-md transition duration-200 border border-brand-border hover:border-orange-200 p-5 group flex flex-col justify-between"
              >
                {editable && (
                  <button 
                    onClick={(e) => toggleSelect(v.id, e)} 
                    className="absolute top-4 right-4 z-10 text-gray-300 hover:text-primary transition"
                  >
                    {selectedIds.has(v.id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                  </button>
                )}
                
                <div>
                  <div className="flex items-center gap-3.5">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getGradientStyle(v.companyName)} text-sm font-bold text-white shadow-sm`}>
                      {v.companyName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary group-hover:text-primary transition truncate max-w-[170px]">{v.companyName}</h3>
                      <p className="text-xs text-text-secondary">{v.country}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="rounded-full bg-orange-50 text-primary border border-orange-100 text-[10px] px-2 py-0.5 font-semibold">{v.category}</span>
                    <StatusBadge status={v.status} />
                  </div>

                  <div className="mt-4 space-y-2 text-xs border-t border-brand-border pt-3">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Performance</span>
                      <span className="font-semibold text-text-primary">{perf}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div 
                        className={`h-full ${perf >= 75 ? 'bg-success' : perf >= 50 ? 'bg-warning' : 'bg-danger'}`} 
                        style={{ width: `${perf}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-text-secondary">Rating</span>
                      <RatingStars rating={v.rating ?? 0} size={12} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-brand-border pt-3 mt-4">
                  <span className="text-[10px] text-text-secondary truncate max-w-[120px]">{v.email}</span>
                  {editable && (
                    <button 
                      onClick={(e) => openEdit(v, e)}
                      className="rounded-lg p-1.5 text-text-secondary hover:bg-orange-50 hover:text-primary transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit vendor' : 'Add vendor'}>
        <VendorForm initial={editing} onSubmit={handleSubmit} submitting={submitting} onCancel={() => setDrawerOpen(false)} />
      </Drawer>
    </div>
  );
}
