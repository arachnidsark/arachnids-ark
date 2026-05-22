'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const timeoutId = setTimeout(() => {
        router.replace('/');
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [mounted, router]);

  return null;
}
