import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ModeSelector } from "@/components/design/steps/ModeSelector";
import { SpaceSelector } from "@/components/design/steps/SpaceSelector";
import { RoomSelector } from "@/components/design/steps/RoomSelector";
import { FurnitureTypeSelector } from "@/components/design/steps/FurnitureTypeSelector";
import { FurnitureEditor } from "@/components/design/editor/FurnitureEditor";
import { HOME_ROOMS, COMMERCIAL_SPACES, type FurnitureOption } from "@/lib/furnitureData";
import type { EditorSceneData } from "@/lib/furnitureData";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Step = "mode" | "space" | "room" | "furniture" | "editor";

interface FlowState {
  mode: "furniture" | "decorative" | null;
  spaceType: "home" | "commercial" | null;
  roomId: string | null;
  furniture: FurnitureOption | null;
}

export default function FurnitureDesignFlow() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("mode");
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<FlowState>({
    mode: null,
    spaceType: null,
    roomId: null,
    furniture: null,
  });

  const handleModeSelect = useCallback((mode: "furniture" | "decorative") => {
    setState((s) => ({ ...s, mode }));
    if (mode === "furniture") {
      setStep("space");
    } else {
      toast({
        title: "Coming soon",
        description: "Decorative item design is coming soon. Use the regular project flow for now.",
      });
      navigate("/create-project");
    }
  }, [navigate, toast]);

  const handleSpaceSelect = useCallback((spaceType: "home" | "commercial") => {
    setState((s) => ({ ...s, spaceType }));
    setStep("room");
  }, []);

  const handleRoomSelect = useCallback((roomId: string) => {
    setState((s) => ({ ...s, roomId }));
    setStep("furniture");
  }, []);

  const handleFurnitureSelect = useCallback((furniture: FurnitureOption) => {
    setState((s) => ({ ...s, furniture }));
    setStep("editor");
  }, []);

  const handleSave = useCallback(
    async (data: { panels: EditorSceneData; dims: { w: number; h: number; d: number }; style: string; furnitureId: string; cameraPosition?: [number, number, number]; materialsUsed?: string[] }) => {
      if (!user || saving) return;
      setSaving(true);

      const { data: design, error } = await supabase
        .from("furniture_designs")
        .insert({
          customer_id: user.id,
          mode: state.mode!,
          space_type: state.spaceType!,
          room_id: state.roomId!,
          furniture_id: data.furnitureId,
          panels: {
            ...data.panels,
            camera_position: data.cameraPosition ?? [2.5, 2, 3],
            materials_used: data.materialsUsed ?? [],
            design_mode: "manual",
          } as unknown as Record<string, unknown>,
          dimensions: data.dims as unknown as Record<string, unknown>,
          style: data.style,
        })
        .select("id")
        .single();

      setSaving(false);

      if (error) {
        toast({
          title: "Error saving design",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Design saved!",
        description: "Continuing to project creation…",
      });
      navigate(`/create-project?design_id=${design.id}`);
    },
    [user, saving, state, navigate, toast]
  );

  const getRoomLabel = () => {
    if (!state.spaceType || !state.roomId) return "";
    const rooms = state.spaceType === "home" ? HOME_ROOMS : COMMERCIAL_SPACES;
    return rooms.find((r) => r.id === state.roomId)?.label ?? "";
  };

  switch (step) {
    case "mode":
      return <ModeSelector onSelect={handleModeSelect} />;

    case "space":
      return (
        <SpaceSelector
          onSelect={handleSpaceSelect}
          onBack={() => setStep("mode")}
        />
      );

    case "room":
      return (
        <RoomSelector
          spaceType={state.spaceType!}
          onSelect={handleRoomSelect}
          onBack={() => setStep("space")}
          onBackToStart={() => setStep("mode")}
        />
      );

    case "furniture":
      return (
        <FurnitureTypeSelector
          spaceType={state.spaceType!}
          roomId={state.roomId!}
          onSelect={handleFurnitureSelect}
          onBack={() => setStep("room")}
          onBackToStart={() => setStep("mode")}
        />
      );

    case "editor":
      return (
        <FurnitureEditor
          furnitureType={state.furniture!}
          roomLabel={getRoomLabel()}
          spaceType={state.spaceType ?? undefined}
          onBack={() => setStep("furniture")}
          onSave={handleSave}
        />
      );
  }
}
