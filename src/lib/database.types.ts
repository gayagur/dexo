export type Role = "customer" | "business";
export type ProjectStatus = "draft" | "sent" | "offers_received" | "in_progress" | "completed";
export type OfferStatus = "pending" | "accepted" | "declined";
export type SenderType = "customer" | "business";
export type BusinessStatus = "pending" | "approved" | "rejected" | "suspended";
export type NotificationType = "creator_approved" | "creator_rejected" | "system" | "info";
export type MilestoneStatus = "pending" | "in_progress" | "submitted" | "approved" | "payment_requested" | "paid" | "released" | "disputed";

export interface Profile {
  id: string;
  role: Role;
  active_role: Role;
  name: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
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
  updated_at: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  project_id: string;
  business_id: string;
  price: number;
  timeline: string;
  note: string;
  status: OfferStatus;
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

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at">; Update: Partial<Omit<Profile, "id">> };
      businesses: { Row: Business; Insert: Omit<Business, "id" | "created_at" | "rating">; Update: Partial<Omit<Business, "id">> };
      projects: { Row: Project; Insert: Omit<Project, "id" | "created_at">; Update: Partial<Omit<Project, "id">> };
      offers: { Row: Offer; Insert: Omit<Offer, "id" | "created_at">; Update: Partial<Omit<Offer, "id">> };
      messages: { Row: Message; Insert: Omit<Message, "id" | "created_at">; Update: Partial<Omit<Message, "id">> };
      ai_usage_log: { Row: AiUsageLog; Insert: Omit<AiUsageLog, "id" | "created_at">; Update: Partial<Omit<AiUsageLog, "id">> };
      image_versions: { Row: ImageVersion; Insert: Omit<ImageVersion, "id" | "created_at">; Update: Partial<Omit<ImageVersion, "id">> };
      notifications: { Row: Notification; Insert: Omit<Notification, "id" | "created_at" | "read">; Update: Partial<Omit<Notification, "id">> };
      reviews: { Row: Review; Insert: Omit<Review, "id" | "created_at">; Update: Partial<Omit<Review, "id">> };
      milestones: { Row: Milestone; Insert: Omit<Milestone, "id" | "created_at">; Update: Partial<Omit<Milestone, "id">> };
      business_page_views: { Row: BusinessPageView; Insert: Omit<BusinessPageView, "id" | "viewed_at">; Update: never };
    };
  };
}
