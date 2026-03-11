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
    email: 'studio@modernspaces.com',
    name: 'Alex Chen',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    id: 'business-2',
    email: 'hello@oakandiron.com',
    name: 'Maya Rodriguez',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
  {
    id: 'business-3',
    email: 'contact@lumenlighting.com',
    name: 'Sophie Laurent',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
  },
  {
    id: 'business-4',
    email: 'hello@nestinteriors.com',
    name: 'Jordan Kim',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
  },
  {
    id: 'business-5',
    email: 'info@wallstorystudio.com',
    name: 'Riley Martinez',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop',
  },
  {
    id: 'business-6',
    email: 'design@greenleafstudio.com',
    name: 'Taylor Brooks',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
  },
  {
    id: 'business-7',
    email: 'weave@softliving.com',
    name: 'Morgan Lee',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
  },
  {
    id: 'business-8',
    email: 'hello@tidyspaces.com',
    name: 'Casey Williams',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop',
  },
  {
    id: 'business-9',
    email: 'craft@revivedfurniture.com',
    name: 'Drew Anderson',
    role: 'business',
    avatar: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=100&h=100&fit=crop',
  },
  {
    id: 'business-10',
    email: 'hello@deskflow.com',
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
    name: 'Modern Spaces Studio',
    description: 'Full-service interior design for homes and offices. We create functional, beautiful spaces that reflect your lifestyle and personality.',
    categories: ['Interior Design & Space Planning', 'Home Decor & Styling'],
    styles: ['Minimalist', 'Scandinavian', 'Mid-Century Modern', 'Japandi'],
    materials: ['Wood', 'Stone', 'Glass', 'Fabric'],
    priceRange: { min: 1000, max: 15000 },
    location: 'Portland, OR',
    portfolio: [
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&h=300&fit=crop',
    ],
    rating: 4.9,
    completedProjects: 47,
  },
  {
    id: 'biz-2',
    userId: 'business-2',
    name: 'Oak & Iron Woodworks',
    description: 'Custom carpentry and woodworking for interiors. From built-in bookshelves to kitchen cabinetry, we craft quality pieces that last generations.',
    categories: ['Carpentry & Woodworking', 'Furniture Design & Restoration'],
    styles: ['Rustic', 'Industrial', 'Farmhouse', 'Contemporary'],
    materials: ['Wood', 'Metal', 'Bamboo', 'Recycled Materials'],
    priceRange: { min: 500, max: 8000 },
    location: 'Austin, TX',
    portfolio: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&h=300&fit=crop',
    ],
    rating: 4.8,
    completedProjects: 82,
  },
  {
    id: 'biz-3',
    userId: 'business-3',
    name: 'Lumen Lighting Design',
    description: 'Custom lighting solutions that transform any space. We design layered lighting plans, handcraft fixtures, and create the perfect ambiance for every room.',
    categories: ['Lighting & Ambiance', 'Home Decor & Styling'],
    styles: ['Contemporary', 'Art Deco', 'Industrial', 'Minimalist'],
    materials: ['Metal', 'Glass', 'Wood', 'Rattan'],
    priceRange: { min: 300, max: 5000 },
    location: 'New York, NY',
    portfolio: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=300&fit=crop',
    ],
    rating: 5.0,
    completedProjects: 156,
  },
  {
    id: 'biz-4',
    userId: 'business-4',
    name: 'Nest Interiors',
    description: 'Home decor and styling specialists. We curate and style rooms with carefully selected accessories, art, and furniture to create cohesive, inviting spaces.',
    categories: ['Home Decor & Styling', 'Interior Design & Space Planning'],
    styles: ['Bohemian', 'Coastal', 'Scandinavian', 'Traditional'],
    materials: ['Fabric', 'Wood', 'Ceramic Tile', 'Rattan'],
    priceRange: { min: 500, max: 5000 },
    location: 'Los Angeles, CA',
    portfolio: [
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&h=300&fit=crop',
    ],
    rating: 4.8,
    completedProjects: 94,
  },
  {
    id: 'biz-5',
    userId: 'business-5',
    name: 'Wall Story Studio',
    description: 'Wall art, gallery walls, and decorative accessories that bring personality to any room. We create custom art pieces and curate collections tailored to your space.',
    categories: ['Wall Art & Decorative Accessories', 'Home Decor & Styling'],
    styles: ['Contemporary', 'Bohemian', 'Traditional', 'Minimalist'],
    materials: ['Wood', 'Metal', 'Glass', 'Fabric'],
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
    name: 'Green Leaf Studio',
    description: 'Indoor plant design and greenery styling for homes and offices. We create living walls, plant arrangements, and biophilic designs that breathe life into your space.',
    categories: ['Plants & Greenery Styling', 'Home Decor & Styling'],
    styles: ['Japandi', 'Bohemian', 'Contemporary', 'Coastal'],
    materials: ['Bamboo', 'Ceramic Tile', 'Stone', 'Recycled Materials'],
    priceRange: { min: 200, max: 3000 },
    location: 'Seattle, WA',
    portfolio: [
      'https://images.unsplash.com/photo-1545241047-6083a3684587?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop',
    ],
    rating: 4.7,
    completedProjects: 68,
  },
  {
    id: 'biz-7',
    userId: 'business-7',
    name: 'Soft Living Textiles',
    description: 'Custom curtains, upholstery, rugs, and cushions. We blend traditional weaving techniques with modern design to create warm, textured interiors.',
    categories: ['Textiles & Soft Furnishings', 'Home Decor & Styling'],
    styles: ['Bohemian', 'Farmhouse', 'Contemporary', 'Traditional'],
    materials: ['Fabric', 'Leather', 'Bamboo', 'Recycled Materials'],
    priceRange: { min: 200, max: 4000 },
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
    name: 'Tidy Spaces',
    description: 'Storage and organization solutions for every room. We design custom closets, pantry systems, and clever storage that maximizes your space beautifully.',
    categories: ['Storage & Organization Solutions', 'Interior Design & Space Planning'],
    styles: ['Minimalist', 'Scandinavian', 'Contemporary', 'Farmhouse'],
    materials: ['Wood', 'Metal', 'Bamboo', 'Recycled Materials'],
    priceRange: { min: 300, max: 5000 },
    location: 'San Francisco, CA',
    portfolio: [
      'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=400&h=300&fit=crop',
    ],
    rating: 4.9,
    completedProjects: 183,
  },
  {
    id: 'biz-9',
    userId: 'business-9',
    name: 'Revived Furniture Co.',
    description: 'Furniture restoration, refinishing, and custom design. We give old pieces new life and create bespoke furniture tailored to your space and style.',
    categories: ['Furniture Design & Restoration', 'Carpentry & Woodworking'],
    styles: ['Rustic', 'Mid-Century Modern', 'Industrial', 'Traditional'],
    materials: ['Wood', 'Leather', 'Metal', 'Fabric'],
    priceRange: { min: 200, max: 4000 },
    location: 'Denver, CO',
    portfolio: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&h=300&fit=crop',
    ],
    rating: 4.8,
    completedProjects: 145,
  },
  {
    id: 'biz-10',
    userId: 'business-10',
    name: 'DeskFlow Ergonomics',
    description: 'Office design and ergonomic workspace solutions. We create productive, healthy work environments with standing desks, monitor setups, and smart layouts.',
    categories: ['Office Design & Ergonomics', 'Interior Design & Space Planning'],
    styles: ['Minimalist', 'Contemporary', 'Scandinavian', 'Industrial'],
    materials: ['Wood', 'Metal', 'Glass', 'Bamboo'],
    priceRange: { min: 500, max: 8000 },
    location: 'Boston, MA',
    portfolio: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1600494603989-9650cf6ddd3d?w=400&h=300&fit=crop',
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
    title: 'Living Room Redesign',
    category: 'Interior Design & Space Planning',
    description: 'Looking to transform our open-plan living room into a warm, Scandinavian-inspired space. Want neutral tones with natural wood accents and cozy textiles.',
    inspirationImages: [
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=300&fit=crop',
    ],
    styleTags: ['Scandinavian', 'Minimalist', 'Japandi'],
    details: {
      size: '35 sqm',
      materials: ['Wood', 'Fabric', 'Stone'],
      timing: '6-8 weeks',
    },
    budget: { min: 3000, max: 8000 },
    status: 'offers_received',
    aiConcept: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&h=400&fit=crop',
    aiBrief: 'A Scandinavian-inspired living room redesign featuring warm oak flooring, a neutral color palette with soft whites and warm grays, linen upholstered seating, and natural stone accent wall. Layered lighting with pendant fixtures and floor lamps to create a cozy ambiance.',
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
    note: 'I\'d love to work on this living room redesign! I have great ideas for a Scandinavian-Japandi fusion. Let\'s discuss the layout and material palette.',
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
    content: 'Hi Emma! I love your vision for this living room. The Scandinavian-Japandi blend you\'re going for is one of my favorite styles to work with.',
    createdAt: new Date('2024-01-17T10:00:00'),
  },
  {
    id: 'msg-2',
    projectId: 'proj-1',
    senderId: 'customer-1',
    senderType: 'customer',
    content: 'Thank you! I\'m excited about this project. Do you have any examples of similar room transformations you\'ve done?',
    createdAt: new Date('2024-01-17T10:15:00'),
  },
  {
    id: 'msg-3',
    projectId: 'proj-1',
    senderId: 'business-1',
    senderType: 'business',
    content: 'Absolutely! I just finished a similar Scandinavian living room last month. Let me share some photos.',
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
    comment: 'Alex completely transformed our living room! The Scandinavian design is exactly what we envisioned — clean lines, warm tones, and so much natural light. Our home feels like a magazine spread now. Highly recommend Modern Spaces Studio!',
    createdAt: new Date('2024-01-12'),
  },
  {
    id: 'rev-biz1-2',
    businessId: 'biz-1',
    customerId: 'customer-16',
    customerName: 'Daniel White',
    customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Alex redesigned our open-plan kitchen and dining area. The space planning was brilliant — it flows so much better now. The material choices and color palette were perfect. Will definitely hire Modern Spaces again for the bedrooms!',
    createdAt: new Date('2024-01-08'),
  },
  {
    id: 'rev-biz1-3',
    businessId: 'biz-1',
    customerId: 'customer-17',
    customerName: 'Olivia Davis',
    customerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Amazing work on our home office! Alex created a Japandi-inspired workspace that is both beautiful and functional. The attention to ergonomics and natural materials makes it a joy to work from home. Couldn\'t be happier!',
    createdAt: new Date('2023-12-30'),
  },
  {
    id: 'rev-biz2-1',
    businessId: 'biz-2',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Maya built the most stunning built-in bookshelves for our study! The woodwork is impeccable and the design fits perfectly with our rustic home. Oak & Iron Woodworks truly understands both craft and style!',
    createdAt: new Date('2024-01-11'),
  },
  {
    id: 'rev-biz2-2',
    businessId: 'biz-2',
    customerId: 'customer-18',
    customerName: 'Sophie Brown',
    customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'We commissioned custom kitchen cabinetry and it\'s absolutely gorgeous! Maya used reclaimed wood and the result is warm and characterful. The quality is exceptional and the installation was seamless. Highly recommend!',
    createdAt: new Date('2024-01-06'),
  },
  {
    id: 'rev-biz2-3',
    businessId: 'biz-2',
    customerId: 'customer-19',
    customerName: 'Mark Johnson',
    customerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Great carpentry work! Maya built a custom entertainment center that fits our space perfectly. The industrial metal accents with wood create a unique look. Minor delay on delivery, but the quality makes up for it.',
    createdAt: new Date('2023-12-28'),
  },
  {
    id: 'rev-biz3-1',
    businessId: 'biz-3',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Sophie designed a complete lighting plan for our home renovation! The layered approach — ambient, task, and accent lighting — transformed every room. The custom pendant fixtures in the dining room are absolutely stunning!',
    createdAt: new Date('2024-01-13'),
  },
  {
    id: 'rev-biz3-2',
    businessId: 'biz-3',
    customerId: 'customer-20',
    customerName: 'Jessica Taylor',
    customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Lumen Lighting Design created the perfect ambiance for our bedroom! Sophie recommended warm, dimmable sconces and a statement ceiling fixture. The mood lighting makes the room feel like a luxury hotel. Highly recommend!',
    createdAt: new Date('2024-01-09'),
  },
  {
    id: 'rev-biz3-3',
    businessId: 'biz-3',
    customerId: 'customer-21',
    customerName: 'Ryan Miller',
    customerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Sophie transformed our dark kitchen with a brilliant lighting design! Under-cabinet LEDs, a gorgeous Art Deco pendant over the island, and recessed ceiling lights. The kitchen went from gloomy to gorgeous. Perfect experience!',
    createdAt: new Date('2024-01-04'),
  },
  {
    id: 'rev-1',
    businessId: 'biz-4',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Jordan styled our entire living room with the most beautiful decor! The bohemian touches with coastal accents created such a warm, inviting space. Every piece feels curated and intentional. Highly recommend Nest Interiors!',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'rev-2',
    businessId: 'biz-4',
    customerId: 'customer-2',
    customerName: 'Sarah Johnson',
    customerAvatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Jordan transformed our guest bedroom into a cozy retreat! The styling was perfect — layered textures, calming colors, and thoughtful accessories. Our guests always compliment the room. The process was smooth and enjoyable.',
    createdAt: new Date('2024-01-05'),
  },
  {
    id: 'rev-3',
    businessId: 'biz-4',
    customerId: 'customer-3',
    customerName: 'Michael Chen',
    customerAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Great experience with Nest Interiors. Jordan helped us select decor for our dining room and the result is stunning. The Scandinavian style really works in our space. Would hire again!',
    createdAt: new Date('2023-12-28'),
  },
  {
    id: 'rev-4',
    businessId: 'biz-5',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Riley created a stunning gallery wall for our hallway! The mix of custom art, framed prints, and decorative mirrors is perfect. It turned a boring corridor into a conversation piece. The whole process was smooth and collaborative.',
    createdAt: new Date('2024-01-12'),
  },
  {
    id: 'rev-5',
    businessId: 'biz-5',
    customerId: 'customer-4',
    customerName: 'Lisa Park',
    customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'I commissioned custom wall art for my office and it\'s absolutely beautiful! Riley captured exactly the contemporary vibe I wanted. The piece adds so much personality to the space. Highly professional and talented!',
    createdAt: new Date('2024-01-08'),
  },
  {
    id: 'rev-6',
    businessId: 'biz-5',
    customerId: 'customer-5',
    customerName: 'David Wilson',
    customerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Amazing work! Riley designed decorative shelving and wall accents that perfectly complement our minimalist living room. The attention to proportion and balance is exceptional. Very happy with the result!',
    createdAt: new Date('2023-12-20'),
  },
  {
    id: 'rev-7',
    businessId: 'biz-6',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Taylor designed a beautiful indoor plant arrangement for our open-plan office! The biophilic design has improved the whole atmosphere. The mix of hanging plants, floor planters, and a small living wall is breathtaking.',
    createdAt: new Date('2024-01-14'),
  },
  {
    id: 'rev-8',
    businessId: 'biz-6',
    customerId: 'customer-6',
    customerName: 'Jennifer Martinez',
    customerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Great experience with Green Leaf Studio! Taylor selected the perfect low-maintenance plants for our bedroom. The macrame hangers and ceramic pots add so much warmth. Minor delay on one planter, but the final result was worth the wait.',
    createdAt: new Date('2024-01-02'),
  },
  {
    id: 'rev-9',
    businessId: 'biz-6',
    customerId: 'customer-7',
    customerName: 'Robert Brown',
    customerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Excellent plant styling! Taylor created a gorgeous indoor garden for our sunroom. The combination of tropical plants, succulents, and herbs is both beautiful and practical. Highly recommend Green Leaf Studio!',
    createdAt: new Date('2023-12-15'),
  },
  {
    id: 'rev-10',
    businessId: 'biz-7',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Morgan made the most beautiful custom curtains for our bedroom! The linen fabric and the soft drape create such a calming atmosphere. The cushions she made to match are perfect. Morgan was wonderful to work with!',
    createdAt: new Date('2024-01-11'),
  },
  {
    id: 'rev-11',
    businessId: 'biz-7',
    customerId: 'customer-8',
    customerName: 'Amanda Lee',
    customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'I ordered a custom handwoven rug and it\'s absolutely stunning! The texture and natural colors are perfect for our bohemian living room. Morgan really understood my vision. The quality is outstanding and so cozy underfoot!',
    createdAt: new Date('2024-01-06'),
  },
  {
    id: 'rev-12',
    businessId: 'biz-7',
    customerId: 'customer-9',
    customerName: 'James Taylor',
    customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Great textiles! Morgan reupholstered our dining chairs and made matching table runners. The farmhouse look is exactly what we wanted. The fabrics are high quality and the craftsmanship is excellent. Very satisfied!',
    createdAt: new Date('2023-12-22'),
  },
  {
    id: 'rev-13',
    businessId: 'biz-8',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Casey designed the most amazing closet system for our master bedroom! Everything has a place now and it looks so clean and organized. The custom shelving and drawers maximize every inch of space. Life-changing organization!',
    createdAt: new Date('2024-01-13'),
  },
  {
    id: 'rev-14',
    businessId: 'biz-8',
    customerId: 'customer-10',
    customerName: 'Maria Garcia',
    customerAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Tidy Spaces transformed our chaotic pantry into an organized dream! Casey designed custom shelving, pull-out baskets, and labeled containers. Cooking is so much easier now. Casey is incredibly talented!',
    createdAt: new Date('2024-01-09'),
  },
  {
    id: 'rev-15',
    businessId: 'biz-8',
    customerId: 'customer-11',
    customerName: 'Thomas Anderson',
    customerAvatar: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Casey organized our kids\' playroom and it\'s a game-changer! Smart storage bins, labeled shelves, and a reading nook all in one room. The kids can actually find their toys now! Highly recommend Tidy Spaces!',
    createdAt: new Date('2024-01-03'),
  },
  {
    id: 'rev-16',
    businessId: 'biz-9',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Drew restored our grandmother\'s vintage dining set beautifully! The refinished walnut looks incredible and the reupholstered chairs are both comfortable and stylish. Drew preserved the character while making everything look fresh.',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'rev-17',
    businessId: 'biz-9',
    customerId: 'customer-12',
    customerName: 'Rachel Green',
    customerAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Drew designed and built a custom mid-century modern credenza that fits our space perfectly! The craftsmanship is outstanding — you can tell it\'s made with care and premium materials. This piece will last a lifetime!',
    createdAt: new Date('2024-01-07'),
  },
  {
    id: 'rev-18',
    businessId: 'biz-9',
    customerId: 'customer-13',
    customerName: 'Chris Johnson',
    customerAvatar: 'https://images.unsplash.com/photo-1502378735452-bc7d86632805?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Great furniture restoration! Drew refinished our coffee table and it looks brand new. The industrial-style metal legs paired with the reclaimed wood top create a beautiful contrast. Would definitely hire Revived Furniture again.',
    createdAt: new Date('2023-12-18'),
  },
  {
    id: 'rev-19',
    businessId: 'biz-10',
    customerId: 'customer-1',
    customerName: 'Emma Thompson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Sam designed our entire home office for ergonomics! The standing desk setup, monitor arms, and cable management are perfect. My back pain is gone and productivity is up. Highly recommend DeskFlow Ergonomics!',
    createdAt: new Date('2024-01-16'),
  },
  {
    id: 'rev-20',
    businessId: 'biz-10',
    customerId: 'customer-14',
    customerName: 'Alex Rodriguez',
    customerAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Sam set up our small team\'s office space brilliantly! Ergonomic chairs, adjustable desks, and smart layouts that promote collaboration. The space looks professional and feels comfortable. Great service and quality work!',
    createdAt: new Date('2024-01-04'),
  },
  {
    id: 'rev-21',
    businessId: 'biz-10',
    customerId: 'customer-15',
    customerName: 'Nicole Williams',
    customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'DeskFlow designed a great workspace for my home studio! Sam recommended the perfect monitor setup and acoustic panels. The cable management alone was worth it. Clean, functional, and stylish. Very satisfied!',
    createdAt: new Date('2023-12-25'),
  },
];

// Category options
export const categories = [
  'Carpentry & Custom Woodworking',
  'Custom Furniture Design',
  'Furniture Restoration & Upcycling',
  'Kitchen & Dining Design',
  'Living Room Design & Styling',
  'Bedroom Design & Styling',
  'Home Office Design',
  'Bathroom Design',
  'Outdoor & Garden Design',
  'Lighting Design & Installation',
  'Wall Art & Gallery Walls',
  'Shelving & Storage Solutions',
  'Textile & Soft Furnishings',
  'Plants & Greenery Styling',
  'Storage & Organization Solutions',
  'Office Design & Ergonomics',
  'Full Interior Design (entire space)',
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
  'Japandi',
  'Farmhouse',
  'Coastal',
];

// Material options
export const materialOptions = [
  'Wood',
  'Metal',
  'Glass',
  'Fabric',
  'Leather',
  'Stone',
  'Marble',
  'Ceramic Tile',
  'Bamboo',
  'Rattan',
  'Recycled Materials',
];
