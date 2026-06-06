'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname();
  
  // Set page titles dynamically client-side
  useEffect(() => {
    if (!pathname) return;
    if (pathname === '/dashboard') {
      document.title = 'Dashboard · VendorBridge';
      return;
    }
    
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const isId = last.length > 15 && /^[a-zA-Z0-9_-]+$/.test(last);
      let pageName = last.replace(/-/g, ' ');
      if (isId && segments.length >= 2) {
        // e.g. "purchase-orders" -> "Purchase Orders Details"
        const parent = segments[segments.length - 2].replace(/-/g, ' ');
        pageName = `${parent} Details`;
      }
      
      // Capitalize first letter of each word
      const formatted = pageName
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      
      document.title = `${formatted} · VendorBridge`;
    }
  }, [pathname]);

  // Hide on Dashboard
  if (!pathname || pathname === '/dashboard' || pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider no-print">
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-primary transition-colors">
        <Home className="h-3.5 w-3.5" />
        <span>Dashboard</span>
      </Link>
      {segments.map((seg, idx) => {
        const href = '/' + segments.slice(0, idx + 1).join('/');
        let label = seg.replace(/-/g, ' ');
        
        // Check if segment is a Firestore document ID (long string)
        const isId = seg.length > 15 && /^[a-zA-Z0-9_-]+$/.test(seg);
        if (isId) {
          label = `Detail (${seg.slice(0, 6)}...)`;
        }
        
        const isLast = idx === segments.length - 1;

        return (
          <div key={href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-text-secondary/60" />
            {isLast ? (
              <span className="text-text-primary font-bold truncate max-w-[200px]">{label}</span>
            ) : (
              <Link href={href} className="hover:text-primary transition-colors">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
