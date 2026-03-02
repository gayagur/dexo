import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { categories, styleOptions, materialOptions } from '@/lib/data';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Check,
  LogOut,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BusinessOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { createBusiness } = useBusinessProfile();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const { error } = await createBusiness({
      user_id: user.id,
      name: formData.name,
      description: formData.description,
      categories: formData.categories,
      styles: formData.styles,
      portfolio: formData.portfolio,
      location: formData.location,
      min_price: parseInt(formData.priceMin) || null,
      max_price: parseInt(formData.priceMax) || null,
    });

    if (error) {
      toast({
        title: "Failed to create profile",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome to DEXO!",
        description: "Your creator profile is ready. Projects matching your profile will appear soon.",
      });
      navigate('/business');
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-serif font-semibold text-primary">DEXO</Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <span className="text-sm text-primary font-medium">Step 1 of 4</span>
                <h1 className="text-3xl font-serif mt-2">Tell us about your business</h1>
                <p className="text-muted-foreground mt-2">
                  This helps customers find and understand your work.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business / Studio Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Handcrafted by Sarah"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">About your work</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell potential clients what makes your work special..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline (optional)</Label>
                  <Input
                    id="tagline"
                    placeholder="e.g., Where craftsmanship meets creativity"
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

          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <span className="text-sm text-primary font-medium">Step 2 of 4</span>
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

          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <span className="text-sm text-primary font-medium">Step 3 of 4</span>
                <h1 className="text-3xl font-serif mt-2">Showcase your work</h1>
                <p className="text-muted-foreground mt-2">
                  Add some photos of your best pieces.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formData.portfolio.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const sampleImages = [
                      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
                      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=400&fit=crop',
                      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&h=400&fit=crop',
                    ];
                    const nextImage = sampleImages[formData.portfolio.length % sampleImages.length];
                    setFormData({
                      ...formData,
                      portfolio: [...formData.portfolio, nextImage],
                    });
                  }}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-3 transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Add photo</span>
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Click to add demo portfolio images
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <span className="text-sm text-primary font-medium">Step 4 of 4</span>
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

            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!formData.name || formData.categories.length === 0)}
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
                    Creating...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Check className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BusinessOnboarding;
