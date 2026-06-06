import { Sidebar, MobileNav } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { RouteGuard } from '@/components/layout/RouteGuard';
import { CommandPalette } from '@/components/CommandPalette';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <CommandPalette />
      <ShortcutsHelp />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/30 to-orange-100/50">
        <div className="fixed top-[-10%] left-[-5%] w-96 h-96 bg-orange-300/20 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="fixed top-[20%] right-[-10%] w-80 h-80 bg-amber-200/20 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="fixed bottom-[10%] left-[20%] w-72 h-72 bg-orange-200/15 rounded-full blur-3xl pointer-events-none z-0" />
        
        <Sidebar />
        <div className="lg:pl-64">
          <Header />
          <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
            <Breadcrumbs />
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </RouteGuard>
  );
}
