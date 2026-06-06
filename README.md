<div align="center">
  <img src="public/logo.png" alt="VendorBridge" width="100"/>

  # VendorBridge
  ### Enterprise Procurement & Vendor Management ERP

  <p>Everything your procurement team needs to source, approve, and pay — all in one modern workspace.</p>

  ![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=next.js&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
  ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
  ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

  [🚀 Live Demo](https://vendorbridge.vercel.app) · [🐛 Report Bug](https://github.com/issues) · [✨ Request Feature](https://github.com/issues)
</div>

---

## 🎯 About VendorBridge

VendorBridge is a **production-grade Procurement & Vendor Management ERP** built for modern enterprises. It digitizes the entire procurement lifecycle — from vendor onboarding to invoice settlement — eliminating manual inefficiencies and enabling structured, trackable workflows.

### The Problem
Most organizations still manage procurement through WhatsApp, Excel sheets, and email chains:
- 📉 Lost quotations and missed deadlines
- 🔍 Zero visibility into spending patterns
- ⏳ Delayed approvals and untracked purchase orders
- 📊 No analytics on vendor performance

### The Solution
VendorBridge provides a **centralized, role-based ERP** that handles the complete procurement lifecycle with real-time tracking, automated document generation, and actionable analytics.

---

## 🔄 Procurement Workflow
┌──────────────────────────────────────────────────────────────────────┐
│                    VENDORBRIDGE PROCUREMENT FLOW                      │
└──────────────────────────────────────────────────────────────────────┘
👤 PROCUREMENT OFFICER        👥 VENDORS           ✅ MANAGER/APPROVER
│                           │                        │
▼                           │                        │
┌─────────────┐                    │                        │
│  1. Create  │                    │                        │
│     RFQ     │                    │                        │
│  + Products │                    │                        │
│  + Vendors  │                    │                        │
└──────┬──────┘                    │                        │
│ 📧 Invite Vendors         │                        │
├──────────────────────────►│                        │
│                    ┌──────┴──────┐                 │
│                    │  2. Submit  │                 │
│                    │  Quotation  │                 │
│                    │  + Pricing  │                 │
│                    └──────┬──────┘                 │
│◄───────────────────────────┘                        │
│                                                     │
▼                                                     │
┌─────────────┐                                              │
│  3. Compare │                                              │
│  Quotations │                                              │
│  + Score    │                                              │
└──────┬──────┘                                              │
│ 🔔 Request Approval                                 │
├────────────────────────────────────────────────────►│
│                                              ┌──────┴──────┐
│                                              │ 4. Approve  │
│                                              │    / Reject │
│                                              └──────┬──────┘
│◄───────────────────────────────────────────────────┘
│ ✅ Auto-generate Purchase Order
▼
┌─────────────┐
│  5. Purchase│──── PO-2026-XXXX
│     Order   │──── PDF Export
└──────┬──────┘
▼
┌─────────────┐
│  6. Invoice │──── INV-2026-XXXX
│  Generated  │──── PDF + Print
│             │──── Email Delivery
└──────┬──────┘
▼
┌─────────────┐
│  7. Reports │──── Audit Trail
│  & Analytics│──── Spend Analytics
│             │──── Vendor Performance
└─────────────┘

---

## ✨ Features

| Module | Features |
|--------|----------|
| 🔐 **Auth** | Email/Password + Google OAuth, Role-based access, Session handling |
| 📊 **Dashboard** | Live KPIs, Procurement health score, Spend charts, Activity feed |
| 🏭 **Vendors** | Full profiles, GST + bank details, Performance scoring, Categories |
| 📋 **RFQs** | Multi-step wizard, Dynamic products, Vendor assignment, Deadlines |
| 💬 **Quotations** | Line-item pricing, Auto-calculations, Draft/Submit workflow |
| ⚖️ **Comparison** | Side-by-side view, Smart scoring (price+delivery+rating), Highlights |
| ✅ **Approvals** | Role-based workflow, Remarks, Timeline stepper, Auto PO on approve |
| 📦 **Purchase Orders** | Auto PO numbers, PDF export, Status tracking, Delivery management |
| 🧾 **Invoices** | Professional layout, PDF/Print, Email delivery, Payment tracking |
| 📈 **Reports** | 4 chart types, Date ranges, CSV export, Vendor performance metrics |
| 📝 **Activity Logs** | Full audit trail, Filterable timeline, Real-time updates |

---

## 🎭 Role-Based Access Control
┌──────────────────┬─────────┬──────────┬──────────────────────┬────────┐
│     Feature      │  Admin  │ Manager  │  Procurement Officer │ Vendor │
├──────────────────┼─────────┼──────────┼──────────────────────┼────────┤
│ Dashboard        │   ✅    │    ✅    │          ✅          │   ❌   │
│ Vendor Mgmt      │   ✅    │    👁️   │          ✅          │   ❌   │
│ RFQ Management   │   ✅    │    👁️   │          ✅          │   👁️  │
│ Quotations       │   ✅    │    👁️   │          ✅          │   ✅   │
│ Approvals        │   ✅    │    ✅    │          👁️         │   ❌   │
│ Purchase Orders  │   ✅    │    👁️   │          ✅          │   👁️  │
│ Invoices         │   ✅    │    👁️   │          ✅          │   👁️  │
│ Reports          │   ✅    │    ✅    │          👁️         │   ❌   │
└──────────────────┴─────────┴──────────┴──────────────────────┴────────┘
✅ Full   👁️ View Only   ❌ No Access

---

## 🛠️ Tech Stack
┌─────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE                              │
├──────────────────┬──────────────────────┬───────────────────────┤
│    FRONTEND      │       BACKEND        │       SERVICES        │
├──────────────────┼──────────────────────┼───────────────────────┤
│ Next.js 14       │ Next.js API Routes   │ Firebase Auth         │
│ TypeScript       │ /api/send-invoice    │ Firestore Database    │
│ Tailwind CSS     │ /api/generate-po-no  │ Resend Email          │
│ shadcn/ui        │ /api/generate-inv-no │ jsPDF Generation      │
│ Recharts         │ middleware.ts        │ Vercel Deployment     │
│ Zustand          │ RBAC Guards          │                       │
│ React Hook Form  │ Firestore Rules      │                       │
│ Zod Validation   │                      │                       │
└──────────────────┴──────────────────────┴───────────────────────┘

### Tech Badges

![Next.js](https://img.shields.io/badge/Next.js_14-000?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000?style=flat-square)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=flat-square)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square)
![Recharts](https://img.shields.io/badge/Recharts-FF6384?style=flat-square)
![jsPDF](https://img.shields.io/badge/jsPDF-FF0000?style=flat-square)
![Resend](https://img.shields.io/badge/Resend-000?style=flat-square)
![Vercel](https://img.shields.io/badge/Vercel-000?style=flat-square&logo=vercel&logoColor=white)

---

## 📁 Project Structure
vendorbridge/
├── app/
│   ├── (auth)/
│   │   ├── login/              # Premium split-screen login
│   │   ├── register/           # Multi-field registration
│   │   └── complete-profile/   # Google OAuth profile completion
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + header shell
│   │   ├── dashboard/          # KPIs, charts, activity feed
│   │   ├── vendors/            # Vendor CRUD + performance
│   │   ├── rfqs/               # RFQ wizard + management
│   │   ├── quotations/         # Quote submission + comparison
│   │   ├── approvals/          # Approval workflow
│   │   ├── purchase-orders/    # PO management + PDF
│   │   ├── invoices/           # Invoice + email + PDF
│   │   ├── activity/           # Audit trail
│   │   └── reports/            # Analytics dashboard
│   └── api/
│       ├── send-invoice/       # Resend email integration
│       ├── generate-po-number/ # Atomic PO counter
│       └── generate-invoice-number/ # Atomic invoice counter
├── components/
│   ├── ui/                     # shadcn/ui + Logo components
│   ├── auth/                   # Auth components + Google button
│   └── shared/                 # Shared components
├── lib/
│   ├── firebase.ts             # Firebase config
│   ├── permissions.ts          # RBAC logic
│   ├── formatCurrency.ts       # Indian currency (Lakh/Crore)
│   ├── seedData.ts             # 12-month demo data seeder
│   └── logActivity.ts          # Activity logging utility
├── store/
│   └── authStore.ts            # Zustand global state
├── firestore.rules             # Role-scoped security rules
├── .env.local.example          # Environment template (safe to commit)
└── README.md

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project ([console.firebase.google.com](https://console.firebase.google.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/vendorbridge.git
cd vendorbridge

# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Fill in your Firebase keys in .env.local
```

### Firebase Setup

1. Create Firebase project → Enable **Email/Password** + **Google** auth
2. Create Firestore database in **asia-south1** region
3. Deploy security rules:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

### Run Development

```bash
npm run dev
# http://localhost:3000
```

### Build & Deploy

```bash
# Test production build
npm run build

# Deploy to Vercel
vercel --prod
```

---

## 📦 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/vendorbridge)

1. Push code to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add environment variables from `.env.local.example`
4. Deploy 🚀

---

## 🌱 Demo Data

VendorBridge includes a realistic 12-month procurement dataset:
- **15 vendors** across 10+ categories with full bank & GST details
- **12 RFQs** spanning Jan 2025 – Jun 2026
- **30+ quotations** with competitive pricing
- **10 purchase orders** totaling ₹1.6+ Cr
- **50+ activity logs** across all modules

Load it from the Dashboard banner when you first sign in.

---

## 🤝 Contributing

1. Fork the project
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit: `git commit -m 'Add AmazingFeature'`
4. Push: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for Odoo x GCET Hackathon 2026**

⭐ Star this repo if you found it helpful!

</div>
