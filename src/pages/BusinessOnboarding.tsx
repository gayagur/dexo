import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AppLayout } from '@/components/app/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/lib/supabase';
import { categories, styleOptions, materialOptions } from '@/lib/data';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Check,
  Loader2,
  X,
  Instagram,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TOTAL_STEPS = 5;

const BusinessOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { business, loading: bizLoading, createBusiness, updateBusiness } = useBusinessProfile();
  const { uploading: portfolioUploading, uploadMultiple } = useImageUpload();
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Instagram import state
  const [igUrl, setIgUrl] = useState('');
  const [igImporting, setIgImporting] = useState(false);
  const [igImported, setIgImported] = useState(false);

  // Whether we're editing an existing profile
  const isEditing = !!business;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tagline: '',
    categories: [] as string[],
    styles: [] as string[],
    materials: [] as string[],
    priceMin: '',
    priceMax: '',
    location: '',
    serviceArea: '',
    leadTime: '',
    portfolio: [] as string[],
  });

  // Pre-fill form when editing an existing business
  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        description: business.description || '',
        tagline: '',
        categories: business.categories || [],
        styles: business.styles || [],
        materials: [],
        priceMin: business.min_price?.toString() || '',
        priceMax: business.max_price?.toString() || '',
        location: business.location || '',
        serviceArea: '',
        leadTime: '',
        portfolio: business.portfolio || [],
      });
      // Skip Instagram step when editing — go straight to details
      setStep(2);
    }
  }, [business]);

  const toggleCategory = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const toggleStyle = (style: string) => {
    setFormData(prev => ({
      ...prev,
      styles: prev.styles.includes(style)
        ? prev.styles.filter(s => s !== style)
        : [...prev.styles, style],
    }));
  };

  const toggleMaterial = (material: string) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.includes(material)
        ? prev.materials.filter(m => m !== material)
        : [...prev.materials, material],
    }));
  };

  // ── Instagram import ─────────────────────────────────
  const handleInstagramImport = async () => {
    if (!igUrl.trim()) return;
    setIgImporting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ instagramUrl: igUrl.trim() }),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        toast({
          title: 'Import failed',
          description: result.error || "We couldn't find this profile. Make sure it's public and try again.",
          variant: 'destructive',
        });
        setIgImporting(false);
        return;
      }

      // Auto-fill form fields
      setFormData(prev => ({
        ...prev,
        name: result.fullName || prev.name,
        description: result.bio || prev.description,
        portfolio: [
          ...prev.portfolio,
          ...(result.portfolioImages || []),
        ],
      }));

      setIgImported(true);
      toast({
        title: 'Profile imported!',
        description: "We found your profile! Review and edit your details below.",
      });

      // Auto-advance to step 2 (business details)
      setStep(2);
    } catch {
      toast({
        title: 'Import failed',
        description: 'Something went wrong. Please try again or fill in manually.',
        variant: 'destructive',
      });
    } finally {
      setIgImporting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const profileData = {
      name: formData.name,
      description: formData.description,
      categories: formData.categories,
      styles: formData.styles,
      portfolio: formData.portfolio,
      location: formData.location,
      min_price: parseInt(formData.priceMin) || null,
      max_price: parseInt(formData.priceMax) || null,
    };

    let error: string | null;

    if (isEditing && business) {
      // Update existing profile — set back to pending for re-review
      const result = await updateBusiness(business.id, {
        ...profileData,
        status: 'pending',
        rejection_reason: null,
      });
      error = result.error;
    } else {
      // Create new profile
      const result = await createBusiness({
        ...profileData,
        user_id: user.id,
        status: 'pending',
        rejection_reason: null,
      });
      error = result.error;
    }

    if (error) {
      toast({
        title: "Failed to save profile",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: isEditing ? "Profile updated!" : "Welcome to DEXO!",
        description: isEditing
          ? "Your profile has been resubmitted for review."
          : "Your creator profile has been submitted for review.",
      });
      navigate('/business');
    }
    setSubmitting(false);
  };

  if (bizLoading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Progress */}
      <div className="bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">

          {/* ─── Step 1: Instagram Import (optional) ─── */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <span className="text-sm text-primary font-medium">Step 1 of {TOTAL_STEPS}</span>
                <h1 className="text-3xl font-serif mt-2">Set up your creator profile</h1>
                <p className="text-muted-foreground mt-2">
                  Want to save time? Import your profile from Instagram.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Instagram className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Import from Instagram</h3>
                    <p className="text-sm text-muted-foreground">
                      We'll fill in your name, bio, and portfolio images automatically.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Input
                    placeholder="https://instagram.com/yourusername"
                    value={igUrl}
                    onChange={(e) => setIgUrl(e.target.value)}
                    className="h-12 bg-white dark:bg-background"
                    disabled={igImporting}
                  />
                  <Button
                    onClick={handleInstagramImport}
                    disabled={!igUrl.trim() || igImporting}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    {igImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Importing your profile from Instagram...
                      </>
                    ) : (
                      <>
                        <Instagram className="w-4 h-4 mr-2" />
                        Import from Instagram
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                >
                  Skip, I'll fill in manually
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 2: Business Details ─── */}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <span className="text-sm text-primary font-medium">Step 2 of {TOTAL_STEPS}</span>
                <h1 className="text-3xl font-serif mt-2">Tell us about your business</h1>
                <p className="text-muted-foreground mt-2">
                  {igImported
                    ? "We imported your details — feel free to edit anything before continuing."
                    : "This helps customers find and understand your work."}
                </p>
                {igImported && (
                  <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    Imported from Instagram — edit as needed
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business / Studio Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Modern Spaces by Sarah"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">About your work</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell potential clients what makes your design work special..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline (optional)</Label>
                  <Input
                    id="tagline"
                    placeholder="e.g., Where great design meets great spaces"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-3">
                  <Label>What do you create?</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-4 py-2 rounded-full border-2 transition-all text-sm ${
                          formData.categories.includes(cat)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {formData.categories.includes(cat) && <Check className="w-4 h-4 inline mr-1" />}
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 3: Style & Materials ─── */}
          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <span className="text-sm text-primary font-medium">Step 3 of {TOTAL_STEPS}</span>
                <h1 className="text-3xl font-serif mt-2">Your style & materials</h1>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Styles you work in</Label>
                  <div className="flex flex-wrap gap-2">
                    {styleOptions.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => toggleStyle(style)}
                        className={`px-4 py-2 rounded-full border-2 transition-all text-sm ${
                          formData.styles.includes(style)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {formData.styles.includes(style) && <Check className="w-4 h-4 inline mr-1" />}
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Materials you work with</Label>
                  <div className="flex flex-wrap gap-2">
                    {materialOptions.map((material) => (
                      <button
                        key={material}
                        type="button"
                        onClick={() => toggleMaterial(material)}
                        className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                          formData.materials.includes(material)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {material}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Price ($)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={formData.priceMin}
                      onChange={(e) => setFormData({ ...formData, priceMin: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Price ($)</Label>
                    <Input
                      type="number"
                      placeholder="5000"
                      value={formData.priceMax}
                      onChange={(e) => setFormData({ ...formData, priceMax: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Location (City, State)</Label>
                  <Input
                    placeholder="e.g., Austin, TX"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Service Area</Label>
                  <Input
                    placeholder="e.g., Nationwide, Local only, International"
                    value={formData.serviceArea}
                    onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Typical Lead Time</Label>
                  <Input
                    placeholder="e.g., 2-4 weeks, 1-2 months"
                    value={formData.leadTime}
                    onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
                    className="h-12"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 4: Portfolio ─── */}
          {step === 4 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <span className="text-sm text-primary font-medium">Step 4 of {TOTAL_STEPS}</span>
                <h1 className="text-3xl font-serif mt-2">Showcase your work</h1>
                <p className="text-muted-foreground mt-2">
                  {formData.portfolio.length > 0 && igImported
                    ? "We imported some photos from your Instagram. Add more or remove any you don't want."
                    : "Add some photos of your best pieces."}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formData.portfolio.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden relative group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, portfolio: formData.portfolio.filter((_, idx) => idx !== i) })}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => portfolioInputRef.current?.click()}
                  disabled={portfolioUploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-3 transition-colors disabled:opacity-50"
                >
                  {portfolioUploading ? (
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {portfolioUploading ? 'Uploading...' : 'Add photo'}
                  </span>
                </button>

                <input
                  ref={portfolioInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    const urls = await uploadMultiple(files, 'portfolio-images');
                    setFormData((prev) => ({ ...prev, portfolio: [...prev.portfolio, ...urls] }));
                    if (portfolioInputRef.current) portfolioInputRef.current.value = '';
                  }}
                />
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Upload photos of your best work
              </p>
            </div>
          )}

          {/* ─── Step 5: Review ─── */}
          {step === 5 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <span className="text-sm text-primary font-medium">Step 5 of {TOTAL_STEPS}</span>
                <h1 className="text-3xl font-serif mt-2">Review your profile</h1>
                <p className="text-muted-foreground mt-2">
                  Make sure everything looks good before going live.
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-muted/30 space-y-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Business Name</span>
                    <p className="font-medium">{formData.name || 'Not set'}</p>
                  </div>
                  {formData.tagline && (
                    <div>
                      <span className="text-sm text-muted-foreground">Tagline</span>
                      <p className="font-medium">{formData.tagline}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">About</span>
                    <p className="text-sm">{formData.description || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Categories</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.categories.map(cat => (
                        <span key={cat} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Styles</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.styles.map(style => (
                        <span key={style} className="px-2 py-1 bg-accent/20 rounded-full text-xs">
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Price Range</span>
                      <p className="font-medium">${formData.priceMin || 0} - ${formData.priceMax || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Location</span>
                      <p className="font-medium">{formData.location || 'Not set'}</p>
                    </div>
                  </div>

                  {/* Portfolio preview in review */}
                  {formData.portfolio.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Portfolio ({formData.portfolio.length} photos)</span>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {formData.portfolio.slice(0, 4).map((img, i) => (
                          <div key={i} className="aspect-square rounded-lg overflow-hidden">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            {step < TOTAL_STEPS ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && (!formData.name || formData.categories.length === 0)}
                className="gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                variant="warm"
                className="gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEditing ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEditing ? 'Save & Resubmit' : 'Complete Setup'}
                    <Check className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default BusinessOnboarding;
