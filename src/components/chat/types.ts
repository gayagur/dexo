export interface DisplayMessage {
  role: "ai" | "user";
  text: string;
  images?: string[];
}

export interface BriefData {
  title?: string;
  description: string;
  category: string;
  style_tags: string[];
  budget: string;
  space_size: string;
  materials: string;
  timeline: string;
  special_requirements: string;
  room_type?: string;
  color_palette?: string;
}

export type ChatPhase =
  | "chatting"
  | "brief"
  | "generating_image"
  | "editing_image"
  | "done";

export interface ChatStep {
  id: string;
  message: string;
  field: string;
  type: "free_text" | "chips" | "chips_multi";
  options?: string[];
  placeholder?: string;
}

export interface ProgressItem {
  field: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  stepIndex: number;
}
