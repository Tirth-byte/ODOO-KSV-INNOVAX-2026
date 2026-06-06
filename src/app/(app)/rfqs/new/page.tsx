'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  addDoc,
  collection,
  serverTimestamp,
  writeBatch,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { ArrowLeft, Plus, Trash2, Check, Sparkles } from 'lucide-react';
import { db } from '@/lib/firebase';
import { fetchDoc, fetchCollection } from '@/lib/firestore';
import { logActivity } from '@/lib/activity';
import { useAuth } from '@/hooks/useAuth';
import { cn, parseProductDetails } from '@/lib/utils';
import { PRODUCT_UNITS } from '@/lib/constants';
import type { Vendor, ProductDetail, RFQStatus, RFQ } from '@/lib/types';
import { PageHeader } from '@/components/ui/Misc';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';

const STEPS = [
  { label: 'Basic Info', desc: 'Title, details, and deadlines' },
  { label: 'Products', desc: 'Add required items & quantities' },
  { label: 'Vendors', desc: 'Select suppliers for quotation' },
];

export default function NewRFQPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get('duplicateId');
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // RFQ fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [products, setProducts] = useState<ProductDetail[]>([{ name: '', quantity: 1, unit: PRODUCT_UNITS[0] }]);
  const [attachment, setAttachment] = useState('');

  // Template states
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);

  // Load duplicated RFQ if duplicateId is provided
  useEffect(() => {
    if (duplicateId) {
      (async () => {
        try {
          const original = await fetchDoc<RFQ>('rfqs', duplicateId);
          if (original) {
            setTitle(`Copy of ${original.title}`);
            setDescription(original.description || '');
            if (original.productDetails) {
              setProducts(original.productDetails);
            }
            toast.success('Original RFQ details loaded for duplication.');
          }
        } catch {
          toast.error('Failed to load RFQ for duplication.');
        }
      })();
    }
  }, [duplicateId]);

  // Load vendors & RFQ templates
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchCollection<Vendor>('vendors');
        setVendors(list.filter((v) => v.status === 'active'));
      } catch {
        toast.error('Failed to load vendors.');
      }
    })();

    // Listen to templates
    const unsubTpl = onSnapshot(collection(db, 'rfqTemplates'), (snap) => {
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsubTpl();
  }, []);

  function handleLoadTemplate(id: string) {
    setSelectedTemplateId(id);
    if (!id) return;
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setTitle(tpl.title || '');
      setDescription(tpl.description || '');
      const detailList = parseProductDetails(tpl);
      if (detailList.length > 0) {
        setProducts(detailList);
      }
      toast.success('Template loaded successfully.');
    }
  }

  function updateProduct(i: number, patch: Partial<ProductDetail>) {
    setProducts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addProduct() {
    setProducts((prev) => [...prev, { name: '', quantity: 1, unit: PRODUCT_UNITS[0] }]);
  }
  function removeProduct(i: number) {
    setProducts((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }
  function toggleVendor(id: string) {
    setSelectedVendors((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function validateStep(): boolean {
    if (step === 0) {
      if (!title.trim() || !description.trim() || !deadline) {
        toast.error('Fill in title, description and deadline.');
        return false;
      }
    }
    if (step === 1) {
      if (products.some((p) => !p.name.trim() || p.quantity <= 0)) {
        toast.error('Each product needs a name and a quantity greater than zero.');
        return false;
      }
    }
    return true;
  }

  function next() {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function save(status: RFQStatus) {
    if (!user) return;
    if (!validateStep()) return;
    if (status === 'open' && selectedVendors.length === 0) {
      toast.error('Select at least one vendor to send the RFQ.');
      return;
    }
    setSaving(true);
    try {
      // Create main RFQ document
      const ref = await addDoc(collection(db, 'rfqs'), {
        title,
        description,
        deadline,
        productDetails: products,
        status,
        createdBy: user.id,
        invitedVendorIds: selectedVendors,
        attachmentUrls: attachment ? [attachment] : [],
        createdAt: serverTimestamp(),
      });

      // Save as template if requested
      if (saveAsTemplate) {
        await addDoc(collection(db, 'rfqTemplates'), {
          title,
          description,
          productDetails: products,
          createdBy: user.id,
          createdAt: serverTimestamp(),
        });
      }

      if (status === 'open' && selectedVendors.length) {
        const batch = writeBatch(db);
        selectedVendors.forEach((vendorId) => {
          const rv = doc(collection(db, 'rfqVendors'));
          batch.set(rv, { rfqId: ref.id, vendorId, invitedAt: serverTimestamp() });
        });
        await batch.commit();
      }

      await logActivity(
        user.id,
        status === 'open' ? 'sent' : 'created',
        'RFQ',
        ref.id,
        status === 'open' ? `Sent RFQ "${title}" to ${selectedVendors.length} vendor(s)` : `Created draft RFQ "${title}"`,
        undefined,
        user.fullName,
      );

      toast.success(status === 'open' ? 'RFQ sent to vendors.' : 'Draft saved.');
      router.push(`/rfqs/${ref.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Could not save RFQ.');
    } finally {
      setSaving(false);
    }
  }

  const progressPercent = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-3xl page-enter">
      <Link href="/rfqs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition">
        <ArrowLeft className="h-4 w-4" /> Back to RFQs
      </Link>
      <PageHeader title="New RFQ" subtitle="Create a request for quotation in three steps." />

      {/* Stepper Wizard Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Step {step + 1} of 3</span>
          <span className="text-xs font-bold text-text-primary">{STEPS[step].label}</span>
        </div>
        <div className="w-full bg-orange-100 h-2.5 rounded-full overflow-hidden shadow-inner">
          <div 
            className="bg-gradient-to-r from-orange-400 to-primary h-full transition-all duration-300 rounded-full" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>
      </div>

      {/* Visual Step Circles */}
      <div className="mb-6 flex items-center justify-between bg-white border border-brand-border rounded-xl p-4 shadow-sm">
        {STEPS.map((item, i) => (
          <div key={item.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition shadow-sm border',
                  i < step && 'bg-emerald-50 text-success border-emerald-200',
                  i === step && 'bg-gradient-to-br from-orange-400 to-primary text-white border-orange-500',
                  i > step && 'bg-gray-50 text-text-secondary border-brand-border',
                )}
              >
                {i < step ? <Check className="h-4.5 w-4.5" /> : i + 1}
              </div>
              <div className="hidden sm:block text-left">
                <p className={cn('text-xs font-bold leading-tight', i === step ? 'text-primary' : 'text-text-primary')}>{item.label}</p>
                <p className="text-[10px] text-text-secondary font-normal">{item.desc}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && <div className={cn('mx-4 h-0.5 flex-1 border-t border-dashed', i < step ? 'border-success' : 'border-brand-border')} />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          {step === 0 && (
            <>
              {/* Template Loader Dropdown */}
              {templates.length > 0 && (
                <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3.5 flex items-center gap-3.5 mb-2">
                  <div className="p-2 rounded-lg bg-orange-100 text-primary">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="template" className="text-xs font-bold text-orange-800">Quick Start: Load RFQ Template</Label>
                    <Select 
                      id="template" 
                      value={selectedTemplateId} 
                      onChange={(e) => handleLoadTemplate(e.target.value)}
                      className="mt-1 bg-white border-orange-200 focus:border-primary text-xs"
                    >
                      <option value="">-- Choose an RFQ template --</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>{tpl.title}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q3 Office Equipment Sourcing" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the requirement..." />
              </div>
              <div>
                <Label htmlFor="deadline">Submission deadline</Label>
                <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {products.map((p, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    {i === 0 && <Label>Product</Label>}
                    <Input value={p.name} onChange={(e) => updateProduct(i, { name: e.target.value })} placeholder="Product name" />
                  </div>
                  <div className="w-24">
                    {i === 0 && <Label>Qty</Label>}
                    <Input type="number" min="1" value={p.quantity} onChange={(e) => updateProduct(i, { quantity: Number(e.target.value) })} />
                  </div>
                  <div className="w-28">
                    {i === 0 && <Label>Unit</Label>}
                    <Select value={p.unit} onChange={(e) => updateProduct(i, { unit: e.target.value })}>
                      {PRODUCT_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProduct(i)}
                    className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-red-50 hover:text-danger transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addProduct} type="button">
                <Plus className="h-4 w-4" /> Add product
              </Button>
            </div>
          )}

          {step === 2 && (
            <>
              <div>
                <Label>Invite vendors ({selectedVendors.length} selected)</Label>
                {vendors.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-brand-border p-4 text-sm text-text-secondary">
                    No active vendors found. Add vendors first.
                  </p>
                ) : (
                  <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                    {vendors.map((v) => {
                      const selected = selectedVendors.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleVendor(v.id)}
                          className={cn(
                            'flex items-center justify-between rounded-xl border p-3 text-left transition',
                            selected ? 'border-primary bg-orange-50' : 'border-brand-border hover:bg-orange-50/50',
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">{v.companyName}</p>
                            <p className="truncate text-xs text-text-secondary">{v.category}</p>
                          </div>
                          <div className={cn('flex h-5 w-5 items-center justify-center rounded-full border', selected ? 'border-primary bg-primary text-white' : 'border-brand-border')}>
                            {selected && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="attachment">Attachment URL (optional)</Label>
                <Input id="attachment" value={attachment} onChange={(e) => setAttachment(e.target.value)} placeholder="https://..." />
              </div>

              {/* Save as Template checkbox */}
              <div className="flex items-center gap-2 border-t border-brand-border pt-4 mt-2">
                <input 
                  type="checkbox" 
                  id="saveTemplate" 
                  checked={saveAsTemplate} 
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4.5 w-4.5"
                />
                <Label htmlFor="saveTemplate" className="text-sm font-semibold text-text-primary cursor-pointer select-none">
                  Save this RFQ as a reusable template
                </Label>
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-brand-border pt-5 mt-4">
            <Button variant="ghost" onClick={back} disabled={step === 0} type="button">
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => save('draft')} loading={saving} type="button">
                Save as Draft
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={next} type="button">
                  Continue
                </Button>
              ) : (
                <Button onClick={() => save('open')} loading={saving} type="button">
                  Send to Vendors
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
        Status on save: <StatusBadge status="draft" /> or <StatusBadge status="open" />
      </div>
    </div>
  );
}

