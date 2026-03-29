import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { User, Settings, LogOut, ChevronDown, Shield, Menu, ArrowRightLeft } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activeRole, isAdmin, isCreator, creatorApproved, switchRole, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const navLinks = activeRole === 'creator'
    ? [
        { to: '/home', label: 'Home' },
        { to: '/creator/dashboard', label: 'Dashboard' },
      ]
    : activeRole === 'business'
    ? [
        { to: '/home', label: 'Home' },
        { to: '/business', label: 'Dashboard' },
        { to: '/business/projects', label: 'Projects' },
        { to: '/business/conversations', label: 'Messages' },
      ]
    : [
        { to: '/home', label: 'Home' },
        { to: '/dashboard', label: 'Projects' },
        { to: '/browse-businesses', label: 'Creators' },
      ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

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

          {/* Mobile hamburger - visible below md */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden h-11 w-11 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="flex flex-col pt-12 px-4">
                {navLinks.map(({ to, label }) => {
                  const isActive = location.pathname === to
                    || (to === '/dashboard' && location.pathname.startsWith('/project/'))
                    || (to === '/business' && location.pathname.startsWith('/business/request/'));
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`h-12 flex items-center px-3 rounded-lg text-sm font-medium transition-colors ${
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
            </SheetContent>
          </Sheet>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => {
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

        {/* Right — Notifications + Avatar Dropdown */}
        <div className="flex items-center gap-1.5">
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
                    {activeRole === 'creator' ? 'Creator mode' : activeRole === 'business' ? 'Business mode' : 'Client mode'}
                  </span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="my-1" />

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

              {isCreator && creatorApproved && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={async () => {
                      if (activeRole === 'creator') {
                        await switchRole('customer');
                        navigate('/dashboard');
                      } else {
                        await switchRole('creator');
                        navigate('/creator/dashboard');
                      }
                    }}
                    className="px-3 py-2 rounded-lg cursor-pointer gap-2.5"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                    <span>{activeRole === 'creator' ? 'Switch to Client' : 'Switch to Creator'}</span>
                  </DropdownMenuItem>
                </>
              )}

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
