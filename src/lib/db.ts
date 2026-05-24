'use client';

/**
 * Db — Synchronous-looking wrapper around DbClient for backward compatibility.
 * 
 * For READS: Returns empty arrays/null immediately, then the caller should use
 *            the async version in useEffect. This file provides both sync-looking
 *            stubs AND the async methods from DbClient.
 * 
 * For WRITES: Fire-and-forget async calls (update/create/delete).
 *             The caller typically updates local state optimistically.
 * 
 * This module is the DROP-IN replacement for LocalStorage.
 * Every page that used to call LocalStorage.xyz() can now call Db.xyz()
 * with minimal changes.
 */

const API_BASE = '/api/db';

const COLLECTION_MAP: Record<string, string> = {
  users: 'users',
  products: 'products',
  orders: 'orders',
  courses: 'courses',
  enrollments: 'enrollments',
  bookings: 'bookings',
  notifications: 'notifications',
  reviews: 'reviews',
  care_guides: 'care-guides',
  system_settings: 'system-settings',
  consultation_settings: 'consultation-settings',
  coupons: 'coupons',
  categories: 'categories',
};

function ep(collection: string): string {
  return COLLECTION_MAP[collection] || collection;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  return res.json();
}

export const Db = {
  // ---- Async reads (use these in useEffect) ----
  
  async getAll<T>(collection: string, params?: Record<string, string>): Promise<T[]> {
    const url = new URL(`${API_BASE}/${ep(collection)}`, window.location.origin);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('_t', Date.now().toString());
    try {
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  },

  async getById<T>(collection: string, id: string): Promise<T | null> {
    try {
      const url = new URL(`${API_BASE}/${ep(collection)}/${id}`, window.location.origin);
      url.searchParams.set('_t', Date.now().toString());
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  // ---- Writes (fire-and-forget is fine since callers update local state) ----

  async create<T>(collection: string, item: any): Promise<T> {
    return fetchJson<T>(`${API_BASE}/${ep(collection)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  },

  async update<T>(collection: string, id: string, updates: Partial<T>): Promise<T | null> {
    try {
      const res = await fetch(`${API_BASE}/${ep(collection)}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async delete(collection: string, id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${ep(collection)}/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch { return false; }
  },

  // ---- Settings singletons ----

  async getSettings<T>(collection: string): Promise<T | null> {
    try {
      const url = new URL(`${API_BASE}/${ep(collection)}`, window.location.origin);
      url.searchParams.set('_t', Date.now().toString());
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async updateSettings<T>(collection: string, updates: Partial<T>): Promise<T | null> {
    try {
      const res = await fetch(`${API_BASE}/${ep(collection)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async saveSettings<T>(collection: string, data: T): Promise<T | null> {
    try {
      const res = await fetch(`${API_BASE}/${ep(collection)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async validateCoupon(code: string, userId: string, cartItems: any[], subtotal: number): Promise<{ valid: boolean; error?: string; discountAmount?: number; coupon?: any }> {
    try {
      const res = await fetch(`${API_BASE}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId, cartItems, subtotal }),
      });
      if (!res.ok) return { valid: false, error: 'Network error validating coupon' };
      return await res.json();
    } catch {
      return { valid: false, error: 'Failed to validate coupon' };
    }
  },
};
