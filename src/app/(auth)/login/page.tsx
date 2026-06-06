'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ArrowRight, BarChart3, Eye, EyeOff, FileText, IndianRupee, Lock, Mail, Receipt, ShieldCheck, Users } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { loginSchema, type LoginInput } from '@/lib/schemas';
import { Input, Label } from '@/components/ui/Input';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { toast } from '@/components/ui/Toast';
import { LogoFull, LogoIcon } from '@/components/ui/Logo';
import type { AppUser } from '@/lib/types';

function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    default:
      return 'Unable to sign in. Please try again.';
  }
}

function LoginBrandPanel() {
  return (
    <aside className="relative hidden h-screen overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-12 md:flex md:flex-col md:justify-center">
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}/>
      
      {/* Floating Decoration Elements */}
      <div className="absolute top-8 right-8 w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center animate-float pointer-events-none" style={{animationDelay: '0s'}}>
        <Users className="w-5 h-5 text-white/60" />
      </div>
      <div className="absolute bottom-24 right-12 w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center animate-float pointer-events-none" style={{animationDelay: '1s'}}>
        <IndianRupee className="w-5 h-5 text-white/60" />
      </div>
      <div className="absolute top-1/2 right-6 w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center animate-float pointer-events-none" style={{animationDelay: '2s'}}>
        <BarChart3 className="w-4 h-4 text-white/60" />
      </div>

      <div className="relative z-10 animate-slide-in-left">
        <LogoFull white={true} iconSize={42} wordSize="lg" />
        <div className="w-full h-px bg-white/20 mt-4" />

        <div className="mt-12 space-y-2">
          <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Procurement Platform</p>
          <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
            Procurement,<br />simplified.
          </h1>
          <p className="text-white/70 text-base leading-relaxed pt-2 max-w-xs">
            Everything your procurement team needs to source, approve, and pay — all in one modern workspace.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <p className="text-white font-semibold text-sm">RFQs</p>
            <p className="text-white/60 text-[10px] mt-0.5">Streamlined sourcing</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <p className="text-white font-semibold text-sm">Approvals</p>
            <p className="text-white/60 text-[10px] mt-0.5">Faster sign-offs</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <p className="text-white font-semibold text-sm">Invoices</p>
            <p className="text-white/60 text-[10px] mt-0.5">PDF & email ready</p>
          </div>
        </div>

        {/* Dashboard Preview Card */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 shadow-2xl shadow-orange-900/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/60 text-xs font-medium uppercase tracking-wide">Live Dashboard</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-white/30" />
              <div className="w-2 h-2 rounded-full bg-white/30" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white/50 text-[10px] uppercase tracking-wide">Active RFQs</p>
              <p className="text-white text-2xl font-black mt-0.5">24</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white/50 text-[10px] uppercase tracking-wide">Pending Approvals</p>
              <p className="text-white text-2xl font-black mt-0.5">8</p>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-14">
            {[35, 55, 40, 75, 50, 85, 60].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md"
                style={{
                  height: `${h}%`,
                  background: `rgba(255,255,255,${0.2 + (i * 0.08)})`,
                  animation: `growUp 0.6s ease-out ${i * 80}ms both`
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {['J', 'F', 'M', 'A', 'M', 'J', 'J'].map(m => (
              <span key={m} className="flex-1 text-center text-[9px] text-white/30">{m}</span>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 text-white/50 text-[10px] uppercase font-bold tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure. Compliant. Built for enterprise.</span>
          </div>
          <span className="text-white/30 text-xs font-medium">© 2026</span>
        </div>
      </div>
    </aside>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: true },
  });

  async function onSubmit(data: LoginInput) {
    setSubmitting(true);
    try {
      await setPersistence(
        auth,
        data.remember ? browserLocalPersistence : browserSessionPersistence,
      );
      const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      toast.success('Welcome back!');
      if (snap.exists() && (snap.data() as AppUser).role === 'vendor') {
        router.replace('/quotations');
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      toast.error(authErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot() {
    const email = getValues('email');
    if (!email) {
      toast.error('Enter your email above first, then click reset.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent.');
    } catch {
      toast.error('Could not send reset email.');
    }
  }

  return (
    <main className="grid h-screen overflow-hidden bg-white md:grid-cols-2">
      <LoginBrandPanel />

      <section className="flex h-screen items-center justify-center bg-[#FAFAFA] px-6 lg:px-12">
        <div className="w-full max-w-[420px] animate-slide-in-right">
          <div className="flex flex-col items-center mb-8">
            <LogoIcon size={52} />
            <div className="mt-3 text-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Vendor<span className="text-orange-500">Bridge</span>
              </h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-semibold mt-0.5">Enterprise Procurement</p>
            </div>
          </div>

          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <h3 className="text-2xl font-bold text-gray-900">Welcome back!</h3>
            <p className="text-gray-500 text-sm mt-1">Sign in to continue to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-gray-400"
                  placeholder="you@company.com"
                  {...register('email')}
                />
                {errors.email?.message && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-1 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full h-12 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-gray-400"
                  placeholder="Enter your password"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {errors.password?.message && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded accent-orange-500 transition-all" {...register('remember')} />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">Remember me</span>
              </label>
              <button type="button" onClick={handleForgot} className="text-sm text-orange-500 font-medium hover:text-orange-600 transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed animate-fade-in-up"
              style={{ animationDelay: '300ms' }}
            >
              {submitting ? 'Signing in...' : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <GoogleButton className="w-full h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-3 text-gray-700 font-bold text-sm hover:bg-gray-50 hover:shadow-sm transition-all" />
          </div>

          <p className="text-center text-sm text-gray-500 mt-8 animate-fade-in-up" style={{ animationDelay: '450ms' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-orange-500 font-semibold hover:text-orange-600 transition-colors">Create one</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
