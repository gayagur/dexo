import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/lib/database.types';
import { ArrowLeft, User, Briefcase, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, role, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(
    (searchParams.get('role') as Role) || null
  );
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // Inline validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  }>({});

  // Rate limit countdown
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startRateLimitCountdown = () => {
    setRateLimitSeconds(120);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRateLimitSeconds(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // If already logged in, redirect to home
  if (!authLoading && user && role) {
    return <Navigate to="/home" replace />;
  }

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  /** Returns true if all fields are valid */
  const validateFields = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!selectedRole) {
      errors.role = "Please select a role";
    }

    if (isSignUp && !formData.name.trim()) {
      errors.name = "Please enter your name";
    }

    if (!formData.email.trim()) {
      errors.email = "Please enter your email";
    } else if (!EMAIL_REGEX.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Please enter your password";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleError = (errorCode: string) => {
    switch (errorCode) {
      case "RATE_LIMIT":
        startRateLimitCountdown();
        toast({
          title: "Too many attempts",
          description: "Please wait 2 minutes and try again.",
          variant: "destructive",
        });
        break;
      case "TIMEOUT":
        toast({
          title: "Request timed out",
          description: "This is taking too long. Please try again.",
          variant: "destructive",
        });
        break;
      case "NETWORK_ERROR":
        toast({
          title: "Connection problem",
          description: "Check your internet and try again.",
          variant: "destructive",
        });
        break;
      case "ALREADY_REGISTERED":
        toast({
          title: "Account exists",
          description: "This email is already registered. Please sign in instead.",
          variant: "destructive",
        });
        setIsSignUp(false);
        break;
      default:
        toast({
          title: isSignUp ? "Sign up failed" : "Sign in failed",
          description: errorCode,
          variant: "destructive",
        });
    }
  };

  const handleGoogleSignIn = async () => {
    if (!selectedRole) {
      setFieldErrors(prev => ({ ...prev, role: "Please select a role first" }));
      return;
    }
    // Persist role before OAuth redirect — useAuth picks it up on return
    localStorage.setItem('dexo_oauth_role', selectedRole);
    const { error } = await signInWithGoogle();
    if (error) {
      localStorage.removeItem('dexo_oauth_role');
      toast({ title: "Google sign-in failed", description: error, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation first — no Supabase call if invalid
    if (!validateFields()) return;

    if (rateLimitSeconds > 0) {
      toast({
        title: "Please wait",
        description: `Try again in ${rateLimitSeconds} seconds.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (isSignUp) {
        const result = await signUp(formData.email, formData.password, formData.name, selectedRole!);
        if (result.error) {
          handleError(result.error);
          return;
        }
        toast({
          title: "Welcome to DEXO!",
          description: "Your account has been created.",
        });
        navigate('/home');
      } else {
        const result = await signIn(formData.email, formData.password, selectedRole!);
        if (result.error) {
          handleError(result.error);
          return;
        }

        // Role mismatch: user picked wrong role
        if (result.roleMismatch) {
          const actual = result.roleMismatch.actualRole;
          const label = actual === 'business' ? 'Creator' : 'Customer';
          toast({
            title: `This account is registered as a ${label}`,
            description: "Switching you to the right dashboard.",
          });
          navigate('/home');
          return;
        }

        toast({
          title: "Welcome back!",
          description: "Redirecting you to your dashboard...",
        });
        navigate('/home');
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
            <h1 className="text-3xl font-serif mb-2">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp
                ? 'Join DEXO and start creating something unique.'
                : 'Sign in to continue your creative journey.'}
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label>I am a...</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setSelectedRole('customer'); clearFieldError('role'); }}
                className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                  selectedRole === 'customer'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : fieldErrors.role
                      ? 'border-destructive'
                      : 'border-border hover:border-primary/50'
                }`}
              >
                <User className={`w-8 h-8 mb-3 ${selectedRole === 'customer' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="font-medium">Customer</div>
                <div className="text-sm text-muted-foreground">I want custom products</div>
              </button>
              <button
                type="button"
                onClick={() => { setSelectedRole('business'); clearFieldError('role'); }}
                className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                  selectedRole === 'business'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : fieldErrors.role
                      ? 'border-destructive'
                      : 'border-border hover:border-primary/50'
                }`}
              >
                <Briefcase className={`w-8 h-8 mb-3 ${selectedRole === 'business' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="font-medium">Creator</div>
                <div className="text-sm text-muted-foreground">I create custom work</div>
              </button>
            </div>
            {fieldErrors.role && (
              <p className="text-sm text-destructive">{fieldErrors.role}</p>
            )}
          </div>

          {/* Google Sign-In */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
            onClick={handleGoogleSignIn}
            disabled={submitting || rateLimitSeconds > 0}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {/* Rate limit banner */}
          {rateLimitSeconds > 0 && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-center">
              <p className="text-sm font-medium text-destructive">
                Too many attempts. Try again in {Math.floor(rateLimitSeconds / 60)}:{String(rateLimitSeconds % 60).padStart(2, '0')}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearFieldError('name'); }}
                  className={`h-12 ${fieldErrors.name ? 'border-destructive' : ''}`}
                />
                {fieldErrors.name && (
                  <p className="text-sm text-destructive">{fieldErrors.name}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); clearFieldError('email'); }}
                className={`h-12 ${fieldErrors.email ? 'border-destructive' : ''}`}
              />
              {fieldErrors.email && (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => { setFormData({ ...formData, password: e.target.value }); clearFieldError('password'); }}
                className={`h-12 ${fieldErrors.password ? 'border-destructive' : ''}`}
              />
              {fieldErrors.password && (
                <p className="text-sm text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting || rateLimitSeconds > 0}>
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
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary items-center justify-center p-12">
        <div className="max-w-lg text-center space-y-6">
          <div className="text-6xl font-serif text-primary">DEXO</div>
          <p className="text-xl text-muted-foreground leading-relaxed">
            "The best ideas deserve to become real.
            DEXO brings together dreamers and makers."
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/20" />
            <span>Trusted by 1,000+ creators worldwide</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
