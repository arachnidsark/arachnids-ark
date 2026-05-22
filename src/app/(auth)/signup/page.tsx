'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Mail, Phone, Lock } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormBuilder, type FormFieldConfig } from '@/components/shared/organisms/form-builder';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val.replace(/\D/g, '')), {
    message: 'Mobile number must be exactly 10 digits',
  }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { signup, checkEmailAvailability, isLoading, isAuthenticated, user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [pendingData, setPendingData] = useState<SignupFormValues | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
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
          router.push('/dashboard');
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [mounted, isAuthenticated, user, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const fields: FormFieldConfig[] = [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      placeholder: 'John Doe',
      leftIcon: <User className="h-4 w-4" />,
      required: true,
      gridSpan: 'col-span-2'
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'you@example.com',
      leftIcon: <Mail className="h-4 w-4" />,
      required: true,
      gridSpan: 'col-span-2'
    },
    {
      name: 'phone',
      label: 'Mobile Number',
      type: 'tel',
      placeholder: '10-digit number',
      leftIcon: <Phone className="h-4 w-4" />,
      gridSpan: 'col-span-2'
    },
    {
      name: 'password',
      label: 'Password',
      type: showPassword ? 'text' : 'password',
      placeholder: 'Min 6 characters',
      leftIcon: <Lock className="h-4 w-4" />,
      rightIcon: (
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-brand-gold transition-colors">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      ),
      required: true,
      gridSpan: 'col-span-2'
    },
    {
      name: 'confirmPassword',
      label: 'Confirm Password',
      type: 'password',
      placeholder: 'Repeat your password',
      leftIcon: <Lock className="h-4 w-4" />,
      required: true,
      gridSpan: 'col-span-2'
    }
  ];

  const onSendOTP = async (values: SignupFormValues) => {
    // 1. Check uniqueness
    const { available } = await checkEmailAvailability(values.email);
    if (!available) {
      toast.error('This email is already registered. Please login or use a different email.');
      return;
    }

    // 2. Send OTP
    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, name: values.name, action: 'send' })
      });
      const data = await res.json();
      
      if (data.success) {
        setPendingData(values);
        setStep(2);
        setCountdown(60);
        toast.success(`Verification code sent to ${values.email}`);
      } else {
        toast.error(data.error || 'Failed to send verification code');
      }
    } catch (err) {
      toast.error('Connection error while sending OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const onVerifyAndSignup = async () => {
    if (otpValue.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    if (!pendingData) return;

    setIsVerifying(true);
    try {
      // 1. Verify OTP
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: pendingData.email, 
          otp: otpValue, 
          action: 'verify' 
        })
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || 'Invalid verification code');
        setIsVerifying(false);
        return;
      }

      // 2. Proceed with Signup
      const result = await signup(
        pendingData.name, 
        pendingData.email, 
        pendingData.password, 
        pendingData.phone || ''
      );

      if (result.success) {
        toast.success('Email verified! Account created successfully.');
        if (redirect) {
          router.push(redirect);
        } else {
          router.push('/');
        }
      } else {
        toast.error(result.error || 'Signup failed after verification');
      }
    } catch (err) {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-background to-brand-gold/5" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(197, 150, 58, 0.05) 0%, transparent 50%)',
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
          <h1 className="vibe-heading text-2xl font-bold">
            {step === 1 ? 'Create Account' : 'Verify Email'}
          </h1>
          <p className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground mt-1 tracking-[0.2em]">
            {step === 1 ? 'Join the ArachnidsArk community' : `Code sent to ${pendingData?.email}`}
          </p>
        </div>

        <Card className="vibe-card border-border bg-card/40 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-8">
            {step === 1 ? (
              <FormBuilder
                schema={signupSchema}
                fields={fields}
                onSubmit={onSendOTP}
                isSubmitting={isVerifying || isLoading}
                submitAlignment="center"
                submitLabel="Send Verification Code"
                className="space-y-6"
              />
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-center block text-muted-foreground">Enter 6-digit code</Label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-background/50 border-2 border-border focus:border-brand-gold text-center text-3xl font-mono tracking-[10px] py-4 rounded-xl outline-none transition-all"
                  />
                </div>
                
                <Button 
                  onClick={onVerifyAndSignup}
                  disabled={otpValue.length !== 6 || isVerifying}
                  className="w-full bg-brand-red hover:bg-brand-red-light text-white font-bold h-12"
                >
                  {isVerifying ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                  ) : 'Verify & Create Account'}
                </Button>

                <div className="text-center">
                  <button 
                    onClick={() => countdown === 0 && pendingData && onSendOTP(pendingData)}
                    disabled={countdown > 0}
                    className={`text-xs ${countdown > 0 ? 'text-muted-foreground' : 'text-brand-gold hover:underline underline-offset-4'}`}
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
                  </button>
                </div>

                <button 
                  onClick={() => setStep(1)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
                >
                  Change Email Address
                </button>
              </div>
            )}
          </CardContent>
          <CardFooter className="px-8 pb-8 pt-0 flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link href={`/login${redirect ? `?redirect=${redirect}` : ''}`} className="text-brand-gold hover:underline font-bold transition-all hover:tracking-wide">Sign in</Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
