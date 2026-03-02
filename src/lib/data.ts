// Demo data for DEXO platform

export type UserRole = 'customer' | 'business';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Business {
  id: string;
  userId: string;
  name: string;
  description: string;
  categories: string[];
  styles: string[];
  materials: string[];
  priceRange: { min: number; max: number };
  location: string;
  portfolio: string[];
  rating: number;
  completedProjects: number;
}

export type ProjectStatus = 
  | 'draft' 
  | 'sent' 
  | 'offers_received' 
  | 'in_progress' 
  | 'completed';

export interface Project {
  id: string;
  customerId: string;
  title: string;
  category: string;
  description: string;
  inspirationImages: string[];
  styleTags: string[];
  details: {
    size?: string;
    materials?: string[];
    timing?: string;
  };
  budget: { min: number; max: number };
  status: ProjectStatus;
  aiConcept?: string;
  aiBrief?: string;
  createdAt: Date;
  matchedBusinesses?: string[];
}

export interface Offer {
  id: string;
  projectId: string;
  businessId: string;
  price: number;
  timeline: string;
  note: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export interface Message {
  id: string;
  projectId: string;
  senderId: string;
  senderType: 'customer' | 'business';
  content: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  imageUrl?: string;
  createdAt: Date;
}

// Demo Users
export const demoUsers: User[] = [
  {
    id: 'customer-1',
    email: 'emma@example.com',
    name: 'Emma Thompson',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-2',
    email: 'sarah@example.com',
    name: 'Sarah Johnson',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-3',
    email: 'michael@example.com',
    name: 'Michael Chen',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-4',
    email: 'lisa@example.com',
    name: 'Lisa Park',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-5',
    email: 'david@example.com',
    name: 'David Wilson',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-6',
    email: 'jennifer@example.com',
    name: 'Jennifer Martinez',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-7',
    email: 'robert@example.com',
    name: 'Robert Brown',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-8',
    email: 'amanda@example.com',
    name: 'Amanda Lee',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-9',
    email: 'james@example.com',
    name: 'James Taylor',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-10',
    email: 'maria@example.com',
    name: 'Maria Garcia',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-11',
    email: 'thomas@example.com',
    name: 'Thomas Anderson',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-12',
    email: 'rachel@example.com',
    name: 'Rachel Green',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-13',
    email: 'chris@example.com',
    name: 'Chris Johnson',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1502378735452-bc7d86632805?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-14',
    email: 'alex@example.com',
    name: 'Alex Rodriguez',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-15',
    email: 'nicole@example.com',
    name: 'Nicole Williams',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-16',
    email: 'daniel@example.com',
    name: 'Daniel White',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-17',
    email: 'olivia@example.com',
    name: 'Olivia Davis',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-18',
    email: 'sophie@example.com',
    name: 'Sophie Brown',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-19',
    email: 'mark@example.com',
    name: 'Mark Johnson',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-20',
    email: 'jessica@example.com',
    name: 'Jessica Taylor',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
  },
  {
    id: 'customer-21',
    email: 'ryan@example.com',
    name: 'Ryan Miller',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
  },
  {
    id: 'business-1',
    email: 'studio@crafted.com',
    name: 'Alex Chen',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    id: 'business-2',
    email: 'terra@ceramics.com',
    name: 'Maya Rodriguez',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
  {
    id: 'business-3',
    email: 'contact@lumierejewelry.com',
    name: 'Sophie Laurent',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
  },
  {
    id: 'business-4',
    email: 'hello@threadeddesigns.com',
    name: 'Jordan Kim',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
  },
  {
    id: 'business-5',
    email: 'info@canvasandcolor.com',
    name: 'Riley Martinez',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop',
  },
  {
    id: 'business-6',
    email: 'design@illuminateworks.com',
    name: 'Taylor Brooks',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
  },
  {
    id: 'business-7',
    email: 'weave@fiberartstudio.com',
    name: 'Morgan Lee',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
  },
  {
    id: 'business-8',
    email: 'sweet@artisanbakes.com',
    name: 'Casey Williams',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop',
  },
  {
    id: 'business-9',
    email: 'craft@leatherworks.com',
    name: 'Drew Anderson',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=100&h=100&fit=crop',
  },
  {
    id: 'business-10',
    email: 'hello@printlab3d.com',
    name: 'Sam Chen',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1502378735452-bc7d86632805?w=100&h=100&fit=crop',
  },
];

// Demo Businesses
export const demoBusinesses: Business[] = [
  {
    id: 'biz-1',
    userId: 'business-1',
    name: 'Crafted Studio',
    description: 'Artisanal woodworking and custom furniture. We bring your vision to life with sustainable materials and timeless craftsmanship.',
    categories: ['Furniture', 'Home Decor', 'Accessories'],
    styles: ['Minimalist', 'Scandinavian', 'Mid-Century Modern', 'Organic'],
    materials: ['Oak', 'Walnut', 'Maple', 'Reclaimed Wood'],
    priceRange: { min: 500, max: 5000 },
    location: 'Portland, OR',
    portfolio: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&h=300&fit=crop',
    ],
    rating: 4.9,
    completedProjects: 47,
  },
  {
    id: 'biz-2',
    userId: 'business-2',
    name: 'Terra Ceramics',
    description: 'Handcrafted pottery and ceramic art. Each piece tells a story of earth, fire, and human touch.',
    categories: ['Pottery', 'Home Decor', 'Tableware'],
    styles: ['Organic', 'Wabi-Sabi', 'Contemporary', 'Rustic'],
    materials: ['Stoneware', 'Porcelain', 'Earthenware'],
    priceRange: { min: 50, max: 800 },
    location: 'Austin, TX',
    portfolio: [
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400&h=300&fit=crop',
    ],
    rating: 4.8,
    completedProjects: 82,
  },
  {
    id: 'biz-3',
    userId: 'business-3',
    name: 'Lumière Jewelry',
    description: 'Bespoke fine jewelry crafted with ethically sourced materials. Timeless pieces for life\'s precious moments.',
    categories: ['Jewelry', 'Accessories'],
    styles: ['Elegant', 'Minimalist', 'Art Deco', 'Bohemian'],
    materials: ['Gold', 'Silver', 'Platinum', 'Gemstones'],
    priceRange: { min: 200, max: 10000 },
    location: 'New York, NY',
    portfolio: [
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=300&fit=crop',
    ],
    rating: 5.0,
    completedProjects: 156,
  },
  {
    id: 'biz-4',
    userId: 'business-4',
    name: 'Threaded Designs',
    description: 'Custom clothing and fashion pieces tailored to your unique style. From elegant evening wear to everyday essentials, we bring your fashion vision to life.',
    categories: ['Clothing', 'Fashion'],
    styles: ['Contemporary', 'Elegant', 'Bohemian', 'Minimalist'],
    materials: ['Silk', 'Cotton', 'Linen', 'Wool', 'Fabric'],
    priceRange: { min: 300, max: 2500 },
    location: 'Los Angeles, CA',
    portfolio: [
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop',
    ],
    rating: 4.8,
    completedProjects: 94,
  },
  {
    id: 'biz-5',
    userId: 'business-5',
    name: 'Canvas & Color Studio',
    description: 'Original paintings, custom prints, and personalized art pieces. We transform your ideas into stunning visual masterpieces that tell your story.',
    categories: ['Art', 'Home Decor'],
    styles: ['Contemporary', 'Abstract', 'Traditional', 'Modern'],
    materials: ['Canvas', 'Acrylic', 'Oil Paint', 'Watercolor', 'Paper'],
    priceRange: { min: 150, max: 3000 },
    location: 'Chicago, IL',
    portfolio: [
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=300&fit=crop',
    ],
    rating: 4.9,
    completedProjects: 127,
  },
  {
    id: 'biz-6',
    userId: 'business-6',
    name: 'Illuminate Works',
    description: 'Custom lighting design and handcrafted fixtures that illuminate your space with style. From modern pendants to vintage-inspired lamps, we create the perfect ambiance.',
    categories: ['Lighting', 'Home Decor'],
    styles: ['Industrial', 'Modern', 'Minimalist', 'Mid-Century Modern'],
    materials: ['Metal', 'Glass', 'Wood', 'Brass', 'Copper'],
    priceRange: { min: 200, max: 1800 },
    location: 'Seattle, WA',
    portfolio: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=300&fit=crop',
    ],
    rating: 4.7,
    completedProjects: 68,
  },
  {
    id: 'biz-7',
    userId: 'business-7',
    name: 'Fiber Art Studio',
    description: 'Handcrafted textiles, embroidery, and woven art pieces. We blend traditional techniques with contemporary designs to create unique fabric artworks.',
    categories: ['Textiles', 'Art', 'Home Decor'],
    styles: ['Bohemian', 'Organic', 'Contemporary', 'Traditional'],
    materials: ['Cotton', 'Wool', 'Silk', 'Linen', 'Fabric'],
    priceRange: { min: 100, max: 1200 },
    location: 'Portland, ME',
    portfolio: [
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=300&fit=crop',
    ],
    rating: 4.6,
    completedProjects: 52,
  },
  {
    id: 'biz-8',
    userId: 'business-8',
    name: 'Artisan Bakes',
    description: 'Custom cakes and pastries designed for your special moments. From elegant wedding cakes to whimsical birthday creations, we craft edible art that tastes as good as it looks.',
    categories: ['Custom Cakes', 'Pastries'],
    styles: ['Elegant', 'Whimsical', 'Modern', 'Traditional'],
    materials: ['Fondant', 'Buttercream', 'Chocolate', 'Fresh Ingredients'],
    priceRange: { min: 80, max: 800 },
    location: 'San Francisco, CA',
    portfolio: [
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1587668178277-295251f900ce?w=400&h=300&fit=crop',
    ],
    rating: 4.9,
    completedProjects: 183,
  },
  {
    id: 'biz-9',
    userId: 'business-9',
    name: 'Leather Works Co.',
    description: 'Handcrafted leather goods including bags, wallets, and accessories. Each piece is meticulously crafted with premium materials and attention to detail that lasts a lifetime.',
    categories: ['Leather Goods', 'Accessories'],
    styles: ['Rustic', 'Minimalist', 'Industrial', 'Classic'],
    materials: ['Leather', 'Brass Hardware', 'Waxed Thread'],
    priceRange: { min: 120, max: 1200 },
    location: 'Denver, CO',
    portfolio: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1584917869882-41a3b2d1d2e3?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=300&fit=crop',
    ],
    rating: 4.8,
    completedProjects: 145,
  },
  {
    id: 'biz-10',
    userId: 'business-10',
    name: 'PrintLab 3D',
    description: '3D printing and modern craft solutions for your unique projects. From functional prototypes to artistic sculptures, we bring digital designs to life with precision and creativity.',
    categories: ['3D Printing', 'Modern Crafts', 'Accessories'],
    styles: ['Modern', 'Futuristic', 'Minimalist', 'Geometric'],
    materials: ['PLA', 'ABS', 'Resin', 'Metal Filament', 'Wood Filament'],
    priceRange: { min: 50, max: 1500 },
    location: 'Boston, MA',
    portfolio: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&h=300&fit=crop',
    ],
    rating: 4.7,
    completedProjects: 76,
  },
];

