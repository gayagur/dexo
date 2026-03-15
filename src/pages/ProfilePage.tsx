import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/app/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, Loader2, User, Mail, Phone, MapPin, FileText, Link2, Palette, Briefcase, ArrowRight } from 'lucide-react';

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  instagram: string;
  portfolio: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, activeRole, switchRole } = useAuth();
  const { toast } = useToast();
  const { uploading, uploadImage } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [hasBusinessProfile, setHasBusinessProfile] = useState<boolean | null>(null);

  // Check if user has a business profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setHasBusinessProfile(!!data));
  }, [user]);
  const [form, setForm] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    instagram: '',
    portfolio: '',
  });

  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata || {};
    setForm({
      name: meta.name || user.email?.split('@')[0] || '',
      email: user.email || '',
      phone: meta.phone || '',
      location: meta.location || '',
      bio: meta.bio || '',
      instagram: meta.instagram || '',
      portfolio: meta.portfolio || '',
    });
    setAvatarUrl(meta.avatar_url || '');
  }, [user]);

  const initials = form.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, 'project-images');
    if (url) {
      setAvatarUrl(url);
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      if (user) {
        await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      }
      toast({ title: 'Photo updated' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: form.name,
          phone: form.phone,
          location: form.location,
          bio: form.bio,
          instagram: form.instagram,
          portfolio: form.portfolio,
          avatar_url: avatarUrl,
        },
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: form.name, avatar_url: avatarUrl })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({ title: 'Profile saved successfully' });
    } catch (err) {
      toast({
        title: 'Failed to save profile',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const fields: {
    key: keyof ProfileFormData;
    label: string;
    icon: typeof User;
    placeholder: string;
    disabled?: boolean;
    multiline?: boolean;
  }[] = [
    { key: 'name', label: 'Full Name', icon: User, placeholder: 'Your full name' },
    { key: 'email', label: 'Email', icon: Mail, placeholder: 'your@email.com', disabled: true },
    { key: 'phone', label: 'Phone', icon: Phone, placeholder: '+1 (555) 000-0000' },
    { key: 'location', label: 'Location', icon: MapPin, placeholder: 'City, Country' },
    { key: 'bio', label: 'Short Bio', icon: FileText, placeholder: 'Tell us a bit about yourself...', multiline: true },
    { key: 'instagram', label: 'Instagram', icon: Link2, placeholder: '@yourhandle' },
    { key: 'portfolio', label: 'Portfolio URL', icon: Link2, placeholder: 'https://yoursite.com' },
  ];

  return (
    <AppLayout>
      <main className="container mx-auto px-6 py-10 max-w-2xl">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-serif mb-2">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and preferences.
          </p>
        </div>

        {/* Avatar Section */}
        <Card className="mb-6 overflow-hidden animate-slide-up">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-6">
              <div className="relative group shrink-0">
                <Avatar className="h-24 w-24 ring-4 ring-primary/10 shadow-md">
                  <AvatarImage src={avatarUrl} alt={form.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/0 group-hover:bg-foreground/40 transition-colors cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin opacity-0 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div>
                <h2 className="text-xl font-serif font-semibold text-foreground">
                  {form.name || 'Your Name'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{form.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fields */}
        <Card className="animate-slide-up" style={{ animationDelay: '80ms' }}>
          <CardContent className="p-6 sm:p-8 space-y-5">
            {fields.map(({ key, label, icon: Icon, placeholder, disabled, multiline }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  {label}
                </label>
                {multiline ? (
                  <textarea
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm
                               placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2
                               focus:ring-ring/30 focus:border-ring/30 transition-all resize-none leading-relaxed"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm
                               placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2
                               focus:ring-ring/30 focus:border-ring/30 transition-all
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                )}
              </div>
            ))}

            <div className="pt-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto gap-2"
                size="lg"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activate Other Role */}
        {activeRole === 'customer' && !hasBusinessProfile && (
          <Card className="mt-6 animate-slide-up border-primary/20 bg-primary/[0.03]" style={{ animationDelay: '160ms' }}>
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Become a Creator</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Set up your creator profile to showcase your work and receive project requests from clients.
                  </p>
                  <Button
                    onClick={() => navigate('/business/onboarding')}
                    className="mt-4 gap-2"
                    size="sm"
                  >
                    Set Up Creator Profile
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeRole === 'business' && (
          <Card className="mt-6 animate-slide-up border-blue-500/20 bg-blue-500/[0.03]" style={{ animationDelay: '160ms' }}>
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 shrink-0">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Switch to Client Mode</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Browse creators and submit your own design projects as a client.
                  </p>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const { error } = await switchRole('customer');
                      if (error) {
                        toast({ title: 'Failed to switch', description: error, variant: 'destructive' });
                        return;
                      }
                      navigate('/dashboard');
                    }}
                    className="mt-4 gap-2"
                    size="sm"
                  >
                    Switch to Client
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </AppLayout>
  );
};

export default ProfilePage;
