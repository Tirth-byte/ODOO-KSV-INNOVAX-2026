'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { auth, db } from '@/lib/firebase';
import { registerSchema, type RegisterInput } from '@/lib/schemas';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { toast } from '@/components/ui/Toast';
import { COUNTRIES, ROLE_LABELS } from '@/lib/constants';
import type { UserRole } from '@/lib/types';
import { LogoFull, LogoIcon } from '@/components/ui/Logo';
import { ArrowRight, CheckCircle2, Eye, EyeOff, FileText, Globe, IndianRupee, Lock, Mail, Phone, Receipt, ShieldCheck, User, Users } from 'lucide-react';

function RegisterBrandPanel() {
  const points = [
    'Role-based access control',
    'Real-time approval workflows',
    'Automated PO & invoice generation',
    'Full audit trail & analytics',
  ];

  return (
    <aside className="relative hidden h-screen overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-12 md:flex md:flex-col md:justify-center">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}/>
      
      <div className="relative z-10 animate-slide-in-left">
        <LogoFull white={true} iconSize={42} wordSize="lg" />
        <div className="w-full h-px bg-white/20 mt-4" />

        <h1 className="mt-12 text-5xl font-black leading-tight text-white tracking-tight">
          Join VendorBridge.
        </h1>
        <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/80">
          Start managing procurement smarter with our enterprise-grade platform.
        </p>

        <ul className="mt-12 space-y-6">
          {points.map((point, i) => (
            <li 
              key={i} 
              className="flex items-center gap-4 text-white animate-fade-in-left" 
              style={{ animationDelay: `${400 + i * 150}ms` }}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-medium">{point}</span>
            </li>
          ))}
        </ul>

        <div className="mt-20 flex flex-col gap-4 border-t border-white/10 pt-10">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <CheckCircle2 className="h-4 w-4 text-white/60" />
            <span>Trusted by global enterprise teams.</span>
          </div>
          <p className="text-xs text-white/40 font-medium tracking-tight">© 2026 VendorBridge ERP</p>
        </div>
      </div>
      
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-orange-400/20 blur-3xl pointer-events-none" />
    </aside>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'procurement_officer', country: 'India' },
  });

  async function onSubmit(data: RegisterInput) {
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(cred.user, { displayName: data.fullName });
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        phone: data.phone,
        country: data.country,
        additionalInfo: data.additionalInfo ?? '',
        createdAt: serverTimestamp(),
      });
      toast.success('Account created!');
      if (data.role === 'vendor') {
        router.replace('/quotations');
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      if (code === 'auth/email-already-in-use') {
        toast.error('That email is already registered.');
      } else if (code === 'auth/weak-password') {
        toast.error('Password is too weak.');
      } else {
        toast.error('Could not create account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const roles: UserRole[] = ['admin', 'manager', 'procurement_officer', 'vendor'];

  return (
    <main className="grid h-screen overflow-hidden bg-white md:grid-cols-2">
      <RegisterBrandPanel />

      <section className="flex h-screen items-center justify-center overflow-y-auto bg-[#FAFAFA] px-6 py-12 lg:px-12">
        <div className="w-full max-w-[520px] animate-slide-in-right">
          <div className="flex flex-col items-center mb-8">
            <LogoIcon size={52} />
            <div className="mt-3 text-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Vendor<span className="text-orange-500">Bridge</span>
              </h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-semibold mt-0.5">Enterprise Procurement</p>
            </div>
          </div>

          <div className="mb-8 text-center animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <h3 className="text-2xl font-bold text-gray-900">Create your account</h3>
            <p className="mt-1 text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-orange-500 hover:text-orange-600 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">Full name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="fullName"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-gray-400"
                  placeholder="Jane Doe"
                  {...register('fullName')}
                />
                {errors.fullName?.message && <p className="mt-1 text-xs text-red-500 font-medium">{errors.fullName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-gray-400"
                    placeholder="you@company.com"
                    {...register('email')}
                  />
                  {errors.email?.message && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>}
                </div>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="phone"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-gray-400"
                    placeholder="+91 98765 43210"
                    {...register('phone')}
                  />
                  {errors.phone?.message && <p className="mt-1 text-xs text-red-500 font-medium">{errors.phone.message}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country</Label>
                <div className="relative mt-1">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Select
                    id="country"
                    className="h-11 pl-10 rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-500/20"
                    error={errors.country?.message}
                    {...register('country')}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">Your Role</Label>
                <div className="relative mt-1">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Select
                    id="role"
                    className="h-11 pl-10 rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-500/20"
                    error={errors.role?.message}
                    {...register('role')}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="animate-fade-in-up" style={{ animationDelay: '350ms' }}>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-gray-400"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  {errors.password?.message && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>}
                </div>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-gray-400"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {errors.confirmPassword?.message && <p className="mt-1 text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '450ms' }}>
              <Label htmlFor="additionalInfo" className="text-sm font-medium text-gray-700">Additional information</Label>
              <div className="relative mt-1">
                <Textarea
                  id="additionalInfo"
                  className="rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-500/20"
                  placeholder="Anything we should know about your company..."
                  rows={3}
                  {...register('additionalInfo')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 mt-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed animate-fade-in-up"
              style={{ animationDelay: '500ms' }}
            >
              {submitting ? 'Creating account...' : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6 animate-fade-in-up" style={{ animationDelay: '550ms' }}>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '600ms' }}>
            <GoogleButton className="w-full h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-3 text-gray-700 font-bold text-sm hover:bg-gray-50 hover:shadow-sm transition-all" />
            <p className="mt-3 text-center text-xs text-gray-400 font-medium">
              You&apos;ll complete your profile after signing in.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
