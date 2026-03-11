import { supabase } from "./supabase";

export interface CreatorPortfolioItem {
  title: string;
  description: string;
  category: string;
  yearCompleted: number;
  imageUrl: string;
}

export interface CreatorPublicProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  profilePhotoUrl: string;
  joinedAt: string;
  tagline: string;
  bio: string;
  specialization: string;
  skills: string[];
  yearsExperience: number;
  priceRangeLabel: string;
  availability: "Full-time" | "Part-time" | "Weekends only";
  rating: number;
  reviewCount: number;
  completedProjects: number;
  responseTime: string;
  city: string;
  country: string;
  offersRemoteWork: boolean;
  travelsToClient: boolean;
  instagram: string;
  website: string;
  portfolioItems: CreatorPortfolioItem[];
}

export function getCreatorPublicProfileUrl(userId: string): string {
  return supabase.storage
    .from("portfolio-images")
    .getPublicUrl(`${userId}/public-profile.json`).data.publicUrl;
}

export async function fetchCreatorPublicProfile(
  userId: string
): Promise<CreatorPublicProfile | null> {
  const response = await fetch(getCreatorPublicProfileUrl(userId), {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as CreatorPublicProfile;
}
