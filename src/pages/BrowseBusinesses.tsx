import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { categories, styleOptions } from '@/lib/data';
import { AppLayout } from '@/components/app/AppLayout';
import type { Business } from '@/lib/database.types';
import {
  ArrowLeft,
  Search,
  Star,
  MapPin,
  Filter,
  X,
  Loader2
} from 'lucide-react';

const BrowseBusinesses = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [fetched, setFetched] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category') || null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(!!searchParams.get('category'));

  const loading = authLoading || (!fetched && !!user);

  // Fetch all businesses from Supabase — wait for auth first
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setFetched(true); return; }

    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .order('rating', { ascending: false });

        if (error) {
          console.error('[BrowseBusinesses] fetch error:', error.message);
        }
        setBusinesses((data as Business[]) ?? []);
      } catch (err) {
        console.error('[BrowseBusinesses] unexpected error:', err);
      } finally {
        setFetched(true);
      }
    };
    fetchBusinesses();
  }, [authLoading, user]);

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = !searchQuery ||
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.categories.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      business.styles.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      business.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || business.categories.includes(selectedCategory);
    const matchesStyles = selectedStyles.length === 0 ||
      selectedStyles.some(style => business.styles.includes(style));

    return matchesSearch && matchesCategory && matchesStyles;
  });

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedStyles([]);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory || selectedStyles.length > 0 || searchQuery;

  return (
    <AppLayout>
      <main className="container mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-serif mb-4">Find Creators</h1>
          <p className="text-muted-foreground text-lg">
            Browse talented creators and connect directly with the perfect match.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, style, category, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12"
              />
            </div>
            <Button
              variant="outline"
              className="h-12 gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>

          {showFilters && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Filters</h3>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-2" />
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selectedCategory === cat
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Style</label>
                  <div className="flex flex-wrap gap-2">
                    {styleOptions.map((style) => (
                      <button
                        key={style}
                        onClick={() => toggleStyle(style)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selectedStyles.includes(style)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading creators...</p>
          </div>
        )}

        {/* Results */}
        {!loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((business) => (
              <Link key={business.id} to={`/business-profile/${business.id}`}>
                <Card hover className="h-full">
                  {business.portfolio[0] && (
                    <div className="aspect-video overflow-hidden rounded-t-2xl">
                      <img
                        src={business.portfolio[0]}
                        alt={business.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-serif">{business.name}</h3>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">{business.rating}</span>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                      {business.description}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4" />
                      {business.location}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {business.categories.slice(0, 2).map((cat) => (
                        <span key={cat} className="px-2 py-1 bg-secondary rounded-full text-xs">
                          {cat}
                        </span>
                      ))}
                      {business.styles.slice(0, 2).map((style) => (
                        <span key={style} className="px-2 py-1 bg-accent/20 rounded-full text-xs">
                          {style}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!loading && filteredBusinesses.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-serif mb-2">No creators found</h3>
            <p className="text-muted-foreground mb-6">
              {businesses.length === 0
                ? 'No creators have signed up yet. Check back soon!'
                : 'Try adjusting your search or filters.'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </main>
    </AppLayout>
  );
};

export default BrowseBusinesses;
