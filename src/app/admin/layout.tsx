'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar, type SidebarSection } from '@/components/shared/organisms/sidebar';
import { Header } from '@/components/shared/organisms/header';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import { Modal } from '@/components/shared/molecules/modal';
import { useNotificationStore } from '@/store/notification-store';
import { NotificationCenter } from '@/components/shared/notification-center';
import { useModules } from '@/hooks/use-modules';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount, loadNotifications } = useNotificationStore();
  const { isVisible } = useModules();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications(user.id);
    }
  }, [user, loadNotifications]);

  // Only evaluate access once mounting and loading are complete
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (mounted && !isLoading) {
      if (!isAuthenticated) {
        const timeoutId = setTimeout(() => {
          router.replace('/login');
        }, 0);
        return () => clearTimeout(timeoutId);
      } else {
        setHasAccess(user?.role === 'admin');
      }
    }
  }, [mounted, isLoading, isAuthenticated, user, router]);

  if (!mounted || isLoading || (isAuthenticated && hasAccess === null)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
      </div>
    );
  }

  // Strict Role Check for Admin Routes
  if (isAuthenticated && hasAccess === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <LayoutDashboard className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2 italic uppercase tracking-tighter">Page Not Available</h1>
        <p className="text-muted-foreground mb-8 max-w-md text-sm">
          You do not have the required administrative permissions to access this area.
          Access to these resources is strictly restricted.
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
            Home
          </button>
        </div>
      </div>
    );
  }

  const sidebarSections: SidebarSection[] = [
    {
      label: "Management",
      items: ADMIN_NAV_ITEMS.filter(item => isVisible(item.module)).map(item => ({
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

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block shrink-0 relative z-50">
        <Sidebar
          {...branding}
          sections={sidebarSections}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          footerAction={{
            label: "Logout",
            icon: LogOut,
            onClick: handleLogout
          }}
        />
      </aside>

      {/* Mobile Sidebar */}
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
          sections={sidebarSections}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          showMobileMenu
          onMenuClick={() => setIsMobileOpen(true)}
          user={{
            name: user?.name || "",
            email: user?.email || "",
            image: user?.avatar || ""
          }}
          onLogout={handleLogout}
          onNotificationClick={() => setShowNotifications(true)}
          unreadCount={unreadCount}
        />
        <NotificationCenter open={showNotifications} onOpenChange={setShowNotifications} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 py-4 custom-scrollbar">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
