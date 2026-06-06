import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastViewport } from '@/components/ui/Toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'VendorBridge — Procurement & Vendor Management',
    template: '%s · VendorBridge',
  },
  description:
    'VendorBridge is a modern procurement ERP for managing vendors, RFQs, quotations, approvals, purchase orders and invoices.',
  icons: {
    icon: '/favicon.svg',
  },
};

// Apply persisted avatar preferences before first paint.
const noFlashScript = `
(function(){try{
  document.documentElement.classList.remove('dark');
  var a=localStorage.getItem('vb_avatar');
  if(a){var c=JSON.parse(a);document.documentElement.style.setProperty('--avatar-from',c.from);document.documentElement.style.setProperty('--avatar-to',c.to);}
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ToastViewport />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