// Demo Projects
export const demoProjects: Project[] = [
  {
    id: 'proj-1',
    customerId: 'customer-1',
    title: 'Custom Dining Table',
    category: 'Furniture',
    description: 'Looking for a beautiful dining table that seats 6-8 people. Want something with natural wood grain and a warm, inviting feel.',
    inspirationImages: [
      'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1549497538-303791108f95?w=400&h=300&fit=crop',
    ],
    styleTags: ['Scandinavian', 'Minimalist', 'Warm'],
    details: {
      size: '180cm x 90cm',
      materials: ['Oak', 'Walnut'],
      timing: '8-12 weeks',
    },
    budget: { min: 1500, max: 3000 },
    status: 'offers_received',
    aiConcept: 'https://images.unsplash.com/photo-1617104678098-de229db51175?w=600&h=400&fit=crop',
    aiBrief: 'A contemporary dining table featuring live-edge walnut top with natural grain patterns. The table seats 6-8 comfortably with tapered solid oak legs. Finished with a food-safe natural oil to enhance the wood\'s warmth.',
    createdAt: new Date('2024-01-15'),
    matchedBusinesses: ['biz-1'],
  },
];

// Demo Offers
export const demoOffers: Offer[] = [
  {
    id: 'offer-1',
    projectId: 'proj-1',
    businessId: 'biz-1',
    price: 2400,
    timeline: '10 weeks',
    note: 'I\'d love to create this table for you! I have some beautiful walnut slabs that would be perfect. Let\'s discuss the exact dimensions and leg style.',
    status: 'pending',
    createdAt: new Date('2024-01-17'),
  },
];

