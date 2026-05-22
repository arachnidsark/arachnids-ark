import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone, Link as LinkIcon, Globe, MessageCircle } from 'lucide-react';
import { useModules } from '@/hooks/use-modules';

export function Footer() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const { isVisible } = useModules();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 pt-12 pb-24 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-64 flex items-center justify-start overflow-hidden">
                <img src="/logo.png" alt="ArachnidsArk" className="w-full h-auto object-contain object-left" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your premier destination for exotic tarantulas, expert care guidance, and professional consultation services.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-8 h-8 rounded-full bg-accent/50 flex items-center justify-center hover:bg-brand-red/20 transition-colors">
                <LinkIcon className="h-4 w-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-accent/50 flex items-center justify-center hover:bg-brand-red/20 transition-colors">
                <Globe className="h-4 w-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-accent/50 flex items-center justify-center hover:bg-brand-red/20 transition-colors">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-brand-gold text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Shop Exotics', href: '/shop', module: 'products' },
                { label: 'Care Guides', href: '/care-guides' },
                { label: 'Courses', href: '/courses', module: 'courses' },
                { label: 'Consultation', href: '/consultation', module: 'consultations' },
              ].filter(link => isVisible(link.module)).map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-brand-gold transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4 text-brand-gold text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'My Dashboard', href: '/dashboard' },
                { label: 'My Favorites', href: '/liked' },
                { label: 'Track Orders', href: '/dashboard/orders' },
                { label: 'FAQs', href: '/#faq' },
              ].map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-brand-gold transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-brand-gold text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-brand-red" />
                info@arachnidsark.com
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-brand-red" />
                +91 98765 43210
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-brand-red mt-0.5" />
                Bangalore, Karnataka, India
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ArachnidsArk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
