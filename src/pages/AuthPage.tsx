import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2 } from 'lucide-react';
import dexoLogoFull from '@/assets/dexo-logo-full.png';
import { useToast } from '@/hooks/use-toast';
import { scaleInVariants, fadeUpVariants, EASE, DURATION } from '@/lib/animations';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthPage = () => {
  const { toast } = useToast();
  const { user, activeRole, loading: authLoading, needsRoleSelection, signIn, signUp, signInWithGoogle } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startRateLimitCountdown = () => {
    setRateLimitSeconds(120);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRateLimitSeconds((prev) => {
        if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  if (!authLoading && user) {
    if (needsRoleSelection) return <Navigate to="/choose-role" replace />;
    return <Navigate to={activeRole === 'business' ? '/business' : '/dashboard'} replace />;
  }

  const clearFieldError = (field: string) => setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

  const validateFields = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (isSignUp && !formData.name.trim()) errors.name = 'Please enter your name';
    if (!formData.email.trim()) errors.email = 'Please enter your email';
    else if (!EMAIL_REGEX.test(formData.email)) errors.email = 'Please enter a valid email address';
    if (!formData.password) errors.password = 'Please enter your password';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleError = (errorCode: string) => {
    switch (errorCode) {
      case 'RATE_LIMIT':
        startRateLimitCountdown();
        toast({ title: 'Too many attempts', description: 'Please wait 2 minutes and try again.', variant: 'destructive' });
        break;
      case 'TIMEOUT':
        toast({ title: 'Request timed out', description: 'This is taking too long. Please try again.', variant: 'destructive' });
        break;
      case 'NETWORK_ERROR':
        toast({ title: 'Connection problem', description: 'Check your internet and try again.', variant: 'destructive' });
        break;
      case 'ALREADY_REGISTERED':
        toast({ title: 'Account exists', description: 'This email is already registered. Please sign in instead.', variant: 'destructive' });
        setIsSignUp(false);
        break;
      default:
        toast({ title: isSignUp ? 'Sign up failed' : 'Sign in failed', description: errorCode, variant: 'destructive' });
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) toast({ title: 'Google sign-in failed', description: error, variant: 'destructive' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFields()) return;
    if (rateLimitSeconds > 0) {
      toast({ title: 'Please wait', description: `Try again in ${rateLimitSeconds} seconds.`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUp(formData.email, formData.password, formData.name);
        if (result.error) { handleError(result.error); return; }
        toast({ title: 'Welcome to DEXO!', description: 'Your account has been created. Choose how you want to use DEXO next.' });
      } else {
        const result = await signIn(formData.email, formData.password);
        if (result.error) { handleError(result.error); return; }
      }
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex font-sans">
      <Helmet>
        <title>{isSignUp ? 'Sign Up' : 'Sign In'} | DEXO</title>
        <meta name="description" content="Sign in or create your DEXO account to design spaces with AI and connect with interior design professionals." />
      </Helmet>

      {/* Left panel: form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-cream">
        <motion.div
          className="w-full max-w-md space-y-8"
          variants={scaleInVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUpVariants} initial="hidden" animate="visible">
            <Link to="/" className="inline-flex items-center gap-2 text-stone hover:text-navy transition-colors mb-8 luxury-link font-sans text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
            <h1 className="font-serif text-3xl font-semibold text-navy mb-2 tracking-tight">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="font-sans text-stone text-sm leading-relaxed">
              {isSignUp
                ? 'Create your account, then choose how you want to use DEXO.'
                : 'Sign in first, then continue to the right experience for you.'}
            </p>
          </motion.div>

          {/* Google SSO */}
          <button
            type="button"
            className="w-full h-12 flex items-center justify-center gap-3 rounded-sm border border-navy/15 bg-white font-sans text-sm font-medium text-navy hover:bg-cream-warm hover:border-navy/25 transition-all duration-200 disabled:opacity-50"
            onClick={handleGoogleSignIn}
            disabled={submitting || rateLimitSeconds > 0}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-navy/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-cream px-3 text-stone/50 font-sans tracking-wider">Or continue with email</span>
            </div>
          </div>

          {rateLimitSeconds > 0 && (
            <div className="rounded-sm bg-red-50 border border-red-200 p-4 text-center">
              <p className="font-sans text-sm font-medium text-red-600">
                Too many attempts. Try again in {Math.floor(rateLimitSeconds / 60)}:{String(rateLimitSeconds % 60).padStart(2, '0')}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-1">
                <label htmlFor="name" className="block font-sans text-xs font-medium text-navy/60 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  autoComplete="name"
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearFieldError('name'); }}
                  className={`w-full bg-transparent border-0 border-b pb-2 font-sans text-[15px] text-navy placeholder:text-stone/40 focus:outline-none transition-colors duration-200 ${
                    fieldErrors.name
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-navy/25 focus:border-terracotta'
                  }`}
                />
                {fieldErrors.name && <p className="font-sans text-xs text-red-500">{fieldErrors.name}</p>}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email" className="block font-sans text-xs font-medium text-navy/60 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                autoComplete="email"
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); clearFieldError('email'); }}
                className={`w-full bg-transparent border-0 border-b pb-2 font-sans text-[15px] text-navy placeholder:text-stone/40 focus:outline-none transition-colors duration-200 ${
                  fieldErrors.email
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-navy/25 focus:border-terracotta'
                }`}
              />
              {fieldErrors.email && <p className="font-sans text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block font-sans text-xs font-medium text-navy/60 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                onChange={(e) => { setFormData({ ...formData, password: e.target.value }); clearFieldError('password'); }}
                className={`w-full bg-transparent border-0 border-b pb-2 font-sans text-[15px] text-navy placeholder:text-stone/40 focus:outline-none transition-colors duration-200 ${
                  fieldErrors.password
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-navy/25 focus:border-terracotta'
                }`}
              />
              {fieldErrors.password && <p className="font-sans text-xs text-red-500">{fieldErrors.password}</p>}
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full mt-2"
              disabled={submitting || rateLimitSeconds > 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setFieldErrors({}); }}
              className="font-sans text-sm text-stone hover:text-navy transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Right panel: brand */}
      <motion.div
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #B4552D 0%, #C8704A 40%, #D4956E 100%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DURATION.verySlow, ease: EASE.luxury }}
      >
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <filter id="authNoise">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#authNoise)" />
          </svg>
        </div>
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.12), transparent 65%)' }} />

        <div className="relative z-10 max-w-lg text-center space-y-6">
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, delay: 0.2, ease: EASE.entrance }}
          >
            <img src={dexoLogoFull} alt="DEXO" className="h-16 w-auto brightness-0 invert" />
          </motion.div>
          <motion.p
            className="font-serif text-xl text-white/85 leading-relaxed italic"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, delay: 0.35, ease: EASE.entrance }}
          >
            "Every space deserves to feel like home.
            DEXO brings together dreamers and designers."
          </motion.p>
          <motion.div
            className="flex items-center justify-center gap-3 font-sans text-sm text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.slow, delay: 0.5 }}
          >
            <div className="w-8 h-8 rounded-sm bg-white/20 flex items-center justify-center text-white/80 text-xs font-medium">
              D
            </div>
            <span>Trusted by 500+ designers worldwide</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