// Demo Messages
export const demoMessages: Message[] = [
  {
    id: 'msg-1',
    projectId: 'proj-1',
    senderId: 'business-1',
    senderType: 'business',
    content: 'Hi Emma! I love your vision for this dining table. The walnut with oak legs combination you\'re thinking of is one of my favorites.',
    createdAt: new Date('2024-01-17T10:00:00'),
  },
  {
    id: 'msg-2',
    projectId: 'proj-1',
    senderId: 'customer-1',
    senderType: 'customer',
    content: 'Thank you! I\'m excited about this project. Do you have any examples of similar tables you\'ve made?',
    createdAt: new Date('2024-01-17T10:15:00'),
  },
  {
    id: 'msg-3',
    projectId: 'proj-1',
    senderId: 'business-1',
    senderType: 'business',
    content: 'Absolutely! I just finished a similar piece last month. Let me share some photos.',
    createdAt: new Date('2024-01-17T10:20:00'),
  },
];

// Demo Reviews
export const demoReviews: Review[] = [
  {
    id: 'rev-biz1-1',
    businessId: 'biz-1',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Alex created the most beautiful dining table for our home! The craftsmanship is exceptional and the wood grain is stunning. The table arrived exactly as promised and has become the centerpiece of our dining room. Highly recommend Crafted Studio!',
    createdAt: new Date('2024-01-12'),
  },
  {
    id: 'rev-biz1-2',
    businessId: 'biz-1',
    customerId: 'customer-16',
    customerName: 'Daniel White',
    customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'I ordered a custom bookshelf and it\'s absolutely perfect! Alex really understood my vision and created something that fits perfectly in my space. The quality of the wood and finish is outstanding. Will definitely order more furniture from Crafted Studio.',
    createdAt: new Date('2024-01-08'),
  },
  {
    id: 'rev-biz1-3',
    businessId: 'biz-1',
    customerId: 'customer-17',
    customerName: 'Olivia Davis',
    customerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Amazing work! The coffee table Alex made for me is a true work of art. The attention to detail and the sustainable materials used make it even more special. The whole process was smooth and professional. Couldn\'t be happier!',
    createdAt: new Date('2023-12-30'),
  },
  {
    id: 'rev-biz2-1',
    businessId: 'biz-2',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Maya\'s ceramics are absolutely beautiful! I ordered a set of bowls and they\'re perfect. Each piece is unique and has so much character. The organic shapes and earth tones are exactly what I was looking for. Terra Ceramics creates true art!',
    createdAt: new Date('2024-01-11'),
  },
  {
    id: 'rev-biz2-2',
    businessId: 'biz-2',
    customerId: 'customer-18',
    customerName: 'Sophie Brown',
    customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'I commissioned a custom vase and it\'s stunning! Maya really captured the wabi-sabi aesthetic I wanted. The piece has so much personality and looks beautiful in my home. The quality is excellent and the shipping was very careful. Highly recommend!',
    createdAt: new Date('2024-01-06'),
  },
  {
    id: 'rev-biz2-3',
    businessId: 'biz-2',
    customerId: 'customer-19',
    customerName: 'Mark Johnson',
    customerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Great pottery! I ordered several pieces and they\'re all beautiful. The rustic style is perfect for my kitchen. Maya was very responsive and the pieces arrived well-packaged. The only minor issue was a slight delay, but the quality makes up for it.',
    createdAt: new Date('2023-12-28'),
  },
  {
    id: 'rev-biz3-1',
    businessId: 'biz-3',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Sophie created the most beautiful engagement ring for us! The design is elegant and timeless, exactly what we wanted. The ethically sourced materials were important to us, and Sophie was transparent throughout the process. The ring is absolutely perfect!',
    createdAt: new Date('2024-01-13'),
  },
  {
    id: 'rev-biz3-2',
    businessId: 'biz-3',
    customerId: 'customer-20',
    customerName: 'Jessica Taylor',
    customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Lumière Jewelry created a stunning custom necklace for me! Sophie really understood my style and created something unique. The craftsmanship is impeccable and the gemstones are gorgeous. I get compliments every time I wear it. Highly recommend!',
    createdAt: new Date('2024-01-09'),
  },
  {
    id: 'rev-biz3-3',
    businessId: 'biz-3',
    customerId: 'customer-21',
    customerName: 'Ryan Miller',
    customerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'I ordered a custom bracelet for my wife\'s birthday and she absolutely loves it! The design is elegant and the quality is outstanding. Sophie was wonderful to work with and made the whole process easy. The piece arrived beautifully packaged. Perfect experience!',
    createdAt: new Date('2024-01-04'),
  },
  {
    id: 'rev-1',
    businessId: 'biz-4',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Jordan created the most beautiful custom dress for my wedding! The attention to detail was incredible, and the fit was perfect. The fabric quality exceeded my expectations. Highly recommend Threaded Designs for any special occasion.',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'rev-2',
    businessId: 'biz-4',
    customerId: 'customer-2',
    customerName: 'Sarah Johnson',
    customerAvatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'I ordered a custom blazer and it\'s absolutely stunning! Jordan really understood my style and created something unique. The communication throughout the process was excellent, and the final product arrived exactly on time.',
    createdAt: new Date('2024-01-05'),
  },
  {
    id: 'rev-3',
    businessId: 'biz-4',
    customerId: 'customer-3',
    customerName: 'Michael Chen',
    customerAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Great experience working with Threaded Designs. The custom shirt I ordered fits perfectly and the quality is top-notch. Would definitely order again!',
    createdAt: new Date('2023-12-28'),
  },
  {
    id: 'rev-4',
    businessId: 'biz-5',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Riley painted an incredible portrait of my family! The colors are vibrant and the composition is perfect. It\'s now the centerpiece of our living room. The whole process was smooth and Riley was very responsive to my feedback.',
    createdAt: new Date('2024-01-12'),
  },
  {
    id: 'rev-5',
    businessId: 'biz-5',
    customerId: 'customer-4',
    customerName: 'Lisa Park',
    customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'I commissioned a custom abstract piece for my office and it\'s absolutely beautiful! Riley captured exactly what I envisioned. The artwork adds so much character to the space. Highly professional and talented artist!',
    createdAt: new Date('2024-01-08'),
  },
  {
    id: 'rev-6',
    businessId: 'biz-5',
    customerId: 'customer-5',
    customerName: 'David Wilson',
    customerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Amazing work! Riley created a stunning landscape painting that perfectly matches my home decor. The attention to detail and use of color is exceptional. Very happy with the result!',
    createdAt: new Date('2023-12-20'),
  },
  {
    id: 'rev-7',
    businessId: 'biz-6',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Taylor designed and created the most beautiful pendant lights for my kitchen! The industrial style is exactly what I wanted, and the quality is outstanding. The lighting completely transformed the space. Couldn\'t be happier!',
    createdAt: new Date('2024-01-14'),
  },
  {
    id: 'rev-8',
    businessId: 'biz-6',
    customerId: 'customer-6',
    customerName: 'Jennifer Martinez',
    customerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Great experience with Illuminate Works! The custom lamp I ordered is beautiful and well-made. Taylor was very helpful in choosing the right design for my space. The only minor issue was a slight delay in shipping, but the final product was worth the wait.',
    createdAt: new Date('2024-01-02'),
  },
  {
    id: 'rev-9',
    businessId: 'biz-6',
    customerId: 'customer-7',
    customerName: 'Robert Brown',
    customerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Excellent craftsmanship! The floor lamp Taylor created is a true work of art. The design is modern and elegant, and it provides perfect ambient lighting. Highly recommend Illuminate Works for any custom lighting needs.',
    createdAt: new Date('2023-12-15'),
  },
  {
    id: 'rev-10',
    businessId: 'biz-7',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Morgan created a stunning embroidered wall hanging for my bedroom! The colors are gorgeous and the craftsmanship is impeccable. It\'s a unique piece that gets compliments from everyone who sees it. Morgan was wonderful to work with!',
    createdAt: new Date('2024-01-11'),
  },
  {
    id: 'rev-11',
    businessId: 'biz-7',
    customerId: 'customer-8',
    customerName: 'Amanda Lee',
    customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'I ordered a custom woven throw blanket and it\'s absolutely beautiful! The texture and colors are perfect. Morgan really understood my vision and created something special. The quality is outstanding and it\'s so cozy!',
    createdAt: new Date('2024-01-06'),
  },
  {
    id: 'rev-12',
    businessId: 'biz-7',
    customerId: 'customer-9',
    customerName: 'James Taylor',
    customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Great textile art piece! Morgan created a beautiful wall tapestry that adds warmth to my living room. The traditional techniques combined with modern design create a unique look. Very satisfied with the purchase.',
    createdAt: new Date('2023-12-22'),
  },
  {
    id: 'rev-13',
    businessId: 'biz-8',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Casey created the most amazing wedding cake! It was not only beautiful but absolutely delicious. The design was exactly what I wanted, and all my guests were raving about it. Casey was so professional and made the whole process stress-free.',
    createdAt: new Date('2024-01-13'),
  },
  {
    id: 'rev-14',
    businessId: 'biz-8',
    customerId: 'customer-10',
    customerName: 'Maria Garcia',
    customerAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Artisan Bakes made my daughter\'s birthday cake and it was incredible! The design was whimsical and fun, exactly as requested. The cake tasted amazing too - moist and flavorful. Casey is incredibly talented!',
    createdAt: new Date('2024-01-09'),
  },
  {
    id: 'rev-15',
    businessId: 'biz-8',
    customerId: 'customer-11',
    customerName: 'Thomas Anderson',
    customerAvatar: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Ordered a custom anniversary cake and it exceeded all expectations! The design was elegant and sophisticated, and the taste was phenomenal. Casey really knows how to create both beautiful and delicious cakes. Highly recommend!',
    createdAt: new Date('2024-01-03'),
  },
  {
    id: 'rev-16',
    businessId: 'biz-9',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Drew crafted the most beautiful leather handbag for me! The quality is exceptional and the attention to detail is remarkable. It\'s been months and it still looks brand new. The design is timeless and I get compliments on it constantly.',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'rev-17',
    businessId: 'biz-9',
    customerId: 'customer-12',
    customerName: 'Rachel Green',
    customerAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'I ordered a custom leather wallet and it\'s perfect! The craftsmanship is outstanding - you can tell it\'s made with care and premium materials. Drew was great to work with and delivered exactly what I wanted. This wallet will last a lifetime!',
    createdAt: new Date('2024-01-07'),
  },
  {
    id: 'rev-18',
    businessId: 'biz-9',
    customerId: 'customer-13',
    customerName: 'Chris Johnson',
    customerAvatar: 'https://images.unsplash.com/photo-1502378735452-bc7d86632805?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Great leather goods! I bought a belt and it\'s very well made. The leather is high quality and the hardware is solid. Drew clearly takes pride in their work. Would definitely purchase from Leather Works Co. again.',
    createdAt: new Date('2023-12-18'),
  },
  {
    id: 'rev-19',
    businessId: 'biz-10',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Sam helped me create a custom 3D printed prototype for my product idea! The quality is excellent and Sam was incredibly helpful throughout the design process. The turnaround time was fast and the pricing was fair. Highly recommend PrintLab 3D!',
    createdAt: new Date('2024-01-16'),
  },
  {
    id: 'rev-20',
    businessId: 'biz-10',
    customerId: 'customer-14',
    customerName: 'Alex Rodriguez',
    customerAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'I ordered several 3D printed decorative items and they\'re all fantastic! The precision and detail are impressive. Sam was very responsive and helped me refine my designs. Great service and quality work!',
    createdAt: new Date('2024-01-04'),
  },
  {
    id: 'rev-21',
    businessId: 'biz-10',
    customerId: 'customer-15',
    customerName: 'Nicole Williams',
    customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'PrintLab 3D created some custom organizers for my desk and they\'re perfect! The design is clean and functional. Sam was great at understanding my needs and suggesting improvements. Very satisfied with the results!',
    createdAt: new Date('2023-12-25'),
  },
];

// Category options
export const categories = [
  'Furniture',
  'Home Decor',
  'Jewelry',
  'Clothing',
  'Accessories',
  'Art',
  'Pottery',
  'Tableware',
  'Lighting',
  'Textiles',
];

// Style options
export const styleOptions = [
  'Minimalist',
  'Scandinavian',
  'Mid-Century Modern',
  'Bohemian',
  'Industrial',
  'Rustic',
  'Contemporary',
  'Traditional',
  'Art Deco',
  'Organic',
  'Wabi-Sabi',
  'Elegant',
];

// Material options
export const materialOptions = [
  'Wood',
  'Metal',
  'Ceramic',
  'Glass',
  'Leather',
  'Fabric',
  'Stone',
  'Gold',
  'Silver',
  'Recycled Materials',
];
