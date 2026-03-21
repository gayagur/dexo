import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ModeSelector } from "@/components/design/steps/ModeSelector";
import { MethodSelector } from "@/components/design/steps/MethodSelector";
import { SpaceSelector } from "@/components/design/steps/SpaceSelector";
import { RoomSelector } from "@/components/design/steps/RoomSelector";
import { FurnitureTypeSelector } from "@/components/design/steps/FurnitureTypeSelector";
import { FurnitureEditor } from "@/components/design/editor/FurnitureEditor";
import { HOME_ROOMS, COMMERCIAL_SPACES, type FurnitureOption, type PanelData } from "@/lib/furnitureData";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Step = "mode" | "method" | "space" | "room" | "furniture" | "editor";

interface FlowState {
  mode: "furniture" | "decorative" | null;
  method: "editor" | "ai" | null;
  spaceType: "home" | "commercial" | null;
  roomId: string | null;
  furniture: FurnitureOption | null;
}

export default function NewProjectChoice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("mode");
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<FlowState>({
    mode: null,
    method: null,
    spaceType: null,
    roomId: null,
    furniture: null,
  });

  // Step 1: Furniture or Decorative
  const handleModeSelect = useCallback((mode: "furniture" | "decorative") => {
    setState((s) => ({ ...s, mode }));
    if (mode === "decorative") {
      // Decorative goes straight to AI — editor not available yet
      navigate("/create-project");
    } else {
      setStep("method");
    }
  }, [navigate]);

  // Step 2: Design myself or AI
  const handleMethodSelect = useCallback((method: "editor" | "ai") => {
    setState((s) => ({ ...s, method }));
    if (method === "ai") {
      navigate("/create-project");
    } else {
      setStep("space");
    }
  }, [navigate]);

  // Step 3: Home or Commercial
  const handleSpaceSelect = useCallback((spaceType: "home" | "commercial") => {
    setState((s) => ({ ...s, spaceType }));
    setStep("room");
  }, []);

  // Step 4: Room
  const handleRoomSelect = useCallback((roomId: string) => {
    setState((s) => ({ ...s, roomId }));
    setStep("furniture");
  }, []);

  // Step 5: Furniture type
  const handleFurnitureSelect = useCallback((furniture: FurnitureOption) => {
    setState((s) => ({ ...s, furniture }));
    setStep("editor");
  }, []);

  // Step 6: Save from editor
  const handleSave = useCallback(
    async (data: { panels: PanelData[]; dims: { w: number; h: number; d: number }; style: string; furnitureId: string }) => {
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
          panels: data.panels as unknown as Record<string, unknown>,
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

      // Store design data in localStorage so AIChatFlow can embed it in project details
      try {
        localStorage.setItem('dexo_pending_design', JSON.stringify({
          panels: data.panels,
          dims: data.dims,
          style: data.style,
          furnitureId: data.furnitureId,
          roomId: state.roomId,
          spaceType: state.spaceType,
        }));
      } catch { /* quota exceeded — non-critical */ }

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

    case "method":
      return (
        <MethodSelector
          onSelect={handleMethodSelect}
          onBack={() => setStep("mode")}
        />
      );

    case "space":
      return (
        <SpaceSelector
          onSelect={handleSpaceSelect}
          onBack={() => setStep("method")}
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
          onBack={() => setStep("furniture")}
          onSave={handleSave}
        />
      );
  }
}
