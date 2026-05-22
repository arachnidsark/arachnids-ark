'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Sidebar, type SidebarSection } from '@/components/shared/organisms/sidebar';
import { Header } from '@/components/shared/organisms/header';
import { USER_NAV_ITEMS, DASHBOARD_NAV_ITEMS } from '@/constants/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Modal } from '@/components/shared/molecules/modal';
import { LogOut, Layout, Home, ShoppingBag, GraduationCap, Calendar, BookOpen, Heart, Settings } from 'lucide-react';
import { useModules } from '@/hooks/use-modules';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, viewMode } = useAuthStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const { isVisible } = useModules();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }

    // Module visibility guard - Admins bypass this, users are restricted
    if (!isLoading && mounted) {
      const isUserView = user?.role !== 'admin' || viewMode === 'user';
      const isModuleDisabled = isUserView && (
        (pathname.startsWith('/shop') && !isVisible('products')) ||
        (pathname.startsWith('/courses') && !isVisible('courses')) ||
        (pathname.startsWith('/consultation') && !isVisible('consultations')) ||
        (pathname.startsWith('/dashboard/courses') && !isVisible('courses')) ||
        (pathname.startsWith('/dashboard/consultations') && !isVisible('consultations'))
      );

      setHasAccessError(!!isModuleDisabled);
    }
  }, [pathname, isVisible, router, isLoading, user, viewMode, mounted]);

  const [hasAccessError, setHasAccessError] = useState(false);

  const isDashboard = pathname.startsWith('/dashboard');
  const showSidebar = isAuthenticated && !isLoading;

  const desktopSidebarSections: SidebarSection[] = [
    {
      label: "Explore",
      items: USER_NAV_ITEMS.filter(item => isVisible(item.module)).map(item => ({
        ...item
      }))
    },
    {
      label: "Dashboard",
      items: DASHBOARD_NAV_ITEMS.filter(item => isVisible(item.module)).map(item => ({
        ...item
      }))
    }
  ];

  const mobileSidebarSections: SidebarSection[] = [
    {
      label: "Account",
      items: DASHBOARD_NAV_ITEMS.filter(item => isVisible(item.module)).map(item => ({
        ...item
      }))
    }
  ];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const branding = {
    logo: <img src="/logo.png" alt="ArachnidsArk" className="h-20 w-auto object-contain" />,
    smallLogo: <img src="/logo-small.png" alt="AA" className="h-18 w-18 object-contain" />
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen md:h-[100dvh] md:overflow-hidden bg-background">
      {/* Universal Sidebar (Visible site-wide when logged in) */}
      {showSidebar && (
        <aside className="hidden md:block shrink-0">
          <Sidebar
            {...branding}
            sections={desktopSidebarSections}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            footerAction={{
              label: "Logout",
              icon: LogOut,
              onClick: handleLogout
            }}
          />
        </aside>
      )}

      {/* Mobile Sidebar (Visible site-wide when logged in) */}
      {showSidebar && (
        <Modal
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
          variant="side-left"
          noPadding
          showHeader={false}
          showCloseButton={false}
        >
          <Sidebar
            {...branding}
            sections={mobileSidebarSections}
            isCollapsed={false}
            onToggleCollapse={() => setIsMobileOpen(false)}
            onItemClick={() => setIsMobileOpen(false)}
            isMobile={true}
            footerAction={{
              label: "Logout",
              icon: LogOut,
              onClick: handleLogout
            }}
          />
        </Modal>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden relative">
        {/* Navbar replaces Header for public views, but we use the unified Header logic when in Dashboard? 
            Actually, the user wanted unification. I'll keep the Navbar for now but maybe it can be merged. 
            For now, let's keep the Navbar and add the menu trigger to it if showSidebar is true.
        */}
        <Navbar
          isSidebarCollapsed={isSidebarCollapsed}
          onMenuClick={() => setIsMobileOpen(true)}
        />

        <main ref={mainRef} className="flex-1 md:overflow-y-auto pb-20 md:pb-0 py-4">
          <div className="w-full">
            {hasAccessError ? (
              <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="h-20 w-20 rounded-full bg-brand-gold/10 flex items-center justify-center mb-6">
                  <ShoppingBag className="h-10 w-10 text-brand-gold" />
                </div>
                <h1 className="text-2xl font-bold mb-3 italic uppercase tracking-tighter text-foreground">Page Not Available</h1>
                <p className="text-muted-foreground mb-8 max-w-md text-sm">
                  This feature is currently unavailable or has been restricted by the administrator.
                  Please check back later or explore other sections of the platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => router.push('/shop')}
                    className="px-8 h-12 rounded-xl bg-brand-red text-white font-bold uppercase tracking-widest text-[10px] hover:bg-brand-red/90 transition-all shadow-lg shadow-brand-red/20"
                  >
                    Back to Shop
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-8 h-12 rounded-xl border border-border text-foreground font-bold uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
                  >
                    My Dashboard
                  </button>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
          {!isDashboard && !hasAccessError && <Footer />}
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
