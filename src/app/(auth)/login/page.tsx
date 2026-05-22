'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormBuilder, type FormFieldConfig } from '@/components/shared/organisms/form-builder';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { login, isLoading, isAuthenticated, user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      const timeoutId = setTimeout(() => {
        if (user?.role === 'admin') {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [mounted, isAuthenticated, user, router]);

  const fields: FormFieldConfig[] = [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'your@email.com',
      leftIcon: <Mail className="h-4 w-4" />,
      required: true,
      gridSpan: 'col-span-2'
    },
    {
      name: 'password',
      label: 'Password',
      type: showPassword ? 'text' : 'password',
      placeholder: 'Enter your password',
      leftIcon: <Lock className="h-4 w-4" />,
      rightIcon: (
        <button 
          type="button" 
          onClick={() => setShowPassword(!showPassword)}
          className="hover:text-brand-gold transition-colors focus:outline-none"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      ),
      required: true,
      gridSpan: 'col-span-2'
    }
  ];

  const onSubmit = async (values: LoginFormValues) => {
    const result = await login(values.email, values.password);
    if (result.success) {
      toast.success('Welcome back!');
      const user = useAuthStore.getState().user;
      if (redirect) {
        router.push(redirect);
      } else if (user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-background to-brand-red/5" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(139, 26, 26, 0.08) 0%, transparent 50%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center mb-6 group">
            <div className="w-80 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="ArachnidsArk" className="w-full h-auto object-contain" />
            </div>
          </Link>
          <h1 className="vibe-heading text-2xl font-bold">Welcome Back</h1>
          <p className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground mt-1 tracking-[0.2em]">Sign in to your account</p>
        </div>

        <Card className="vibe-card border-border bg-card/40 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-8">
            <FormBuilder
              schema={loginSchema}
              fields={fields}
              onSubmit={onSubmit}
              isSubmitting={isLoading}
              submitAlignment="center"
              submitLabel="Sign In"
              className="space-y-6"
            />
          </CardContent>
          <CardFooter className="px-8 pb-8 pt-0 flex justify-center">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-brand-gold hover:underline font-bold transition-all hover:tracking-wide">Sign up</Link>
              </p>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-brand-gold transition-colors font-medium">
                Forgot password?
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
