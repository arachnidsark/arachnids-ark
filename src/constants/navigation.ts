import { 
  Home, ShoppingBag, GraduationCap, Calendar, BookOpen, Heart,
  LayoutDashboard, Package, Users, Settings, ClipboardList, MessageSquare, DollarSign, Ticket
} from 'lucide-react';

export const USER_NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Shop', href: '/shop', icon: ShoppingBag, module: 'products' },
  { label: 'Courses', href: '/courses', icon: GraduationCap, module: 'courses' },
  { label: 'Consultation', href: '/consultation', icon: Calendar, module: 'consultations' },
  { label: 'Care Guides', href: '/care-guides', icon: BookOpen },
];

export const MOBILE_NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Shop', href: '/shop', icon: ShoppingBag, module: 'products' },
  { label: 'Courses', href: '/courses', icon: GraduationCap, module: 'courses' },
  { label: 'Consult', href: '/consultation', icon: Calendar, module: 'consultations' },
  { label: 'My Orders', href: '/dashboard/orders', icon: ClipboardList, module: 'products' },
];

export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: Package, module: 'products' },
  { label: 'Reviews', href: '/admin/reviews', icon: MessageSquare, module: 'products' },
  { label: 'Courses', href: '/admin/courses', icon: GraduationCap, module: 'courses' },
  { label: 'Orders', href: '/admin/orders', icon: ClipboardList, module: 'products' },
  { label: 'Enrollments', href: '/admin/enrollments', icon: BookOpen, module: 'courses' },
  { label: 'Bookings', href: '/admin/bookings', icon: Calendar, module: 'consultations' },
  { label: 'Revenue', href: '/admin/revenue', icon: DollarSign },
  { label: 'Coupons', href: '/admin/coupons', icon: Ticket },
  { label: 'Care Guides', href: '/admin/care-guides', icon: BookOpen },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Consultation Settings', href: '/admin/consultations', icon: Calendar, module: 'consultations' },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export const DASHBOARD_NAV_ITEMS = [
  { label: 'My Orders', href: '/dashboard/orders', icon: ClipboardList, module: 'products' },
  { label: 'My Courses', href: '/dashboard/courses', icon: GraduationCap, module: 'courses' },
  { label: 'My Consultations', href: '/dashboard/consultations', icon: Calendar, module: 'consultations' },

  { label: 'Favorites', href: '/liked', icon: Heart, module: 'products' },

  { label: 'Profile', href: '/dashboard/profile', icon: Settings },
];
export const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard Overview',
  '/admin/products': 'Products Management',
  '/admin/reviews': 'Customer Reviews',
  '/admin/courses': 'Courses Management',
  '/admin/orders': 'Orders Management',
  '/admin/enrollments': 'Course Enrollments',
  '/admin/bookings': 'Consultation Bookings',
  '/admin/revenue': 'Revenue Analytics',
  '/admin/coupons': 'Discount Coupons',
  '/admin/care-guides': 'Care Guides Management',
  '/admin/users': 'User Management',
  '/admin/consultations': 'Consultation Settings',
  '/admin/settings': 'System Settings',
  '/dashboard/orders': 'My Orders',
  '/dashboard/courses': 'My Courses',
  '/dashboard/consultations': 'My Consultations',
  '/dashboard/profile': 'My Profile',
  '/liked': 'Favorite Items',
  '/shop': 'Arachnids Shop',
  '/courses': 'Explore Courses',
  '/consultation': 'Book Consultation',
  '/care-guides': 'Expert Care Guides',
  '/cart': 'Your Shopping Cart',
  '/checkout': 'Secure Checkout',
};
