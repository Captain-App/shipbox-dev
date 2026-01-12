import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Box, Lock, Mail } from 'lucide-react';

export function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  
  // Use refs for uncontrolled inputs - more AI/automation friendly
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-md p-6 md:p-8 bg-white/5 border-white/10 backdrop-blur-xl rounded-[2.5rem]">
        <div className="flex flex-col items-center text-center mb-6 md:mb-8">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 shrink-0">
            <Box className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white">
            Shipbox
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-2">
            {mode === 'login' ? 'Welcome back, Architect' : 'Join the construction'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Authentication form">
          <div className="space-y-2">
            <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                aria-label="Email address"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-white"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                aria-required="true"
                aria-label="Password"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs font-bold text-center mt-2">{error}</p>
          )}

          <Button type="submit" className="w-full py-6 mt-4 uppercase tracking-widest" disabled={loading}>
            {loading ? 'Processing...' : mode === 'login' ? 'Enter the Castle' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
          >
            {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
          </button>
        </div>
      </Card>
    </div>
  );
}
