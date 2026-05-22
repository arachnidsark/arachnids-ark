'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingBag, LayoutDashboard, Home, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { useModules } from '@/hooks/use-modules';

export default function NotFound() {
  const router = useRouter();
  const { user, isAuthenticated, viewMode } = useAuthStore();
  const { isVisible } = useModules();

  const isAdminView = user?.role === 'admin' && viewMode === 'admin';

  const getDashboardHref = () => {
    if (!isAuthenticated) return '/login';
    return isAdminView ? '/admin' : '/dashboard';
  };

  const getDashboardLabel = () => {
    if (!isAuthenticated) return 'Sign In';
    return isAdminView ? 'Admin Dashboard' : 'My Dashboard';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-red/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-[120px] -z-10" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="h-24 w-24 rounded-3xl bg-brand-red/10 flex items-center justify-center mb-8 mx-auto rotate-12">
          <AlertTriangle className="h-12 w-12 text-brand-red" />
        </div>

        <h1 className="text-6xl font-black italic uppercase tracking-tighter mb-4 text-foreground">
          404
        </h1>
        <h2 className="text-2xl font-bold mb-4 uppercase tracking-tight">Page Not Found</h2>
        
        <p className="text-muted-foreground mb-10 text-sm leading-relaxed">
          The page you are looking for doesn't exist or has been moved. 
          Don't worry, even the best spiders lose their way sometimes.
        </p>

        <div className={cn("grid gap-4", (isAdminView || !isVisible('products')) ? "grid-cols-1" : "sm:grid-cols-2")}>
          <Link
            href={getDashboardHref()}
            className="flex items-center justify-center gap-2 px-6 h-14 rounded-2xl bg-brand-red text-white font-bold uppercase tracking-widest text-[10px] hover:bg-brand-red/90 transition-all shadow-xl shadow-brand-red/20"
          >
            <LayoutDashboard className="h-4 w-4" />
            {getDashboardLabel()}
          </Link>
          
          {!isAdminView && isVisible('products') && (
            <Link
              href="/shop"
              className="flex items-center justify-center gap-2 px-6 h-14 rounded-2xl border border-border bg-card text-foreground font-bold uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
            >
              <ShoppingBag className="h-4 w-4" />
              Return to Shop
            </Link>
          )}
        </div>

        <button
          onClick={() => router.back()}
          className="mt-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-brand-gold transition-colors flex items-center justify-center gap-2 mx-auto"
        >
          <Home className="h-3 w-3" />
          Go Back
        </button>
      </motion.div>
    </div>
  );
}
