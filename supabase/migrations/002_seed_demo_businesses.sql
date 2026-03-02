-- ============================================================
-- Seed demo businesses into the businesses table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- Temporarily disable FK checks so we can insert businesses
-- without needing real auth.users entries
SET session_replication_role = replica;

INSERT INTO public.businesses (user_id, name, description, location, categories, styles, portfolio, rating, min_price, max_price)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Crafted Studio',
    'Artisanal woodworking and custom furniture. We bring your vision to life with sustainable materials and timeless craftsmanship.',
    'Portland, OR',
    ARRAY['Furniture', 'Home Decor', 'Accessories'],
    ARRAY['Minimalist', 'Scandinavian', 'Mid-Century Modern', 'Organic'],
    ARRAY[
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&h=300&fit=crop'
    ],
    4.9, 500, 5000
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Terra Ceramics',
    'Handcrafted pottery and ceramic art. Each piece tells a story of earth, fire, and human touch.',
    'Austin, TX',
    ARRAY['Pottery', 'Home Decor', 'Tableware'],
    ARRAY['Organic', 'Wabi-Sabi', 'Contemporary', 'Rustic'],
    ARRAY[
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400&h=300&fit=crop'
    ],
    4.8, 50, 800
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Lumière Jewelry',
    E'Bespoke fine jewelry crafted with ethically sourced materials. Timeless pieces for life''s precious moments.',
    'New York, NY',
    ARRAY['Jewelry', 'Accessories'],
    ARRAY['Elegant', 'Minimalist', 'Art Deco', 'Bohemian'],
    ARRAY[
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=300&fit=crop'
    ],
    5.0, 200, 10000
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Threaded Designs',
    'Custom clothing and fashion pieces tailored to your unique style. From elegant evening wear to everyday essentials, we bring your fashion vision to life.',
    'Los Angeles, CA',
    ARRAY['Clothing', 'Fashion'],
    ARRAY['Contemporary', 'Elegant', 'Bohemian', 'Minimalist'],
    ARRAY[
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop'
    ],
    4.8, 300, 2500
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Canvas & Color Studio',
    'Original paintings, custom prints, and personalized art pieces. We transform your ideas into stunning visual masterpieces that tell your story.',
    'Chicago, IL',
    ARRAY['Art', 'Home Decor'],
    ARRAY['Contemporary', 'Abstract', 'Traditional', 'Modern'],
    ARRAY[
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=300&fit=crop'
    ],
    4.9, 150, 3000
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Illuminate Works',
    'Custom lighting design and handcrafted fixtures that illuminate your space with style. From modern pendants to vintage-inspired lamps, we create the perfect ambiance.',
    'Seattle, WA',
    ARRAY['Lighting', 'Home Decor'],
    ARRAY['Industrial', 'Modern', 'Minimalist', 'Mid-Century Modern'],
    ARRAY[
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=300&fit=crop'
    ],
    4.7, 200, 1800
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Fiber Art Studio',
    'Handcrafted textiles, embroidery, and woven art pieces. We blend traditional techniques with contemporary designs to create unique fabric artworks.',
    'Portland, ME',
    ARRAY['Textiles', 'Art', 'Home Decor'],
    ARRAY['Bohemian', 'Organic', 'Contemporary', 'Traditional'],
    ARRAY[
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=300&fit=crop'
    ],
    4.6, 100, 1200
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'Artisan Bakes',
    'Custom cakes and pastries designed for your special moments. From elegant wedding cakes to whimsical birthday creations, we craft edible art that tastes as good as it looks.',
    'San Francisco, CA',
    ARRAY['Custom Cakes', 'Pastries'],
    ARRAY['Elegant', 'Whimsical', 'Modern', 'Traditional'],
    ARRAY[
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1587668178277-295251f900ce?w=400&h=300&fit=crop'
    ],
    4.9, 80, 800
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    'Leather Works Co.',
    'Handcrafted leather goods including bags, wallets, and accessories. Each piece is meticulously crafted with premium materials and attention to detail that lasts a lifetime.',
    'Denver, CO',
    ARRAY['Leather Goods', 'Accessories'],
    ARRAY['Rustic', 'Minimalist', 'Industrial', 'Classic'],
    ARRAY[
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1584917869882-41a3b2d1d2e3?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=300&fit=crop'
    ],
    4.8, 120, 1200
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'PrintLab 3D',
    '3D printing and modern craft solutions for your unique projects. From functional prototypes to artistic sculptures, we bring digital designs to life with precision and creativity.',
    'Boston, MA',
    ARRAY['3D Printing', 'Modern Crafts', 'Accessories'],
    ARRAY['Modern', 'Futuristic', 'Minimalist', 'Geometric'],
    ARRAY[
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&h=300&fit=crop'
    ],
    4.7, 50, 1500
  );

-- Re-enable FK checks
SET session_replication_role = DEFAULT;
