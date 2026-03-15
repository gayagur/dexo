import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, ChevronDown, Shield, ArrowLeftRight, Palette, Briefcase } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { toast } from 'sonner';

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activeRole, isAdmin, signOut, switchRole } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [hasBusinessProfile, setHasBusinessProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if user has a business profile (for showing switch option)
  useEffect(() => {
    if (!user) return;
    supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setHasBusinessProfile(!!data));
  }, [user]);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url || '';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const homePath = '/home';

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSwitchRole = async () => {
    const targetRole = activeRole === 'business' ? 'customer' : 'business';

    if (targetRole === 'business' && !hasBusinessProfile) {
      // No business profile yet — send to onboarding
      navigate('/business/onboarding');
      return;
    }

    const { error } = await switchRole(targetRole);
    if (error) {
      toast.error('Failed to switch role');
      return;
    }

    // Navigate to the appropriate dashboard
    navigate(targetRole === 'business' ? '/business' : '/dashboard');
  };

  const switchLabel = activeRole === 'business' ? 'Switch to Client' : 'Switch to Creator';
  const SwitchIcon = activeRole === 'business' ? Briefcase : Palette;

  return (
    <header
      className={`sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b transition-all duration-300 ${
        scrolled
          ? 'border-border shadow-md'
          : 'border-border/50 shadow-none'
      }`}
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left — Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link
            to={homePath}
            className="text-2xl font-serif font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            DEXO
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {(activeRole === 'business'
              ? [
                  { to: '/home', label: 'Home' },
                  { to: '/business', label: 'Projects' },
                  { to: '/business/offers', label: 'Offers' },
                  { to: '/business/conversations', label: 'Messages' },
                ]
              : [
                  { to: '/home', label: 'Home' },
                  { to: '/dashboard', label: 'Projects' },
                  { to: '/browse-businesses', label: 'Creators' },
                ]
            ).map(({ to, label }) => {
              const isActive = location.pathname === to
                || (to === '/dashboard' && location.pathname.startsWith('/project/'))
                || (to === '/business' && location.pathname.startsWith('/business/request/'));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'text-foreground bg-muted/70'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right — Role Switcher + Notifications + Avatar Dropdown */}
        <div className="flex items-center gap-1.5">
          {/* Role Switcher Button */}
          <button
            onClick={handleSwitchRole}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={switchLabel}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            {switchLabel}
          </button>

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                  <AvatarImage src={avatarUrl} alt={userName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                  {userName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5" sideOffset={8}>
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{userName}</span>
                  <span className="text-xs text-muted-foreground font-normal truncate">
                    {userEmail}
                  </span>
                  <span className="text-[10px] text-primary font-medium mt-0.5 uppercase tracking-wider">
                    {activeRole === 'business' ? 'Creator mode' : 'Client mode'}
                  </span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="my-1" />

              {/* Role switch in dropdown (for mobile too) */}
              <DropdownMenuItem
                onClick={handleSwitchRole}
                className="px-3 py-2 rounded-lg cursor-pointer gap-2.5"
              >
                <SwitchIcon className="w-4 h-4 text-muted-foreground" />
                <span>{switchLabel}</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="px-3 py-2 rounded-lg cursor-pointer gap-2.5"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <span>My Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="px-3 py-2 rounded-lg cursor-pointer gap-2.5"
                disabled
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Settings</span>
              </DropdownMenuItem>

              {isAdmin && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => navigate('/admin')}
                    className="px-3 py-2 rounded-lg cursor-pointer gap-2.5"
                  >
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span>Admin Panel</span>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="px-3 py-2 rounded-lg cursor-pointer gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
