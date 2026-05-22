'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Menu, Bell, LogOut, Shield, ClipboardList, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/shared/molecules/modal';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { USER_NAV_ITEMS, DASHBOARD_NAV_ITEMS, MOBILE_NAV_ITEMS, PAGE_TITLES } from '@/constants/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import { NotificationCenter } from '../shared/notification-center';
import { CartDrawer } from '../shared/cart-drawer';
import { useModules } from '@/hooks/use-modules';

export function Navbar({ 
  isSidebarCollapsed = false,
  onMenuClick
}: { 
  isSidebarCollapsed?: boolean;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, isLoading, viewMode, setViewMode } = useAuthStore();
  const { unreadCount, loadNotifications } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isVisible } = useModules();

  useEffect(() => {
    setMounted(true);
    if (user) {
      loadNotifications(user.id);
    }
  }, [user, loadNotifications]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  if (!mounted) return null;

  const showSidebar = isAuthenticated && !isLoading;

  return (
    <>
      {user?.role === 'admin' && viewMode === 'user' && (
        <div className="bg-gradient-to-r from-brand-red via-brand-gold to-brand-red-light text-white text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-2 select-none relative z-50 shadow-md">
          <span>You are viewing the site as a User.</span>
          <button
            onClick={() => {
              setViewMode('admin');
              router.push('/admin');
            }}
            className="underline hover:text-white/80 transition-colors uppercase tracking-wider font-extrabold ml-1 border border-white/20 bg-white/10 px-2 py-0.5 rounded cursor-pointer"
          >
            Switch back to Admin
          </button>
        </div>
      )}
      <header
        className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300 shrink-0"
      >
        <div className={`flex h-16 items-center justify-between ${showSidebar ? 'w-full px-4 md:px-6' : 'container mx-auto px-4'
          }`}>
          {/* Left side: Mobile Menu or Logo */}
          <div className="flex items-center gap-4">
            {showSidebar ? (
              /* Mobile Menu Toggle - Left side for authenticated users */
              <div className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="border border-border rounded-lg"
                  onClick={onMenuClick}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              /* Logo - Left side for guests */
              <Link href="/" className="flex items-center group shrink-0">
                <div className="w-24 xs:w-32 sm:w-60 flex items-center justify-start overflow-hidden">
                  <img src="/logo.png" alt="ArachnidsArk" className="w-full h-auto object-contain object-left" />
                </div>
              </Link>
            )}

            {/* Desktop Navigation for Guests */}
            {!isAuthenticated && !isLoading && (
              <nav className="hidden md:flex items-center gap-1">
                {USER_NAV_ITEMS.filter(item => isVisible(item.module)).map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                        ? 'text-brand-gold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        }`}
                    >
                      <span className="font-heading uppercase tracking-widest text-[10px]">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="navbar-indicator"
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-gold rounded-full"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Dynamic Page Title */}
            {PAGE_TITLES[pathname] && (
              <div className="flex items-center animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-[9px] xs:text-[10px] sm:text-sm font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-foreground/80 whitespace-nowrap">
                  {PAGE_TITLES[pathname]}
                </span>
              </div>
            )}
          </div>

          {/* Right side utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <CartDrawer />

            {showSidebar && user ? (
              <>
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative border border-border rounded-lg"
                  onClick={() => setShowNotifications(true)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-brand-red border-0">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
                <NotificationCenter open={showNotifications} onOpenChange={setShowNotifications} />

                {/* Clickable Profile Section */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border ml-1 sm:ml-2 hover:bg-accent/50 transition-all p-1 px-2 group">
                        <Avatar className="h-8 w-8 transition-transform group-active:scale-95 border border-border">
                          {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                          <AvatarFallback className="bg-brand-red text-white font-bold text-xs uppercase">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-64 bg-card border-border shadow-xl mt-2 p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-3 border-b border-border/50 mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold truncate text-foreground">{user.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                      </div>
                      <div className="sm:hidden">
                        <ThemeToggle />
                      </div>
                    </div>

                    <DropdownMenuItem 
                      onClick={() => router.push(user.role === 'admin' ? '/admin/profile' : '/dashboard/profile')} 
                      className="gap-2 cursor-pointer focus:bg-brand-red/10 focus:text-brand-red rounded-lg py-2"
                    >
                      <Settings className="h-4 w-4" /> Profile Settings
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <DropdownMenuItem 
                        onClick={() => {
                          const newMode = viewMode === 'user' ? 'admin' : 'user';
                          setViewMode(newMode);
                          router.push(newMode === 'admin' ? '/admin' : '/');
                        }} 
                        className="gap-2 cursor-pointer text-brand-gold focus:bg-brand-gold/10 focus:text-brand-gold rounded-lg py-2"
                      >
                        <Shield className="h-4 w-4" /> {viewMode === 'user' ? 'Switch to Admin View' : 'Switch to User View'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-border/50 my-2" />
                    <DropdownMenuItem onClick={handleLogout} className="gap-2 text-brand-red focus:bg-brand-red focus:text-white cursor-pointer rounded-lg py-2">
                      <LogOut className="h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm" className="bg-brand-red text-white font-bold h-9">Login</Button>
              </Link>
            )}

            {/* Guest Mobile Menu Toggle */}
            {!isAuthenticated && !isLoading && (
              <div className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="border border-border rounded-lg"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                <Modal 
                  isOpen={isMobileMenuOpen} 
                  onClose={() => setIsMobileMenuOpen(false)}
                  variant="side-drawer-left"
                  noPadding
                  title={(
                    <div className="vibe-heading text-lg font-bold">
                      Arachnids<span className="text-gradient">Ark</span>
                    </div>
                  )}
                >
                  <div className="p-4 space-y-1">
                    <div className="flex items-center justify-between px-4 py-2 mb-2 border-b border-border/50">
                      <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Appearance</span>
                      <ThemeToggle />
                    </div>
                    {USER_NAV_ITEMS.filter(item => isVisible(item.module)).map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent/50 text-sm font-medium"
                      >
                        <item.icon className="h-4 w-4 text-brand-gold" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </Modal>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
