'use client';

import {
  collection,
  writeBatch,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Vendor,
  RFQ,
  Quotation,
  Approval,
  PurchaseOrder,
  Invoice,
  ActivityLog,
  ProductDetail,
  LineItem,
} from './types';

// ============================================================================
// VENDORS - 15 vendors with complete data
// ============================================================================

const vendorsData: Omit<Vendor, 'id'>[] = [
  {
    companyName: 'TechCore Solutions Pvt Ltd',
    category: 'IT Hardware',
    gstNumber: '27AABCT1332L1ZV',
    email: 'procurement@techcore.in',
    phone: '+91 98765 43210',
    country: 'India',
    status: 'active',
    rating: 4.5,
    paymentTerms: 'Net 30',
    additionalInfo: 'Authorized Dell, HP and Lenovo reseller. ISO 9001:2015 certified.',
    bankAccountName: 'TechCore Solutions Pvt Ltd',
    bankAccountNumber: '50200012345678',
    bankName: 'HDFC Bank',
    bankIfscCode: 'HDFC0001234',
  },
  {
    companyName: 'Infra Supplies Ltd',
    category: 'Furniture',
    gstNumber: '29AABCI2345M1ZQ',
    email: 'sales@infrasupplies.com',
    phone: '+91 87654 32109',
    country: 'India',
    status: 'active',
    rating: 4.2,
    paymentTerms: 'Net 45',
    additionalInfo: 'Premium office furniture manufacturer. 5 year warranty.',
    bankAccountName: 'Infra Supplies Ltd',
    bankAccountNumber: '60100023456789',
    bankName: 'ICICI Bank',
    bankIfscCode: 'ICIC0002345',
  },
  {
    companyName: 'LogiTrans Pvt Ltd',
    category: 'Logistics',
    gstNumber: '24AABCL3456N1ZR',
    email: 'ops@logitrans.in',
    phone: '+91 76543 21098',
    country: 'India',
    status: 'active',
    rating: 3.8,
    paymentTerms: 'Net 15',
    additionalInfo: 'Pan-India logistics. 500+ locations. Real-time tracking.',
    bankAccountName: 'LogiTrans Pvt Ltd',
    bankAccountNumber: '37010034567890',
    bankName: 'State Bank of India',
    bankIfscCode: 'SBIN0003456',
  },
  {
    companyName: 'PrintMaster India',
    category: 'Stationery',
    gstNumber: '06AABCP4567O1ZS',
    email: 'orders@printmaster.in',
    phone: '+91 65432 10987',
    country: 'India',
    status: 'inactive',
    rating: 3.5,
    paymentTerms: 'Net 30',
    additionalInfo: 'Bulk stationery and printing solutions. GST invoice provided.',
    bankAccountName: 'PrintMaster India',
    bankAccountNumber: '00990045678901',
    bankName: 'Punjab National Bank',
    bankIfscCode: 'PUNB0004567',
  },
  {
    companyName: 'CloudNet Systems',
    category: 'IT Software',
    gstNumber: '19AABCC5678P1ZT',
    email: 'b2b@cloudnet.io',
    phone: '+91 54321 09876',
    country: 'India',
    status: 'active',
    rating: 4.8,
    paymentTerms: 'Net 60',
    additionalInfo: 'Microsoft Gold Partner. AWS Advanced Partner. CMMI Level 3.',
    bankAccountName: 'CloudNet Systems Pvt Ltd',
    bankAccountNumber: '10500056789012',
    bankName: 'Axis Bank',
    bankIfscCode: 'UTIB0005678',
  },
  {
    companyName: 'FurniWorld Corp',
    category: 'Furniture',
    gstNumber: '33AABCF6789Q1ZU',
    email: 'corporate@furniworld.com',
    phone: '+91 43210 98765',
    country: 'India',
    status: 'active',
    rating: 4.0,
    paymentTerms: 'Net 30',
    additionalInfo: 'Ergonomic office furniture specialists. Custom design.',
    bankAccountName: 'FurniWorld Corp',
    bankAccountNumber: '91010067890123',
    bankName: 'Kotak Mahindra Bank',
    bankIfscCode: 'KKBK0006789',
  },
  {
    companyName: 'SafeGuard Security Systems',
    category: 'Security',
    gstNumber: '07AABCS7890R1ZV',
    email: 'enterprise@safeguard.in',
    phone: '+91 99887 76655',
    country: 'India',
    status: 'active',
    rating: 4.3,
    paymentTerms: 'Net 45',
    additionalInfo: 'CCTV, access control, fire alarms. 24/7 AMC support.',
    bankAccountName: 'SafeGuard Security Systems Pvt Ltd',
    bankAccountNumber: '20200078901234',
    bankName: 'HDFC Bank',
    bankIfscCode: 'HDFC0007890',
  },
  {
    companyName: 'GreenClean Facility Services',
    category: 'Facility Management',
    gstNumber: '27AABCG8901S1ZW',
    email: 'contracts@greenclean.in',
    phone: '+91 88776 65544',
    country: 'India',
    status: 'active',
    rating: 3.9,
    paymentTerms: 'Net 30',
    additionalInfo: 'ISO 14001 certified. Eco-friendly. 2000+ trained staff.',
    bankAccountName: 'GreenClean Facility Services Pvt Ltd',
    bankAccountNumber: '30300089012345',
    bankName: 'Yes Bank',
    bankIfscCode: 'YESB0008901',
  },
  {
    companyName: 'PowerTech Electricals',
    category: 'Electrical',
    gstNumber: '29AABCP9012T1ZX',
    email: 'sales@powertech.in',
    phone: '+91 77665 54433',
    country: 'India',
    status: 'active',
    rating: 4.1,
    paymentTerms: 'Net 30',
    additionalInfo: 'Havells & Schneider distributor. Licensed electrical contractor.',
    bankAccountName: 'PowerTech Electricals Pvt Ltd',
    bankAccountNumber: '40400090123456',
    bankName: 'Canara Bank',
    bankIfscCode: 'CNRB0009012',
  },
  {
    companyName: 'MediSupply India Pvt Ltd',
    category: 'Medical Supplies',
    gstNumber: '24AABCM0123U1ZY',
    email: 'b2b@medisupply.in',
    phone: '+91 66554 43322',
    country: 'India',
    status: 'active',
    rating: 4.6,
    paymentTerms: 'Net 15',
    additionalInfo: 'WHO-GMP certified. Supply to 500+ hospitals. Cold chain available.',
    bankAccountName: 'MediSupply India Pvt Ltd',
    bankAccountNumber: '50500001234567',
    bankName: 'Bank of Baroda',
    bankIfscCode: 'BARB0010123',
  },
  {
    companyName: 'AutoFleet Transport Services',
    category: 'Transportation',
    gstNumber: '06AABCA1234V1ZZ',
    email: 'fleet@autofleet.in',
    phone: '+91 55443 32211',
    country: 'India',
    status: 'active',
    rating: 3.7,
    paymentTerms: 'Net 30',
    additionalInfo: '200+ vehicles. GPS tracked. 24/7 corporate transport.',
    bankAccountName: 'AutoFleet Transport Services Pvt Ltd',
    bankAccountNumber: '62300012345671',
    bankName: 'Union Bank of India',
    bankIfscCode: 'UBIN0011234',
  },
  {
    companyName: 'BuildRight Construction Co',
    category: 'Construction',
    gstNumber: '19AABCB2345W1ZA',
    email: 'projects@buildright.in',
    phone: '+91 44332 21100',
    country: 'India',
    status: 'active',
    rating: 4.4,
    paymentTerms: 'Net 60',
    additionalInfo: 'Class A contractor. ₹500Cr+ projects. PAN India.',
    bankAccountName: 'BuildRight Construction Co Pvt Ltd',
    bankAccountNumber: '10482312345672',
    bankName: 'State Bank of India',
    bankIfscCode: 'SBIN0012345',
  },
  {
    companyName: 'DataVault Technologies',
    category: 'IT Software',
    gstNumber: '33AABCD3456X1ZB',
    email: 'sales@datavault.in',
    phone: '+91 33221 10099',
    country: 'India',
    status: 'active',
    rating: 4.7,
    paymentTerms: 'Net 45',
    additionalInfo: 'Enterprise data management and cybersecurity. SOC 2 Type II.',
    bankAccountName: 'DataVault Technologies Pvt Ltd',
    bankAccountNumber: '91110023456783',
    bankName: 'ICICI Bank',
    bankIfscCode: 'ICIC0013456',
  },
  {
    companyName: 'OfficeZone Supplies',
    category: 'Stationery',
    gstNumber: '27AABCO4567Y1ZC',
    email: 'corporate@officezone.in',
    phone: '+91 22110 09988',
    country: 'India',
    status: 'active',
    rating: 4.1,
    paymentTerms: 'Net 30',
    additionalInfo: 'One-stop office supplies. Same day delivery in Mumbai.',
    bankAccountName: 'OfficeZone Supplies Pvt Ltd',
    bankAccountNumber: '50200034567894',
    bankName: 'HDFC Bank',
    bankIfscCode: 'HDFC0014567',
  },
  {
    companyName: 'CoolAir HVAC Solutions',
    category: 'HVAC',
    gstNumber: '29AABCC5678Z1ZD',
    email: 'projects@coolair.in',
    phone: '+91 11009 98877',
    country: 'India',
    status: 'active',
    rating: 4.2,
    paymentTerms: 'Net 45',
    additionalInfo: 'Daikin and Carrier authorized dealer. Installation & AMC.',
    bankAccountName: 'CoolAir HVAC Solutions Pvt Ltd',
    bankAccountNumber: '60100045678905',
    bankName: 'Axis Bank',
    bankIfscCode: 'UTIB0015678',
  },
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

export async function seedDatabase(userId?: string, userName?: string): Promise<void> {
  if (!userId) userId = 'demo-user-' + Date.now();
  if (!userName) userName = 'Demo Admin';

  const batch = writeBatch(db);
  let docCount = 0;
  const MAX_BATCH_SIZE = 450;
  const now = new Date(2026, 5, 6); // June 6, 2026

  const makeLineItems = (products: ProductDetail[], basePrice: number, vendorIndex = 0): LineItem[] =>
    products.map((product, index) => {
      const unitPrice = Math.round(basePrice * (1 + index * 0.18 + vendorIndex * 0.08));
      return {
        description: `${product.name} (${product.quantity} ${product.unit})`,
        qty: product.quantity,
        unitPrice,
        total: unitPrice * product.quantity,
      };
    });

  const sumLineItems = (items: LineItem[]) => items.reduce((sum, item) => sum + item.total, 0);

  try {
    // ========== VENDORS ==========
    const vendorIds: Record<string, string> = {};
    for (const vendor of vendorsData) {
      const vendorRef = doc(collection(db, 'vendors'));
      vendorIds[vendor.companyName] = vendorRef.id;
      batch.set(vendorRef, {
        ...vendor,
        createdAt: Timestamp.fromDate(new Date(2025, 6, 15 + Math.random() * 15)),
      });
      docCount++;
      if (docCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        docCount = 0;
      }
    }

    // ========== RFQS ==========
    const rfqIds: string[] = [];
    const rfqsData: Array<{
      title: string;
      month: number;
      status: RFQ['status'];
      deadline: Date;
      productDetails: ProductDetail[];
      invitedVendorNames: string[];
      basePrice: number;
    }> = [
      // Past RFQs (closed)
      {
        title: 'Q1 2026 - Office Supplies',
        month: 0,
        status: 'closed',
        deadline: new Date(2026, 1, 15),
        productDetails: [
          { name: 'A4 copier paper reams', quantity: 600, unit: 'reams' },
          { name: 'Premium ball pens', quantity: 1200, unit: 'pieces' },
          { name: 'Printer toner cartridges', quantity: 85, unit: 'pieces' },
        ],
        invitedVendorNames: ['PrintMaster India', 'OfficeZone Supplies', 'TechCore Solutions Pvt Ltd'],
        basePrice: 140,
      },
      {
        title: 'Q1 2026 - IT Hardware',
        month: 0,
        status: 'closed',
        deadline: new Date(2026, 2, 10),
        productDetails: [
          { name: 'Business laptops', quantity: 28, unit: 'units' },
          { name: '27-inch monitors', quantity: 45, unit: 'units' },
          { name: 'Wireless keyboard and mouse kits', quantity: 60, unit: 'sets' },
        ],
        invitedVendorNames: ['TechCore Solutions Pvt Ltd', 'CloudNet Systems', 'DataVault Technologies'],
        basePrice: 42000,
      },
      {
        title: 'Q2 2026 - Furniture Refresh',
        month: 3,
        status: 'closed',
        deadline: new Date(2026, 4, 20),
        productDetails: [
          { name: 'Ergonomic work chairs', quantity: 80, unit: 'units' },
          { name: 'Height-adjustable desks', quantity: 35, unit: 'units' },
          { name: 'Conference room tables', quantity: 6, unit: 'units' },
        ],
        invitedVendorNames: ['Infra Supplies Ltd', 'FurniWorld Corp', 'OfficeZone Supplies'],
        basePrice: 7800,
      },
      {
        title: 'May 2026 - Security Upgrade',
        month: 4,
        status: 'closed',
        deadline: new Date(2026, 5, 1),
        productDetails: [
          { name: 'IP CCTV cameras', quantity: 48, unit: 'units' },
          { name: 'Biometric access terminals', quantity: 12, unit: 'units' },
          { name: 'Annual monitoring service', quantity: 1, unit: 'year' },
        ],
        invitedVendorNames: ['SafeGuard Security Systems', 'PowerTech Electricals', 'DataVault Technologies'],
        basePrice: 18500,
      },
      // Current/Recent RFQs (open)
      {
        title: 'June 2026 - Logistics Services',
        month: 5,
        status: 'open',
        deadline: new Date(2026, 6, 15),
        productDetails: [
          { name: 'Inter-city pallet shipments', quantity: 320, unit: 'shipments' },
          { name: 'Express document deliveries', quantity: 900, unit: 'deliveries' },
          { name: 'Warehouse pickup slots', quantity: 24, unit: 'slots' },
        ],
        invitedVendorNames: ['LogiTrans Pvt Ltd', 'AutoFleet Transport Services', 'GreenClean Facility Services'],
        basePrice: 2400,
      },
      {
        title: 'June 2026 - Software Licenses',
        month: 5,
        status: 'open',
        deadline: new Date(2026, 6, 20),
        productDetails: [
          { name: 'Productivity suite licenses', quantity: 250, unit: 'seats' },
          { name: 'Endpoint security licenses', quantity: 250, unit: 'seats' },
          { name: 'Cloud backup storage', quantity: 12, unit: 'TB' },
        ],
        invitedVendorNames: ['CloudNet Systems', 'DataVault Technologies', 'TechCore Solutions Pvt Ltd'],
        basePrice: 3600,
      },
    ];

    for (const rfq of rfqsData) {
      const rfqRef = doc(collection(db, 'rfqs'));
      rfqIds.push(rfqRef.id);
      batch.set(rfqRef, {
        title: rfq.title,
        description: 'Procurement request for ' + rfq.title,
        productDetails: rfq.productDetails,
        deadline: Timestamp.fromDate(rfq.deadline),
        status: rfq.status,
        createdBy: userId,
        createdAt: Timestamp.fromDate(new Date(2026, rfq.month, 1 + Math.random() * 10)),
        invitedVendorIds: rfq.invitedVendorNames.map((name) => vendorIds[name]).filter(Boolean),
      });
      docCount++;
      if (docCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        docCount = 0;
      }
    }

    // ========== QUOTATIONS, APPROVALS, POS, INVOICES ==========
    const quotationIds: string[] = [];
    const approvalIds: string[] = [];
    const poIds: string[] = [];
    const invoiceIds: string[] = [];

    // Create data for closed RFQs (4 total)
    for (let i = 0; i < 4; i++) {
      // 3 quotations per RFQ
      for (let j = 0; j < 3; j++) {
        const quotationRef = doc(collection(db, 'quotations'));
        quotationIds.push(quotationRef.id);
        const isAccepted = j === 0;
        const lineItems = makeLineItems(rfqsData[i].productDetails, rfqsData[i].basePrice, j);
        const totalAmount = sumLineItems(lineItems);
        
        batch.set(quotationRef, {
          rfqId: rfqIds[i],
          vendorId: vendorIds[rfqsData[i].invitedVendorNames[j]],
          lineItems,
          totalAmount,
          taxRate: 18,
          taxAmount: Math.round(totalAmount * 0.18),
          deliveryDays: 14 + j * 5,
          paymentTerms: 'Net 30',
          status: isAccepted ? 'accepted' : 'rejected',
          submittedAt: Timestamp.fromDate(new Date(2026, i, 20 + j)),
        });
        docCount++;

        if (isAccepted) {
          // Create approval
          const approvalRef = doc(collection(db, 'approvals'));
          approvalIds.push(approvalRef.id);
          const isApproved = i % 2 === 0; // Half approved, half pending
          
          batch.set(approvalRef, {
            rfqId: rfqIds[i],
            quotationId: quotationIds[quotationIds.length - 1],
            requestedBy: userId,
            approverId: userId,
            status: isApproved ? 'approved' : 'pending',
            remarks: isApproved ? 'Approved after evaluation' : 'Awaiting manager approval',
            vendorId: vendorIds[rfqsData[i].invitedVendorNames[j]],
            amount: totalAmount,
            createdAt: Timestamp.fromDate(new Date(2026, i, 25)),
            ...(isApproved && { resolvedAt: Timestamp.fromDate(new Date(2026, i, 27)) }),
          });
          docCount++;

          // Create PO only for approved ones
          if (isApproved) {
            const poRef = doc(collection(db, 'purchaseOrders'));
            poIds.push(poRef.id);
            
            batch.set(poRef, {
              poNumber: `PO-2026-${String(i + 1).padStart(4, '0')}`,
              quotationId: quotationIds[quotationIds.length - 1],
              rfqId: rfqIds[i],
              vendorId: vendorIds[rfqsData[i].invitedVendorNames[j]],
              lineItems,
              subtotal: totalAmount,
              taxRate: 18,
              taxAmount: Math.round(totalAmount * 0.18),
              grandTotal: Math.round(totalAmount * 1.18),
              status: 'delivered',
              poDate: Timestamp.fromDate(new Date(2026, i, 28)),
              createdBy: userId,
              createdAt: Timestamp.fromDate(new Date(2026, i, 28)),
            });
            docCount++;

            // Create invoice
            const invoiceRef = doc(collection(db, 'invoices'));
            invoiceIds.push(invoiceRef.id);
            const invoiceAmount = Math.round(totalAmount * 1.18);
            
            batch.set(invoiceRef, {
              invoiceNumber: `INV-2026-${String(i + 1).padStart(4, '0')}`,
              poId: poIds[poIds.length - 1],
              vendorId: vendorIds[rfqsData[i].invitedVendorNames[j]],
              rfqId: rfqIds[i],
              lineItems,
              subtotal: totalAmount,
              taxRate: 18,
              taxAmount: Math.round(totalAmount * 0.18),
              grandTotal: invoiceAmount,
              status: 'paid',
              dueDate: Timestamp.fromDate(new Date(2026, i + 1, 10)),
              sentAt: Timestamp.fromDate(new Date(2026, i + 1, 1)),
              ...(i < 3 && { paidAt: Timestamp.fromDate(new Date(2026, i + 1, 5)) }),
              createdAt: Timestamp.fromDate(new Date(2026, i + 1, 1)),
            });
            docCount++;
          }
        }

        if (docCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          docCount = 0;
        }
      }
    }

    // Seed submitted quotations for open RFQs so vendor response cards are populated.
    const openQuotationIdsByRfq: Record<number, string[]> = {};
    for (let i = 4; i < rfqsData.length; i++) {
      openQuotationIdsByRfq[i] = [];

      for (let j = 0; j < rfqsData[i].invitedVendorNames.length; j++) {
        const quotationRef = doc(collection(db, 'quotations'));
        quotationIds.push(quotationRef.id);
        openQuotationIdsByRfq[i].push(quotationRef.id);

        const lineItems = makeLineItems(rfqsData[i].productDetails, rfqsData[i].basePrice, j);
        const totalAmount = sumLineItems(lineItems);

        batch.set(quotationRef, {
          rfqId: rfqIds[i],
          vendorId: vendorIds[rfqsData[i].invitedVendorNames[j]],
          lineItems,
          totalAmount,
          taxRate: 18,
          taxAmount: Math.round(totalAmount * 0.18),
          deliveryDays: 10 + j * 3,
          paymentTerms: j === 0 ? 'Net 30' : 'Net 45',
          notes: 'Includes implementation support and standard warranty coverage.',
          status: 'submitted',
          validityDate: Timestamp.fromDate(new Date(2026, 6, 30)),
          submittedAt: Timestamp.fromDate(new Date(2026, 5, 8 + j)),
        });
        docCount++;

        if (docCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          docCount = 0;
        }
      }
    }

    // ========== CURRENT MONTH DATA (June 2026) ==========
    // Add recent POs and Invoices for June
    for (let k = 0; k < 3; k++) {
      const poRef = doc(collection(db, 'purchaseOrders'));
      poIds.push(poRef.id);
      const lineItems = makeLineItems(rfqsData[4].productDetails, rfqsData[4].basePrice, k);
      const junePOAmount = sumLineItems(lineItems);
      
      batch.set(poRef, {
        poNumber: `PO-2026-${String(100 + k).padStart(4, '0')}`,
        quotationId: openQuotationIdsByRfq[4]?.[k] ?? quotationIds[0] ?? 'demo-quotation',
        rfqId: rfqIds[4],
        vendorId: vendorIds[rfqsData[4].invitedVendorNames[k]],
        lineItems,
        subtotal: junePOAmount,
        taxRate: 18,
        taxAmount: Math.round(junePOAmount * 0.18),
        grandTotal: Math.round(junePOAmount * 1.18),
        status: 'confirmed',
        poDate: Timestamp.fromDate(new Date(2026, 5, 1 + k * 2)),
        createdBy: userId,
        createdAt: Timestamp.fromDate(new Date(2026, 5, 1 + k * 2)),
      });
      docCount++;

      // Create invoices for June
      const invoiceRef = doc(collection(db, 'invoices'));
      invoiceIds.push(invoiceRef.id);
      const invoiceAmount = Math.round(junePOAmount * 1.18);
      
      batch.set(invoiceRef, {
        invoiceNumber: `INV-2026-${String(100 + k).padStart(4, '0')}`,
        poId: poIds[poIds.length - 1],
        vendorId: vendorIds[rfqsData[4].invitedVendorNames[k]],
        rfqId: rfqIds[4],
        lineItems,
        subtotal: junePOAmount,
        taxRate: 18,
        taxAmount: Math.round(junePOAmount * 0.18),
        grandTotal: invoiceAmount,
        status: 'sent',
        dueDate: Timestamp.fromDate(new Date(2026, 6, 15 + k)),
        sentAt: Timestamp.fromDate(new Date(2026, 5, 5 + k)),
        createdAt: Timestamp.fromDate(new Date(2026, 5, 5 + k)),
      });
      docCount++;

      if (docCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        docCount = 0;
      }
    }

    // ========== ACTIVITY LOGS ==========
    const vendorNames = Object.keys(vendorIds);
    for (const name of vendorNames) {
      const logRef = doc(collection(db, 'activityLogs'));
      batch.set(logRef, {
        userId,
        userName,
        action: 'CREATED',
        entityType: 'Vendor',
        entityId: vendorIds[name],
        description: `Vendor "${name}" registered in the system`,
        createdAt: Timestamp.fromDate(new Date(2025, 6, 15 + Math.random() * 15)),
      });
      docCount++;
      if (docCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        docCount = 0;
      }
    }

    // Activity logs for RFQs
    for (let i = 0; i < rfqIds.length; i++) {
      const logRef = doc(collection(db, 'activityLogs'));
      batch.set(logRef, {
        userId,
        userName,
        action: 'CREATED',
        entityType: 'RFQ',
        entityId: rfqIds[i],
        description: 'RFQ created for procurement',
        createdAt: Timestamp.fromDate(new Date(2026, i < 4 ? i : 5, 1 + Math.random() * 10)),
      });
      docCount++;
      if (docCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        docCount = 0;
      }
    }

    // Activity logs for Quotations
    for (const qId of quotationIds) {
      const logRef = doc(collection(db, 'activityLogs'));
      batch.set(logRef, {
        userId,
        userName,
        action: 'SUBMITTED',
        entityType: 'Quotation',
        entityId: qId,
        description: 'Quotation submitted by vendor',
        createdAt: Timestamp.fromDate(new Date(2026, Math.floor(Math.random() * 6), 1 + Math.random() * 28)),
      });
      docCount++;
      if (docCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        docCount = 0;
      }
    }

    // Activity logs for Approvals
    for (let i = 0; i < approvalIds.length; i++) {
      const logRef = doc(collection(db, 'activityLogs'));
      batch.set(logRef, {
        userId,
        userName,
        action: 'APPROVED',
        entityType: 'Approval',
        entityId: approvalIds[i],
        description: i % 2 === 0 ? 'Quotation approved' : 'Approval pending manager review',
        createdAt: Timestamp.fromDate(new Date(2026, i < 2 ? i : 5, 25 + Math.random() * 5)),
      });
      docCount++;
      if (docCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        docCount = 0;
      }
    }

    // Activity logs for POs
    for (let i = 0; i < poIds.length; i++) {
      const logRef = doc(collection(db, 'activityLogs'));
      batch.set(logRef, {
        userId,
        userName,
        action: 'CREATED',
        entityType: 'PO',
        entityId: poIds[i],
        description: 'Purchase Order generated and sent to vendor',
        createdAt: Timestamp.fromDate(new Date(2026, i < 4 ? Math.floor(i / 1) : 5, 28 + Math.random() * 3)),
      });
      docCount++;
      if (docCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        docCount = 0;
      }
    }

    // Activity logs for Invoices
    for (let i = 0; i < invoiceIds.length; i++) {
      const logRef = doc(collection(db, 'activityLogs'));
      batch.set(logRef, {
        userId,
        userName,
        action: 'SENT',
        entityType: 'Invoice',
        entityId: invoiceIds[i],
        description: 'Invoice generated from PO',
        createdAt: Timestamp.fromDate(new Date(2026, i < 4 ? Math.floor(i / 1) + 1 : 5, 1 + Math.random() * 15)),
      });
      docCount++;
      if (docCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        docCount = 0;
      }
    }

    // Commit final batch
    if (docCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Seed completed: ${vendorsData.length} vendors, ${rfqIds.length} RFQs, ${quotationIds.length} quotations, ${approvalIds.length} approvals, ${poIds.length} POs, ${invoiceIds.length} invoices`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}
