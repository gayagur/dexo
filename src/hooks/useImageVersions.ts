import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { ImageVersion } from "@/lib/database.types";

interface UseImageVersionsReturn {
  versions: ImageVersion[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useImageVersions(
  projectId: string | null
): UseImageVersionsReturn {
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!projectId) {
      setVersions([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("image_versions")
      .select("*")
      .eq("project_id", projectId)
      .order("version_number", { ascending: true });

    if (error) {
      console.error("Failed to fetch image versions:", error);
    } else {
      setVersions(data || []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { versions, loading, refetch };
}
