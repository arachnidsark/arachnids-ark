'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ClipboardList, Upload, Package, ChevronDown, ChevronUp, Check, Copy, Truck, MapPin, Phone, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/shared/atoms/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/molecules/status-badge';
import { SectionHeader } from '@/components/shared/molecules/section-header';
import { EmptyState } from '@/components/shared/molecules/empty-state';
import { useAuthStore } from '@/store/auth-store';
import { Db } from '@/lib/db';
import type { Order, SystemSettings } from '@/types';
import { formatPrice } from '@/constants/pricing';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loading } from '@/components/shared/molecules/loading';
import { cn } from '@/lib/utils';

export default function MyOrdersPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [selectedUPI, setSelectedUPI] = useState<string>('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [copiedUPI, setCopiedUPI] = useState(false);

  useEffect(() => {
      (async () => {
      if (!user) return;
      setIsLoading(true);
      const allOrders = await Db.getAll<Order>('orders');
      const data = allOrders
        .filter(o => o.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setOrders(data);
  
      const settingsData = await Db.getSettings<SystemSettings>('system_settings');
      if (settingsData) {
        setSystemSettings(settingsData);
        const defaultUPI = settingsData.upiIds.find(u => u.isDefault) || settingsData.upiIds[0];
        if (defaultUPI) setSelectedUPI(defaultUPI.value);
      }
      
      setIsLoading(false);
  
      // Auto-expand if ID is in search params
      const orderId = searchParams.get('id');
      if (orderId) {
        setExpandedOrders(new Set([orderId]));
        // Scroll to the order element after a small delay
        setTimeout(() => {
          const el = document.getElementById(`order-${orderId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      })();
  }, [user, searchParams]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedOrders);
    const isExpanding = !newExpanded.has(id);

    if (!isExpanding) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedOrders(newExpanded);

    if (isExpanding) {
      setTimeout(() => {
        const el = document.getElementById(`order-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350); // Delay to allow the expand animation to complete
    }
  };



  if (isLoading) {
    return <Loading text="Retrieving your collection history..." />;
  }

  return (
    <div>

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders yet" description="Browse our shop and start adding exotic species to your cart!" />
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <motion.div
                key={order.id}
                id={`order-${order.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-border bg-card/40 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-0">
                    {/* Order Header */}
                    <div 
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors group"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-brand-red/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Package className="h-5 w-5 text-brand-red" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider">Order #{order.id.split('-')[0]}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        {order.status !== 'order_completed' && order.status !== 'order_cancelled' && (
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-brand-red uppercase tracking-wider bg-brand-red/10 px-3 py-1 rounded-full w-fit">
                            Check Email for Updates
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t border-border/10 sm:border-0 pt-4 sm:pt-0">
                        <div className="text-left sm:text-right mr-2">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Amount</p>
                          <p className="text-base sm:text-lg font-bold text-brand-gold leading-none">{formatPrice(order.totalPrice)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <div className="p-2 text-muted-foreground group-hover:text-brand-gold transition-colors">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Details (Expanded) */}
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-border bg-accent/5 p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Items List */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Items in Order</h4>
                            <div className="space-y-3">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-center">
                                  <div className="h-10 w-10 rounded border border-border bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {item.image ? (
                                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-bold uppercase truncate">{item.name}</p>
                                      {item.status && <StatusBadge status={item.status} className="scale-[0.6] origin-left shrink-0" />}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                      {item.type === 'product' ? (item.metadata?.size || 'N/A') : item.type} × {item.quantity}
                                    </p>
                                  </div>
                                  <p className="text-xs font-bold text-brand-gold">{formatPrice(item.price * item.quantity)}</p>
                                </div>
                              ))}
                            </div>
                            <div className="pt-4 border-t border-border/30 space-y-1.5 px-1 max-w-sm">
                              <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatPrice(order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0))}</span>
                              </div>
                              {order.discountAmount && order.discountAmount > 0 ? (
                                <div className="flex justify-between text-[11px] text-emerald-500 font-medium">
                                  <span>Discount ({order.coupon?.code})</span>
                                  <span>-{formatPrice(order.discountAmount)}</span>
                                </div>
                              ) : null}
                              <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>Shipping</span>
                                <span>{formatPrice(order.shippingCharge || 0)}</span>
                              </div>
                              <div className="flex justify-between text-xs font-bold text-brand-gold pt-1 border-t border-border/50 mt-1">
                                <span>Total Amount</span>
                                <span>{formatPrice(order.totalPrice)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Shipping Info */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Delivery Details</h4>
                            <div className="text-xs space-y-1">
                              <p><span className="text-muted-foreground">Recipient:</span> {order.deliveryName}</p>
                              <p><span className="text-muted-foreground">Phone:</span> {order.deliveryPhone}</p>
                              <p><span className="text-muted-foreground">Address:</span> {order.deliveryAddress}</p>
                              {order.message && (
                                <p className="mt-2 p-2 bg-background/50 rounded border border-border italic">
                                  &quot;{order.message}&quot;
                                </p>
                              )}
                            </div>
                            {order.adminNote && (
                              <div className="p-2 bg-brand-gold/10 border border-brand-gold/20 rounded text-xs text-brand-gold">
                                <span className="font-bold">Admin Note:</span> {order.adminNote}
                              </div>
                            )}

                            {(order.trackingId || order.courierPartner) && (
                              <div className="p-3 bg-accent/20 border border-border rounded-xl space-y-2 mt-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-brand-gold uppercase tracking-widest">
                                  <Truck className="h-4 w-4" /> Shipping Updates
                                </div>
                                <div className="text-[11px] space-y-1 pl-6">
                                  {order.courierPartner && <p><span className="text-muted-foreground uppercase tracking-tighter mr-2">Courier:</span> {order.courierPartner}</p>}
                                  {order.trackingId && <p><span className="text-muted-foreground uppercase tracking-tighter mr-2">Tracking ID:</span> <span className="font-mono text-brand-gold">{order.trackingId}</span></p>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end pt-2">
                          {order.status !== 'order_completed' && order.status !== 'order_cancelled' && (
                            <div className="p-3 px-5 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex flex-col items-end gap-1">
                              <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest">
                                {order.status === 'awaiting_payment' ? 'Payment Required' : 'Order in Progress'}
                              </p>
                              <p className="text-[9px] text-muted-foreground italic">
                                Please check your email for payment instructions and further updates.
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Order Status Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-12 p-6 rounded-2xl bg-accent/5 border border-border"
      >
        <h3 className="font-heading text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-brand-gold" />
          Understanding Order Statuses
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-tighter">Pending</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">Order request sent. Awaiting admin approval to proceed to payment.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Awaiting Payment</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">Check your email for payment details. Reply to that email with your payment screenshot.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-green-400 uppercase tracking-tighter">Payment Verified</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">Payment verified! Your order is being packed and prepared for safe transit.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">Order Shipped</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">Your order has been shipped. You can find the Tracking ID and Courier details in the order info.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Order Completed</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">The order has been successfully delivered and finalized.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Order Cancelled</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">The order was not processed. This can happen due to stock issues or payment verification failure.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
