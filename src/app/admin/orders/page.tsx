'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShoppingBag,
  Package,
  Phone,
  MapPin,
  Truck,
  ExternalLink,
  Eye,
  Save,
  ChevronRight,
  CheckCircle2,
  Clock,
  CreditCard,
  AlertCircle,
  XCircle,
  Undo2,
  Search,
  User as UserIcon,
  Plus,
  Trash2,
  Edit2,
  Settings2,
  Mail,
  RefreshCcw
} from 'lucide-react';
import { Select as SharedSelect } from '@/components/shared/atoms/select';
import { Product, Course, ConsultationSettings, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { TableMolecule } from '@/components/shared/molecules/table';
import { StatusBadge } from '@/components/shared/molecules/status-badge';
import { SectionHeader } from '@/components/shared/molecules/section-header';
import { Loading } from '@/components/shared/molecules/loading';
import { Modal } from '@/components/shared/molecules/modal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/shared/atoms/input';
import { Separator } from '@/components/ui/separator';
import { Db } from '@/lib/db';
import { useNotificationStore } from '@/store/notification-store';
import { ALL_STATUSES, STATUS_CONFIG } from '@/constants/statuses';
import { formatPrice } from '@/constants/pricing';
import { toast } from 'sonner';
import type { Order, OrderStatus, CourseEnrollment, SystemSettings, ConsultationBooking, User } from '@/types';
import { cn } from '@/lib/utils';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [courierPartner, setCourierPartner] = useState('');
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [orderToCancel, setOrderToCancel] = useState<{ id: string, userId: string } | null>(null);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ id: string, status: OrderStatus, userId: string } | null>(null);
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editingOrderItems, setEditingOrderItems] = useState<OrderItem[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [editingShippingCharge, setEditingShippingCharge] = useState<number>(0);
  const [updateSummary, setUpdateSummary] = useState('');
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);
  const { addNotification } = useNotificationStore();
  const searchParams = useSearchParams();

  useEffect(() => {
      (async () => {
      setIsLoading(true);
      const allOrders = (await Db.getAll<Order>('orders')).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrders(allOrders);
      setCatalogProducts(await Db.getAll<Product>('products'));
      setCatalogCourses(await Db.getAll<Course>('courses'));
      setTimeout(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(false);
      }, 300);
  
      // Auto-select if ID is in search params
      const orderId = searchParams.get('id');
      if (orderId) {
        const order = allOrders.find(o => o.id === orderId);
        if (order) {
          setSelectedOrder(order);
          setTrackingId(order.trackingId || '');
          setCourierPartner(order.courierPartner || '');
        }
      }
      })();
  }, [searchParams]);

  useEffect(() => {
    if (selectedOrder) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrackingId(selectedOrder.trackingId || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCourierPartner(selectedOrder.courierPartner || '');
    }
  }, [selectedOrder]);

  const updateStatus = async (id: string, status: OrderStatus, userId: string, forceResend: boolean = false) => {
    const existingOrders = await Db.getAll<Order>('orders');
    const orderToUpdate = existingOrders.find(o => o.id === id);

    if (orderToUpdate?.status === 'order_cancelled') {
      toast.error('Cannot change status of a cancelled order');
      return;
    }

    if (status === 'order_shipped' && orderToUpdate && !orderToUpdate.trackingId) {
      toast.error('Please enter tracking details before marking as shipped');
      setSelectedOrder(orderToUpdate);
      return;
    }

    if (status === 'order_cancelled') {
      setOrderToCancel({ id, userId });
      setCancellationReason('');
      setIsCancellationModalOpen(true);
      return;
    }

    // Smart Email Logic
    if (orderToUpdate && !forceResend) {
      const oldIndex = ALL_STATUSES.indexOf(orderToUpdate.status);
      const newIndex = ALL_STATUSES.indexOf(status);
      const isBackward = newIndex < oldIndex;
      const alreadySent = orderToUpdate.emailsSent?.includes(status);

      if (isBackward || alreadySent) {
        setPendingStatusUpdate({ id, status, userId });
        setIsResendModalOpen(true);
        return;
      }
    }

    executeStatusUpdate(id, status, userId, forceResend);
  };

  const executeStatusUpdate = async (id: string, status: OrderStatus, userId: string, sendEmail: boolean = true) => {
    await Db.update<Order>('orders', id, { status, updatedAt: new Date().toISOString() });
    const updatedOrders = (await Db.getAll<Order>('orders')).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(updatedOrders);

    const order = updatedOrders.find(o => o.id === id);

    // AUTOMATIC ENROLLMENT & BOOKING
    const paidStatuses: OrderStatus[] = ['payment_verified', 'order_shipped', 'order_completed'];
    if (order && paidStatuses.includes(status)) {
      const newlyUnlockedCourses: string[] = [];

      for (const item of order.items) {
        if (item.type === 'course') {
          const enrollments = await Db.getAll<CourseEnrollment>('enrollments');
          const alreadyCreated = enrollments.some((e: CourseEnrollment) => e.orderId === order.id && e.courseId === item.id);

          if (!alreadyCreated) {
            await Db.create<CourseEnrollment>('enrollments', {
              id: `enr-${Date.now()}-${item.id}`,
              userId,
              userName: order.userName,
              userEmail: order.userEmail,
              courseId: item.id,
              courseTitle: item.name,
              status: 'enrolled',
              totalPrice: item.price,
              orderId: order.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } as CourseEnrollment);

            newlyUnlockedCourses.push(item.name);
          }
        } else if (item.type === 'consultation') {
          const bookings = await Db.getAll<ConsultationBooking>('bookings');
          const alreadyCreated = bookings.some((b: ConsultationBooking) => b.orderId === order.id);

          if (!alreadyCreated) {
            const consultationItems = order.items.filter(i => i.type === 'consultation');
            const totalConsultationPrice = consultationItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

            // Use the first item for top-level metadata defaults
            const firstItem = consultationItems[0];

            await Db.create<ConsultationBooking>('bookings', {
              id: `bk-${Date.now()}-${order.id}`,
              userId,
              userName: order.userName,
              userEmail: order.userEmail,
              status: 'payment_verified',
              duration: firstItem.metadata?.duration || 30,
              urgency: (firstItem.metadata?.urgency as any) || 'normal',
              query: firstItem.metadata?.query || 'Purchased via cart',
              slotId: 'TBD',
              slotDate: 'TBD',
              slotTime: 'TBD',
              totalPrice: totalConsultationPrice,
              orderId: order.id,
              items: consultationItems.map(i => ({
                duration: i.metadata?.duration || 30,
                quantity: i.quantity,
                label: i.metadata?.label || 'Expert Consultation',
                basePrice: i.price,
                urgency: i.metadata?.urgency || 'normal',
                status: 'payment_verified'
              })),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } as ConsultationBooking);
            toast.success(`${consultationItems.length} consultation(s) added to a new booking`);
          }
        }
      }

      // Trigger grouped course unlocked email
      if (newlyUnlockedCourses.length > 0) {
        fetch('/api/emails/course-unlocked', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: order.userEmail,
            userName: order.userName,
            courses: newlyUnlockedCourses,
          })
        })
          .then(() => toast.success(`Unlocked ${newlyUnlockedCourses.length} course(s) and sent notification`))
          .catch(console.error);
      }
    }

    // EMAIL NOTIFICATIONS
    if (order && sendEmail) {
      if (status === 'payment_verified') {
        sendEmailNotification(order, 'payment-verified');
      } else if (status === 'order_shipped') {
        sendEmailNotification(order, 'order-shipped');
      } else if (status === 'awaiting_payment') {
        resendPaymentEmail(order);
      }
    }

    // Update selected order if open
    if (selectedOrder?.id === id) {
      setSelectedOrder(order || null);
    }

    addNotification({
      userId,
      title: 'Order Status Updated',
      message: `Your order status has been updated to ${status.replace(/_/g, ' ')}`,
      type: 'info',
      link: `/dashboard/orders?id=${id}`,
    });

    toast.success('Status updated');
    setIsResendModalOpen(false);
    setPendingStatusUpdate(null);
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel || !cancellationReason.trim()) {
      toast.error('Please enter a cancellation reason');
      return;
    }

    const { id, userId } = orderToCancel!;
    await Db.update<Order>('orders', id, {
      status: 'order_cancelled',
      cancellationReason,
      updatedAt: new Date().toISOString()
    });

    const updatedOrders = (await Db.getAll<Order>('orders')).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(updatedOrders);

    const order = updatedOrders.find(o => o.id === id);

    if (order) {
      sendEmailNotification(order, 'order-cancelled');
      addNotification({
        userId,
        title: 'Order Cancelled',
        message: `Your order #${id.split('-')[0]} has been cancelled. Reason: ${cancellationReason}`,
        type: 'error',
        link: `/dashboard/orders?id=${id}`,
      });
    }

    if (selectedOrder?.id === id) {
      setSelectedOrder(order || null);
    }

    setIsCancellationModalOpen(false);
    setOrderToCancel(null);
    toast.success('Order cancelled and customer notified');
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE order #${selectedOrder.id.split('-')[0]}? This cannot be undone.`)) return;

    try {
      const res = await Db.delete('orders', selectedOrder.id);
      if (res) {
        toast.success('Order permanently deleted');
        setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
        setSelectedOrder(null);
      } else {
        toast.error('Failed to delete order');
      }
    } catch (err) {
      toast.error('Failed to delete order');
    }
  };

  const sendEmailNotification = async (order: Order, type: string) => {
    fetch(`/api/emails/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        adminEmail: (await Db.getAll<User>('users')).find(u => u.role === 'admin')?.email || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'arachnidsark.store@gmail.com'
      })
    })
      .then(async () => {
        toast.success(`Notification email sent to customer!`);
        // Track email sent
        const existingEmails = order.emailsSent || [];
        const statusMap: Record<string, OrderStatus> = {
          'payment-verified': 'payment_verified',
          'order-shipped': 'order_shipped',
          'order-cancelled': 'order_cancelled'
        };
        const currentStatus = statusMap[type];
        if (currentStatus && !existingEmails.includes(currentStatus)) {
          await Db.update<Order>('orders', order.id, {
            emailsSent: [...existingEmails, currentStatus]
          });
        }
      })
      .catch(err => {
        console.error(`Failed to send email:`, err);
        toast.error(`Failed to send email notification`);
      });
  };

  const resendPaymentEmail = async (order: Order) => {
    const settingsData = await Db.getSettings<SystemSettings>('system_settings');
    if (settingsData) {
      const adminUsers = await Db.getAll<User>('users');
      fetch('/api/emails/order-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order,
          paymentDetails: {
            upiIds: settingsData.upiIds,
            bankDetails: settingsData.bankDetails,
            paymentInstructions: settingsData.paymentInstructions
          },
          adminEmail: adminUsers.find(u => u.role === 'admin')?.email || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'arachnidsark.store@gmail.com'
        })
      })
        .then(() => toast.success('Payment instruction email resent!'))
        .catch(err => {
          console.error('Failed to resend email:', err);
          toast.error('Failed to resend email');
        });
    }
  };

  const handleResendEmail = async (order: Order) => {
    if (['pending', 'awaiting_payment'].includes(order.status)) {
      resendPaymentEmail(order);
    } else if (order.status === 'payment_verified') {
      sendEmailNotification(order, 'payment-verified');
    } else if (order.status === 'order_shipped') {
      sendEmailNotification(order, 'order-shipped');
    } else if (order.status === 'order_cancelled') {
      sendEmailNotification(order, 'order-cancelled');
    } else {
      toast.info('No email notification available for this status');
    }
  };

  const getResendButtonInfo = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
      case 'awaiting_payment':
        return { label: 'Resend Payment Instructions', icon: CreditCard };
      case 'payment_verified':
        return { label: 'Resend Verification Email', icon: CheckCircle2 };
      case 'order_shipped':
        return { label: 'Resend Tracking Email', icon: Truck };
      case 'order_cancelled':
        return { label: 'Resend Cancellation Email', icon: XCircle };
      default:
        return { label: 'Resend Notification', icon: Undo2 };
    }
  };

  const updateTrackingInfo = async () => {
    if (!selectedOrder) return;
    await Db.update<Order>('orders', selectedOrder.id, {
      trackingId,
      courierPartner,
      status: 'order_shipped',
      updatedAt: new Date().toISOString()
    });
    const updatedOrders = (await Db.getAll<Order>('orders')).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(updatedOrders);
    setSelectedOrder(updatedOrders.find(o => o.id === selectedOrder.id) || null);
    // Notify user
    addNotification({
      userId: selectedOrder.userId,
      title: 'Shipping Update',
      message: `Order #${selectedOrder.id.split('-')[0]}: ${courierPartner} - ${trackingId}`,
      type: 'success',
      link: `/dashboard/orders?id=${selectedOrder.id}`,
    });

    // Send email notification with new tracking details
    sendEmailNotification({ ...selectedOrder!, trackingId, courierPartner }, 'order-shipped');

    toast.success('Order marked as Dispatched & email sent');
  };

  const startEditingItems = async () => {
    if (!selectedOrder) return;
    setEditingOrderItems([...selectedOrder.items]);
    setEditingShippingCharge(selectedOrder.shippingCharge || 0);
    setIsEditingItems(true);
  };

  const updateItem = async (index: number, updates: Partial<OrderItem>) => {
    const newItems = [...editingOrderItems];
    newItems[index] = { ...newItems[index], ...updates };
    setEditingOrderItems(newItems);
  };

  const removeItem = async (index: number) => {
    const newItems = editingOrderItems.filter((_, i) => i !== index);
    setEditingOrderItems(newItems);
  };

  const addNewItem = async (item: any, type: 'product' | 'course' | 'consultation') => {
    const newItem: OrderItem = {
      id: item.id,
      name: item.name || item.title,
      price: item.price || (item.sizes?.[0]?.price) || 0,
      quantity: 1,
      type: type,
      status: 'pending',
      image: item.images?.[0] || item.thumbnail || '',
      metadata: type === 'product' ? { size: item.sizes?.[0]?.size } : {}
    };
    setEditingOrderItems([...editingOrderItems, newItem]);
    setIsAddItemModalOpen(false);
    toast.success(`Added ${newItem.name}`);
  };

  const saveItemChanges = async () => {
    if (!selectedOrder) return;
    setIsUpdatingOrder(true);

    const newItems = editingOrderItems;
    const newShipping = editingShippingCharge;
    const itemsSubtotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discount = selectedOrder.discountAmount || 0;
    const newTotalPrice = Math.max(0, itemsSubtotal + newShipping - discount);

    const updatedOrder = {
      ...selectedOrder,
      items: newItems,
      shippingCharge: newShipping,
      totalPrice: newTotalPrice,
      updatedAt: new Date().toISOString()
    };

    try {
      await Db.update<Order>('orders', selectedOrder.id, updatedOrder);

      // Only send update email if order is past 'pending' state
      if (selectedOrder.status !== 'pending') {
        await fetch('/api/emails/order-updated', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: updatedOrder,
            changeSummary: updateSummary,
            adminEmail: (await Db.getAll<User>('users')).find(u => u.role === 'admin')?.email || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'arachnidsark.store@gmail.com'
          })
        });
        toast.success('Order updated and customer notified');
      } else {
        toast.success('Order updated (No email sent for pending orders)');
      }

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      setIsEditingItems(false);
      setUpdateSummary(''); // Reset update summary

      addNotification({
        userId: selectedOrder.userId,
        title: 'Order Updated',
        message: `Your order #${selectedOrder.id.split('-')[0]} has been updated with changes to items/statuses.`,
        type: 'info',
        link: `/dashboard/orders?id=${selectedOrder.id}`,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to update order');
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  if (isLoading) {
    return <Loading text="Fetching orders..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader className="justify-end">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Search by customer, email or phone..."
            className="bg-card border-border h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search className="h-4 w-4 text-muted-foreground" />}
            isClearable
            onClear={() => setSearchQuery('')}
          />
        </div>
      </SectionHeader>

      <TableMolecule
        data={orders.filter(o => {
          const query = searchQuery.toLowerCase();
          return (
            o.userName?.toLowerCase().includes(query) ||
            o.userEmail?.toLowerCase().includes(query) ||
            o.deliveryPhone?.includes(query) ||
            o.id.toLowerCase().includes(query)
          );
        })}
        columns={[
          {
            header: 'Order ID',
            cell: (order) => <span className="font-mono text-[10px] text-muted-foreground">#{order.id.split('-')[0]}</span>
          },
          {
            header: 'Customer',
            cell: (order) => (
              <>
                <div className="font-bold text-xs">{order.userName}</div>
                <div className="text-[10px] text-muted-foreground">{order.userEmail}</div>
              </>
            )
          },
          {
            header: 'Items',
            cell: (order) => (
              <>
                <div className="font-medium text-xs truncate max-w-[150px]">
                  {order.items.map(i => i.name).join(', ')}
                </div>
                <div className="text-[10px] text-muted-foreground">{order.items.length} item(s)</div>
              </>
            )
          },
          {
            header: 'Status',
            align: 'center',
            cell: (order) => <StatusBadge status={order.status} className="scale-90" />
          },
          {
            header: 'Total',
            align: 'right',
            cell: (order) => <span className="font-bold text-brand-gold text-sm">{formatPrice(order.totalPrice)}</span>
          },
          {
            header: 'Actions',
            align: 'right',
            cell: (order) => (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-gold shrink-0" onClick={() => setSelectedOrder(order)}>
                <Eye className="h-4 w-4 shrink-0" />
              </Button>
            )
          }
        ]}
        renderMobileItem={(order) => (
          <div className="space-y-4 relative" onClick={() => setSelectedOrder(order)}>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">#{order.id.split('-')[0]}</h3>
                  <StatusBadge status={order.status} className="scale-75 origin-left" />
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{order.userName}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-brand-gold text-sm">{formatPrice(order.totalPrice)}</p>
                <p className="text-[9px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/30 gap-4">
              <p className="text-[9px] text-muted-foreground italic truncate flex-1">
                {order.items.map(i => i.name).join(', ')}
              </p>
              <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
            </div>
          </div>
        )}
        emptyDescription="No orders found."
        onRowClick={(order) => setSelectedOrder(order)}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        variant="extra-large"
        size="extra-large"
        className="sm:max-w-[95vw] sm:max-h-[95vh]"
        noPadding
      >
        {selectedOrder ? (
          <div className="flex flex-col h-full">
            <div className="p-4 sm:p-6 border-b border-border bg-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:pr-12">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-red/10 flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-5 w-5 text-brand-red" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold">Order Details</h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      #{selectedOrder.id.split('-')[0]} • {new Date(selectedOrder.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {selectedOrder.status !== 'order_completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResendEmail(selectedOrder!)}
                    className="h-8 px-3 text-[9px] uppercase font-bold tracking-widest border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10 gap-2 shadow-sm w-fit"
                  >
                    {(() => {
                      const info = getResendButtonInfo(selectedOrder.status);
                      return (
                        <>
                          <info.icon className="h-3.5 w-3.5" />
                          {info.label}
                        </>
                      );
                    })()}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Status Journey */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Lifecycle Journey</h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { id: 'pending', label: 'Order Received', icon: Clock },
                      { id: 'awaiting_payment', label: 'Awaiting Payment', icon: CreditCard },
                      { id: 'payment_verified', label: 'Payment Verified', icon: CheckCircle2 },
                      { id: 'order_shipped', label: 'Dispatched', icon: Truck },
                      { id: 'order_completed', label: 'Completed', icon: CheckCircle2 }
                    ].filter(step => {
                      if (step.id === 'order_shipped') {
                        return selectedOrder.items.some(item => item.type === 'product');
                      }
                      return true;
                    }).map((step, idx, arr) => {
                      const isCompleted = arr.findIndex(s => s.id === selectedOrder.status) >= idx;
                      const isCurrent = selectedOrder.status === step.id;
                      const isNext = arr.findIndex(s => s.id === selectedOrder.status) + 1 === idx;

                      return (
                        <div
                          key={step.id}
                          onClick={() => {
                            if (selectedOrder.status === 'order_cancelled') {
                              toast.error('Cannot change status of a cancelled order');
                              return;
                            }

                            // Scroll to shipping details if trying to dispatch without tracking info
                            if (step.id === 'order_shipped' && (!trackingId || !courierPartner)) {
                              const el = document.getElementById('shipping-details-form');
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                toast.info('Please enter shipping details first');
                                return;
                              }
                            }

                            updateStatus(selectedOrder!.id, step.id as OrderStatus, selectedOrder!.userId);
                          }}
                          className={cn(
                            "relative flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 group cursor-pointer",
                            selectedOrder.status === 'order_cancelled' && "cursor-not-allowed opacity-60",
                            isCurrent ? "bg-brand-gold/10 border-brand-gold shadow-lg shadow-brand-gold/5" :
                              isCompleted ? "bg-green-500/5 border-green-500/20 hover:border-green-500/50" :
                                "bg-muted/30 border-border hover:border-brand-gold/50"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                            isCurrent ? "bg-brand-gold text-black" :
                              isCompleted ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                          )}>
                            {isCompleted && !isCurrent ? <CheckCircle2 className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider", isCurrent ? "text-brand-gold" : isCompleted ? "text-green-500" : "text-muted-foreground")}>
                              {step.label}
                            </p>
                            {isCurrent && <p className="text-[9px] text-brand-gold/70 italic leading-none mt-1">Current Stage</p>}
                          </div>
                          {isNext && <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />}
                        </div>
                      );
                    })}

                    {/* Cancel Action */}
                    <div className="pt-4 border-t border-border mt-4">
                      {selectedOrder.status !== 'order_cancelled' ? (
                        <Button
                          variant="ghost"
                          onClick={() => updateStatus(selectedOrder.id, 'order_cancelled', selectedOrder.userId)}
                          className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-500/10 h-12 rounded-xl border border-transparent hover:border-red-500/20"
                        >
                          <XCircle className="h-5 w-5" />
                          <div className="text-left">
                            <p className="text-[10px] font-bold uppercase tracking-widest">Cancel Order</p>
                            <p className="text-[8px] text-red-500/70">Voids items and notifies customer</p>
                          </div>
                        </Button>
                      ) : (
                        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-red-500 font-bold text-xs">
                            <XCircle className="h-4 w-4" /> Order Cancelled
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">"{(selectedOrder!.cancellationReason || 'No reason specified')}"</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Delete Action */}
                    <div className="pt-4 mt-2">
                      <Button
                        variant="ghost"
                        onClick={handleDeleteOrder}
                        className="w-full justify-start gap-3 text-red-700 hover:text-white hover:bg-red-600 h-12 rounded-xl border border-red-500/20"
                      >
                        <Trash2 className="h-5 w-5" />
                        <div className="text-left">
                          <p className="text-[10px] font-bold uppercase tracking-widest">Delete Order</p>
                          <p className="text-[8px] opacity-70">Permanently removes record from database</p>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Order Content */}
                <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Items Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Package className="h-3 w-3" /> Items Purchased
                        </h4>
                        {!isEditingItems && selectedOrder.status !== 'order_cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={startEditingItems}
                            className="h-7 px-2 text-[9px] uppercase font-bold tracking-widest text-brand-gold hover:bg-brand-gold/10 gap-1"
                          >
                            <Edit2 className="h-3 w-3" /> Manage Items
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {isEditingItems ? (
                          <div className="space-y-4">
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                              {editingOrderItems.map((item, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-card border border-border space-y-3 shadow-sm">
                                  <div className="flex gap-3 items-center">
                                    <div className="h-10 w-10 rounded-lg border border-border bg-background overflow-hidden flex-shrink-0 flex items-center justify-center">
                                      {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold uppercase truncate">{item.name}</p>
                                      <p className="text-[9px] text-muted-foreground">{item.type}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10" onClick={() => removeItem(idx)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[8px] uppercase font-black text-muted-foreground">Price</label>
                                      <Input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[8px] uppercase font-black text-muted-foreground">Quantity</label>
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] uppercase font-black text-muted-foreground">Item Status</label>
                                    <SharedSelect
                                      options={[
                                        { value: 'pending', label: 'Pending' },
                                        { value: 'payment_verified', label: 'Verified' },
                                        { value: 'order_shipped', label: 'Shipped' },
                                        { value: 'order_completed', label: 'Completed' },
                                        { value: 'order_cancelled', label: 'Cancelled' }
                                      ]}
                                      value={item.status || 'pending'}
                                      onValueChange={(val) => updateItem(idx, { status: val as OrderStatus })}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <Button
                              variant="outline"
                              className="w-full h-10 border-dashed border-border hover:border-brand-gold hover:text-brand-gold bg-transparent"
                              onClick={() => setIsAddItemModalOpen(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" /> Add New Item
                            </Button>

                            <div className="pt-6 border-t border-border space-y-4">
                              <div className="space-y-2 p-3 rounded-xl bg-brand-gold/5 border border-brand-gold/20">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] uppercase font-black text-brand-gold">Shipping Charge</label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-muted-foreground">₹</span>
                                    <input
                                      type="number"
                                      className="w-24 bg-background border border-brand-gold/30 rounded-lg px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-brand-gold outline-none"
                                      value={editingShippingCharge}
                                      onChange={(e) => setEditingShippingCharge(Number(e.target.value))}
                                    />
                                  </div>
                                </div>
                                <p className="text-[9px] text-muted-foreground italic">Manually override the shipping cost for this order</p>
                              </div>
                            </div>
                            <div className="pt-4 border-t border-border space-y-4">
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black text-muted-foreground">Update Note (Sent to User)</label>
                                <textarea
                                  className="w-full h-20 bg-background border border-border rounded-xl p-3 text-xs focus:ring-1 focus:ring-brand-gold/50 outline-none resize-none"
                                  placeholder="Briefly describe what was updated..."
                                  value={updateSummary}
                                  onChange={(e) => setUpdateSummary(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 h-10" onClick={() => setIsEditingItems(false)}>Cancel</Button>
                                <Button
                                  className="flex-1 h-10 bg-brand-gold hover:bg-brand-gold/90 text-black font-bold"
                                  onClick={saveItemChanges}
                                  disabled={isUpdatingOrder}
                                >
                                  {isUpdatingOrder ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                                  Save & Notify
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {selectedOrder!.items.map((item, idx) => (
                              <div key={idx} className="flex gap-3 items-center p-3 rounded-xl bg-muted/30 border border-border/50 group hover:border-brand-gold/30 transition-colors relative">
                                <div className="h-10 w-10 rounded-lg border border-border bg-background overflow-hidden flex-shrink-0 flex items-center justify-center">
                                  {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold uppercase truncate">{item.name}</p>
                                    {item.status && <StatusBadge status={item.status} className="scale-[0.6] origin-left" />}
                                  </div>
                                  <p className="text-[9px] text-muted-foreground">{item.type === 'product' ? (item.metadata?.size || 'N/A') : item.type} × {item.quantity}</p>
                                </div>
                                <p className="text-xs font-bold text-brand-gold">{formatPrice(item.price * item.quantity)}</p>
                              </div>
                            ))}
                            <div className="pt-2 px-2 space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatPrice(selectedOrder!.items.reduce((acc, item) => acc + (item.price * item.quantity), 0))}</span>
                              </div>
                              {selectedOrder!.discountAmount && selectedOrder!.discountAmount > 0 ? (
                                <div className="flex justify-between text-[10px] text-emerald-500 font-medium">
                                  <span>Discount ({selectedOrder!.coupon?.code})</span>
                                  <span>-{formatPrice(selectedOrder!.discountAmount)}</span>
                                </div>
                              ) : null}
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Shipping</span>
                                <span>{formatPrice(selectedOrder!.shippingCharge)}</span>
                              </div>
                              <div className="flex justify-between text-xs font-bold text-brand-gold pt-1 border-t border-border mt-1">
                                <span>Total Amount</span>
                                <span>{formatPrice(selectedOrder!.totalPrice)}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Customer & Delivery Section */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-3 w-3" /> {selectedOrder!.items.some(item => item.type === 'product') ? 'Customer & Delivery' : 'Customer Information'}
                      </h4>
                      <div className="p-4 rounded-2xl border border-border bg-background/50 space-y-4 shadow-inner">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <UserIcon className="h-3.5 w-3.5 text-brand-red mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-[8px] text-muted-foreground uppercase font-black">Recipient</p>
                              <p className="text-xs font-bold">{selectedOrder!.deliveryName}</p>
                              <p className="text-[9px] text-muted-foreground">{selectedOrder!.userEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Phone className="h-3.5 w-3.5 text-brand-red mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-[8px] text-muted-foreground uppercase font-black">Phone</p>
                              <p className="text-xs font-bold">{selectedOrder!.deliveryPhone}</p>
                            </div>
                          </div>
                          {selectedOrder!.deliveryAddress && (
                            <div className="flex items-start gap-3">
                              <MapPin className="h-3.5 w-3.5 text-brand-red mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-[8px] text-muted-foreground uppercase font-black">Full Address</p>
                                <p className="text-xs font-medium leading-relaxed">{selectedOrder!.deliveryAddress}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        {selectedOrder!.message && (
                          <div className="p-2.5 rounded-xl bg-brand-gold/5 border border-brand-gold/10 italic text-[10px] text-muted-foreground">
                            "{selectedOrder!.message}"
                          </div>
                        )}
                      </div>

                      {/* Dispatch Logistics Section */}
                      {['payment_verified', 'order_shipped', 'order_completed'].includes(selectedOrder!.status) && 
                       selectedOrder!.items.some(item => item.type === 'product') && (
                        <div id="shipping-details-form" className="space-y-4 pt-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Truck className="h-3 w-3" /> Dispatch Logistics
                          </h4>
                          <div className="p-4 rounded-2xl border border-border bg-accent/10 space-y-4 shadow-sm">
                            <div className="space-y-3">
                              <Input
                                label="Courier Partner"
                                labelClassName="text-[9px] uppercase tracking-widest text-muted-foreground"
                                value={courierPartner}
                                onChange={(e) => setCourierPartner(e.target.value)}
                                placeholder="e.g. Delhivery, BlueDart"
                                className="h-8 text-xs bg-background/50"
                              />
                              <Input
                                label="Tracking ID / AWB"
                                labelClassName="text-[9px] uppercase tracking-widest text-muted-foreground"
                                value={trackingId}
                                onChange={(e) => setTrackingId(e.target.value)}
                                placeholder="Enter tracking number"
                                className="h-8 text-xs bg-background/50"
                              />
                            </div>
                            <Button
                              onClick={updateTrackingInfo}
                              disabled={selectedOrder!.status === 'order_cancelled'}
                              className="w-full h-8 bg-brand-gold hover:bg-brand-gold/90 text-black font-bold text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-brand-gold/10"
                            >
                              <Save className="h-3 w-3" /> Update & Notify
                            </Button>
                            <p className="text-[8px] text-muted-foreground text-center italic">Triggers shipping email to customer</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Cancellation Modal */}
      <Modal
        isOpen={isCancellationModalOpen}
        onClose={() => setIsCancellationModalOpen(false)}
        variant="confirm"
        title="Cancellation Audit"
        description="You are about to cancel this order. This action will notify the customer and provide them with the following reason."
        footer={(
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => setIsCancellationModalOpen(false)} className="text-[10px] uppercase tracking-widest font-bold">Dismiss</Button>
            <Button onClick={handleCancelOrder} className="bg-red-500 hover:bg-red-600 text-white text-[10px] uppercase tracking-widest font-bold px-8">Confirm Cancellation</Button>
          </div>
        )}
      >
        <div className="py-2 space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Reason for Cancellation</Label>
            <textarea
              className="w-full h-24 bg-background/50 border border-border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all resize-none shadow-inner"
              placeholder="e.g. Items out of stock, shipping zone unreachable..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        title="Add Item to Order"
        variant="medium"
      >
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black text-muted-foreground">Search Catalog</Label>
            <Input
              placeholder="Search products or courses..."
              value={itemSearchQuery}
              onChange={(e) => setItemSearchQuery(e.target.value)}
              startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              isClearable
              onClear={() => setItemSearchQuery('')}
            />
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {/* Products */}
            <div className="space-y-2">
              <h5 className="text-[8px] uppercase font-black text-muted-foreground border-b border-border pb-1">Products</h5>
              {catalogProducts
                .filter(p => p.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                .slice(0, 5)
                .map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-background border border-border flex items-center justify-center overflow-hidden">
                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase truncate">{p.name}</p>
                        <p className="text-[8px] text-brand-gold">{formatPrice(p.sizes?.[0]?.price || 0)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => addNewItem(p, 'product')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>

            {/* Courses */}
            <div className="space-y-2">
              <h5 className="text-[8px] uppercase font-black text-muted-foreground border-b border-border pb-1">Courses</h5>
              {catalogCourses
                .filter(c => c.title.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                .map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-background border border-border flex items-center justify-center overflow-hidden">
                        {c.thumbnail ? <img src={c.thumbnail} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase truncate">{c.title}</p>
                        <p className="text-[8px] text-brand-gold">{formatPrice(c.price)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => addNewItem(c, 'course')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Resend Email Confirmation Modal */}
      <Modal
        isOpen={isResendModalOpen}
        onClose={() => setIsResendModalOpen(false)}
        variant="confirm"
        title="Email Notification Guard"
        description="You are moving this order to a status that was previously reached or is a backward step. Do you want to resend the status update email to the customer?"
        footer={(
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => {
                if (pendingStatusUpdate) {
                  executeStatusUpdate(pendingStatusUpdate.id, pendingStatusUpdate.status, pendingStatusUpdate.userId, false);
                }
              }}
              className="text-[10px] uppercase tracking-widest font-bold flex-1"
            >
              Update Without Email
            </Button>
            <Button
              onClick={() => {
                if (pendingStatusUpdate) {
                  executeStatusUpdate(pendingStatusUpdate.id, pendingStatusUpdate.status, pendingStatusUpdate.userId, true);
                }
              }}
              className="bg-brand-gold hover:bg-brand-gold/90 text-black text-[10px] uppercase tracking-widest font-bold px-8 flex-1"
            >
              Update & Resend Email
            </Button>
          </div>
        )}
      >
        <div className="py-2" />
      </Modal>
    </div>
  );
}
