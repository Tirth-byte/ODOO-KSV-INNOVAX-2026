'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity as ActivityIcon,
  FileText,
  Users,
  ShoppingCart,
  Receipt,
  CheckSquare,
  ClipboardList,
  Search,
  Download,
  Calendar,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { onSnapshot, collection, query as fireQuery, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { relativeTime, toDate, initials, formatDate, cn } from '@/lib/utils';
import type { ActivityLog, EntityType } from '@/lib/types';
import { PageHeader } from '@/components/ui/Misc';
import { Card, CardContent } from '@/components/ui/Card';
import { Select, Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

const ENTITY_ICON: Record<EntityType, LucideIcon> = {
  RFQ: FileText,
  Vendor: Users,
  PO: ShoppingCart,
  Invoice: Receipt,
  Approval: CheckSquare,
  Quotation: ClipboardList,
};

const getActionColor = (action: string) => {
  const act = action.toLowerCase();
  if (['approved', 'accepted', 'confirmed', 'paid', 'success'].some(x => act.includes(x))) {
    return 'bg-emerald-500 text-white shadow-emerald-200';
  }
  if (['created', 'requested', 'initiated', 'generated', 'sent', 'invited'].some(x => act.includes(x))) {
    return 'bg-blue-500 text-white shadow-blue-200';
  }
  if (['rejected', 'cancelled', 'deleted', 'overdue'].some(x => act.includes(x))) {
    return 'bg-red-500 text-white shadow-red-200';
  }
  return 'bg-orange-500 text-white shadow-orange-200';
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDateStr, setToDateStr] = useState('');

  // Real-time onSnapshot listener for audit logs
  useEffect(() => {
    setLoading(true);
    const q = fireQuery(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(250));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog)));
      setLoading(false);
    }, (err) => {
      toast.error('Failed to load activity logs.');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const uniqueUsers = useMemo(
    () => Array.from(new Set(logs.map((l) => l.userName).filter(Boolean))) as string[],
    [logs],
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (entityFilter && l.entityType !== entityFilter) return false;
      if (userFilter && l.userName !== userFilter) return false;
      
      const d = toDate(l.createdAt);
      if (fromDate && d && d < new Date(fromDate)) return false;
      if (toDateStr && d && d > new Date(toDateStr + 'T23:59:59')) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const descMatch = (l.description ?? '').toLowerCase().includes(q);
        const nameMatch = (l.userName ?? '').toLowerCase().includes(q);
        const actionMatch = (l.action ?? '').toLowerCase().includes(q);
        const entityMatch = (l.entityType ?? '').toLowerCase().includes(q);
        if (!descMatch && !nameMatch && !actionMatch && !entityMatch) return false;
      }
      return true;
    });
  }, [logs, entityFilter, userFilter, fromDate, toDateStr, searchQuery]);

  // Group logs by date (Today, Yesterday, This Week, Earlier)
  const groupedLogs = useMemo(() => {
    const groups: Record<string, ActivityLog[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': []
    };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const startOfWeek = today - (now.getDay() * 86400000);
    
    filtered.forEach((log) => {
      const date = toDate(log.createdAt);
      if (!date) {
        groups['Earlier'].push(log);
        return;
      }
      const ms = date.getTime();
      if (ms >= today) {
        groups['Today'].push(log);
      } else if (ms >= yesterday) {
        groups['Yesterday'].push(log);
      } else if (ms >= startOfWeek) {
        groups['This Week'].push(log);
      } else {
        groups['Earlier'].push(log);
      }
    });
    
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filtered]);

  // CSV Exporter
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No logs available to export.');
      return;
    }
    const headers = ['User', 'Action', 'Entity Type', 'Description', 'Timestamp'];
    const rows = filtered.map((l) => [
      l.userName || 'System',
      l.action,
      l.entityType,
      l.description,
      l.createdAt ? toDate(l.createdAt)?.toISOString() ?? '' : '',
    ]);
    
    const csvContent = [
      headers.join(','), 
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vendorbridge_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    toast.success('Audit log successfully exported to CSV.');
  };

  return (
    <div className="page-enter">
      <PageHeader 
        title="Audit Logs" 
        subtitle="Full real-time system audit logs for administrative transparency."
        action={
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        }
      />

      {/* Filter and Search Panel */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 items-end">
          
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Search within logs</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/70" />
              <input
                type="text"
                placeholder="Search description, user or action..."
                className="w-full rounded-xl border border-brand-border bg-white pl-10 pr-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Entity Type</label>
            <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">All Entities</option>
              {(Object.keys(ENTITY_ICON) as EntityType[]).map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Triggered By</label>
            <Select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
              <option value="">All Users</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-10 w-full pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all cursor-pointer"
                  style={{ colorScheme: 'light' }}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
                <input
                  type="date"
                  value={toDateStr}
                  onChange={(e) => setToDateStr(e.target.value)}
                  className="h-10 w-full pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all cursor-pointer"
                  style={{ colorScheme: 'light' }}
                />
              </div>
            </div>
          </div>

        </div>

        {(entityFilter || userFilter || fromDate || toDateStr || searchQuery) && (
          <div className="flex justify-end mt-3">
            <button 
              onClick={() => {
                setEntityFilter('');
                setUserFilter('');
                setFromDate('');
                setToDateStr('');
                setSearchQuery('');
              }}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Clear all active filters
            </button>
          </div>
        )}
      </Card>

      {/* Timeline Card */}
      {loading ? (
        <Card className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-6 flex-1" />
              </div>
            ))}
          </div>
        </Card>
      ) : groupedLogs.length === 0 ? (
        <Card className="p-6">
          <EmptyState 
            icon={ActivityIcon} 
            title="No logs match criteria" 
            description="Try modifying search parameters or filter criteria to expand results." 
          />
        </Card>
      ) : (
        <div className="space-y-8 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-brand-border md:before:left-1/2 md:before:-translate-x-1/2">
          
          {groupedLogs.map(([dateGroup, items]) => (
            <div key={dateGroup} className="space-y-6">
              
              {/* Date Group Heading Badge */}
              <div className="flex md:justify-center relative z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3.5 py-1 text-xs font-bold text-primary shadow-sm ring-1 ring-orange-200">
                  <Calendar className="h-3 w-3" />
                  <span>{dateGroup}</span>
                </span>
              </div>

              {/* Items Timeline Loop */}
              <div className="space-y-6">
                {items.map((log, idx) => {
                  const Icon = ENTITY_ICON[log.entityType] ?? ActivityIcon;
                  const isEven = idx % 2 === 0;
                  
                  return (
                    <div 
                      key={log.id} 
                      className={cn(
                        "relative flex flex-col md:flex-row items-start md:items-center w-full",
                        isEven ? "md:justify-start" : "md:justify-end"
                      )}
                    >
                      {/* Avatar & Connector Line (Absolute for center overlay on desktop) */}
                      <div className="absolute left-6 md:left-1/2 md:-translate-x-1/2 z-20 flex items-center justify-center">
                        <span className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md border-4 border-white transition-all transform hover:scale-110', 
                          getActionColor(log.action)
                        )}>
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>

                      {/* Log Details Card */}
                      <div className={cn(
                        "w-[calc(100%-3rem)] ml-12 md:ml-0 md:w-[calc(50%-2.5rem)]",
                        isEven ? "md:mr-auto md:text-right" : "md:ml-auto md:text-left"
                      )}>
                        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm hover:shadow-md transition">
                          <div className={cn(
                            "flex flex-col gap-1",
                            isEven ? "md:items-end" : "md:items-start"
                          )}>
                            
                            {/* User Avatar & Name Row */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                                {log.entityType}
                              </span>
                              <span className="text-xs text-text-secondary">
                                {relativeTime(log.createdAt)}
                              </span>
                            </div>

                            <p className="text-sm font-semibold text-text-primary leading-normal">
                              {log.description}
                            </p>

                            <div className="flex items-center gap-2 mt-2">
                              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 font-extrabold text-[9px] text-white flex items-center justify-center">
                                {initials(log.userName || 'System')}
                              </div>
                              <span className="text-xs font-medium text-text-secondary">
                                {log.userName || 'System'}
                              </span>
                            </div>

                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))}

        </div>
      )}
    </div>
  );
}
