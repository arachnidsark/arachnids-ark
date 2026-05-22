'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useGlobalModules } from '@/providers/module-provider';

export function useModules() {
  const { user, viewMode } = useAuthStore();
  const modules = useGlobalModules();

  const isVisible = useCallback((moduleName?: string) => {
    // Admins see everything only in admin view mode
    if (user?.role === 'admin' && viewMode === 'admin') return true;
    
    if (!moduleName) return true;
    switch (moduleName) {
      case 'courses': return modules.showCourses;
      case 'products': return modules.showProducts;
      case 'consultations': return modules.showConsultations;
      default: return true;
    }
  }, [user?.role, viewMode, modules]);

  return { modules, isVisible };
}
