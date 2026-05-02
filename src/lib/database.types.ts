export type Role = "customer" | "business" | "creator";
export type ProjectStatus = "draft" | "sent" | "offers_received" | "in_progress" | "completed";
export type OfferStatus = "pending" | "accepted" | "declined";
export type SenderType = "customer" | "business";
export type BusinessStatus = "pending" | "approved" | "rejected" | "suspended";
export type NotificationType = "creator_approved" | "creator_rejected" | "system" | "info";
export type MilestoneStatus = "pending" | "in_progress" | "submitted" | "approved" | "payment_requested" | "customer_paid_confirmed" | "paid" | "released" | "disputed";

export interface Profile {
  id: string;
  role: Role;
  active_role: Role;
  name: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_creator: boolean;
  is_business: boolean;
  creator_approved: boolean;
  creator_profile: Record<string, unknown> | null;
  created_at: string;
}

export type OrderStatus = "quote_requested" | "quoted" | "accepted" | "in_production" | "completed" | "cancelled";

export interface CreatorProfile {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  location: string;
  specialties: string[];
  portfolio_images: string[];
  min_order_value: number | null;
  lead_time_days: number | null;
  rating: number;
  total_orders: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesignOrder {
  id: string;
  design_id: string | null;
  client_id: string;
  creator_id: string | null;
  status: OrderStatus;
  quote_amount: number | null;
  quote_currency: string;
  quote_message: string | null;
  client_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  description: string;
  location: string;
  categories: string[];
  styles: string[];
  portfolio: string[];
  rating: number;
  min_price: number | null;
  max_price: number | null;
  status: BusinessStatus;
  rejection_reason: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  category: string;
  style_tags: string[];
  budget_min: number;
  budget_max: number;
  details: Record<string, unknown>;
  inspiration_images: string[];
  ai_brief: string | null;
  ai_concept: string | null;
  status: ProjectStatus;
  furniture_design_id: string | null;
  updated_at: string | null;
  created_at: string;
}

export type FollowupResponse = "yes" | "no" | "still_talking";

export interface Offer {
  id: string;
  project_id: string;
  business_id: string;
  price: number;
  timeline: string;
  note: string;
  status: OfferStatus;
  followup_response: FollowupResponse | null;
  followup_responded_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  sender_type: SenderType;
  content: string;
  created_at: string;
}

export interface AiUsageLog {
  id: string;
  user_id: string;
  function_name: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ImageVersion {
  id: string;
  project_id: string;
  parent_version_id: string | null;
  image_url: string;
  prompt: string | null;
  edit_instruction: string | null;
  mask_path: string | null;
  edit_type: string | null;
  version_number: number;
  is_current: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Review {
  id: string;
  project_id: string;
  customer_id: string;
  business_id: string;
  rating: number;
  comment: string;
  tags: string[];
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  milestone_number: 1 | 2 | 3;
  title: string;
  percentage: number;
  amount: number;
  status: MilestoneStatus;
  payment_link: string | null;
  payment_link_sent_at: string | null;
  customer_confirmed_paid_at: string | null;
  business_confirmed_received_at: string | null;
  beta_commission_acknowledged: boolean;
  paid_at: string | null;
  released_at: string | null;
  created_at: string;
}

export interface BusinessPageView {
  id: string;
  business_id: string;
  viewer_id: string | null;
  viewed_at: string;
}

export type DesignMode = "furniture" | "decorative";
export type SpaceType = "home" | "commercial";

export interface FurnitureDesign {
  id: string;
  customer_id: string;
  mode: DesignMode;
  space_type: SpaceType;
  room_id: string;
  furniture_id: string;
  panels: Record<string, unknown>[];
  dimensions: Record<string, unknown>;
  style: string;
  created_at: string;
}

export type BlogPostStatus = "draft" | "published" | "archived";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: Record<string, unknown>;
  content_format: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[];
  category: string | null;
  tags: string[];
  status: BlogPostStatus;
  featured: boolean;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogFaq {
  id: string;
  post_id: string;
  question: string;
  answer: string;
  sort_order: number;
  created_at: string;
}

/** Matches Supabase-generated Database shape so PostgREST infers Insert/Update correctly. */
type PublicTable<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown>,
  Update
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: PublicTable<Profile, Omit<Profile, "created_at">, Partial<Omit<Profile, "id">>>;
      businesses: PublicTable<Business, Omit<Business, "id" | "created_at" | "rating">, Partial<Omit<Business, "id">>>;
      projects: PublicTable<Project, Omit<Project, "id" | "created_at">, Partial<Omit<Project, "id">>>;
      offers: PublicTable<Offer, Omit<Offer, "id" | "created_at">, Partial<Omit<Offer, "id">>>;
      messages: PublicTable<Message, Omit<Message, "id" | "created_at">, Partial<Omit<Message, "id">>>;
      ai_usage_log: PublicTable<AiUsageLog, Omit<AiUsageLog, "id" | "created_at">, Partial<Omit<AiUsageLog, "id">>>;
      image_versions: PublicTable<ImageVersion, Omit<ImageVersion, "id" | "created_at">, Partial<Omit<ImageVersion, "id">>>;
      notifications: PublicTable<Notification, Omit<Notification, "id" | "created_at" | "read">, Partial<Omit<Notification, "id">>>;
      reviews: PublicTable<Review, Omit<Review, "id" | "created_at">, Partial<Omit<Review, "id">>>;
      milestones: PublicTable<Milestone, Omit<Milestone, "id" | "created_at">, Partial<Omit<Milestone, "id">>>;
      business_page_views: PublicTable<
        BusinessPageView,
        Omit<BusinessPageView, "id" | "viewed_at">,
        Partial<Omit<BusinessPageView, "id">>
      >;
      furniture_designs: PublicTable<FurnitureDesign, Omit<FurnitureDesign, "id" | "created_at">, Partial<Omit<FurnitureDesign, "id">>>;
      creator_profiles: PublicTable<CreatorProfile, Omit<CreatorProfile, "id" | "created_at" | "updated_at" | "rating" | "total_orders">, Partial<Omit<CreatorProfile, "id">>>;
      design_orders: PublicTable<DesignOrder, Omit<DesignOrder, "id" | "created_at" | "updated_at">, Partial<Omit<DesignOrder, "id">>>;
      blog_posts: PublicTable<
        BlogPost,
        Omit<BlogPost, "id" | "created_at" | "updated_at"> & { id?: string },
        Partial<Omit<BlogPost, "id">>
      >;
      blog_faqs: PublicTable<
        BlogFaq,
        Omit<BlogFaq, "id" | "created_at"> & { id?: string },
        Partial<Omit<BlogFaq, "id">>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
