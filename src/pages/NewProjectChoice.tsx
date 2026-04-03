import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ModeSelector } from "@/components/design/steps/ModeSelector";
import { MethodSelector } from "@/components/design/steps/MethodSelector";
import { SpaceSelector } from "@/components/design/steps/SpaceSelector";
import { RoomSelector } from "@/components/design/steps/RoomSelector";
import { FurnitureTypeSelector } from "@/components/design/steps/FurnitureTypeSelector";

const FurnitureEditor = lazy(() => import("@/components/design/editor/FurnitureEditor").then(m => ({ default: m.FurnitureEditor })));
import {
  HOME_ROOMS,
  COMMERCIAL_SPACES,
  FURNITURE_BY_SPACE,
  type EditorSceneData,
  type FurnitureOption,
  type GroupData,
  type PanelData,
} from "@/lib/furnitureData";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  findFurnitureOptionById,
  parseDimensionsMm,
  parseStoredEditorScene,
  extractCameraPosition,
} from "@/lib/furnitureDesignResume";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Step = "mode" | "method" | "space" | "room" | "furniture" | "editor";

interface FlowState {
  mode: "furniture" | "decorative" | null;
  method: "editor" | "ai" | null;
  spaceType: "home" | "commercial" | null;
  roomId: string | null;
  furniture: FurnitureOption | null;
}

const FALLBACK_FURNITURE: FurnitureOption =
  findFurnitureOptionById("plant_stand") ?? FURNITURE_BY_SPACE.living_room[0]!;

export default function NewProjectChoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const designIdFromUrl = searchParams.get("design_id");
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("mode");
  const [saving, setSaving] = useState(false);
  const [designId, setDesignId] = useState<string | null>(null);
  const [state, setState] = useState<FlowState>({
    mode: null,
    method: null,
    spaceType: null,
    roomId: null,
    furniture: null,
  });

  const [resumeLoading, setResumeLoading] = useState(!!designIdFromUrl);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeInitial, setResumeInitial] = useState<
    | undefined
    | {
        groups: GroupData[];
        ungroupedPanels?: PanelData[];
        dims?: { w: number; h: number; d: number };
        style?: string;
        cameraPosition?: [number, number, number];
      }
  >(undefined);

  useEffect(() => {
    if (!designIdFromUrl) {
      setResumeLoading(false);
      setResumeError(null);
      setResumeInitial(undefined);
      return;
    }

    if (!user) {
      setResumeLoading(false);
      setResumeError("Sign in to open your saved design.");
      return;
    }

    let cancelled = false;
    setResumeLoading(true);
    setResumeError(null);

    (async () => {
      const { data, error } = await supabase
        .from("furniture_designs")
        .select("*")
        .eq("id", designIdFromUrl)
        .eq("customer_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setResumeError(error.message);
        setResumeLoading(false);
        return;
      }

      if (!data) {
        setResumeError("Design not found or you do not have access.");
        setResumeLoading(false);
        return;
      }

      const rawPanels = data.panels as unknown;
      const scene = parseStoredEditorScene(rawPanels);
      if (!scene) {
        setResumeError("Saved design data is invalid or too old to open.");
        setResumeLoading(false);
        return;
      }

      const furniture =
        findFurnitureOptionById(data.furniture_id) ?? FALLBACK_FURNITURE;
      const dimsParsed = parseDimensionsMm(data.dimensions);
      const dims = dimsParsed ?? furniture.defaultDims;
      const cam = extractCameraPosition(rawPanels);

      const mode: "furniture" | "decorative" =
        data.mode === "decorative" ? "decorative" : "furniture";

      setDesignId(data.id);
      setState({
        mode,
        method: "editor",
        spaceType: data.space_type,
        roomId: data.room_id,
        furniture,
      });
      setResumeInitial({
        groups: scene.groups,
        ungroupedPanels: scene.ungroupedPanels,
        dims,
        style: data.style || "Modern",
        cameraPosition: cam,
      });
      setStep("editor");
      setResumeLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [designIdFromUrl, user]);

  // Step 1: Furniture or Decorative
  const handleModeSelect = useCallback(
    (mode: "furniture" | "decorative") => {
      setState((s) => ({ ...s, mode }));
      if (mode === "decorative") {
        navigate("/create-project?mode=decorative");
      } else {
        setStep("method");
      }
    },
    [navigate]
  );

  // Step 2: Design myself or AI
  const handleMethodSelect = useCallback(
    (method: "editor" | "ai") => {
      setState((s) => ({ ...s, method }));
      if (method === "ai") {
        navigate("/create-project?mode=furniture");
      } else {
        setStep("space");
      }
    },
    [navigate]
  );

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

  // Step 6: Save from editor (upsert — update existing or create new)
  const handleSave = useCallback(
    async (data: {
      panels: PanelData[] | EditorSceneData;
      dims: { w: number; h: number; d: number };
      style: string;
      furnitureId: string;
      cameraPosition?: [number, number, number];
      materialsUsed?: string[];
    }) => {
      if (!user || saving) return;
      setSaving(true);

      const panelData = {
        ...(typeof data.panels === "object" && !Array.isArray(data.panels)
          ? data.panels
          : { groups: [], ungroupedPanels: data.panels }),
        camera_position: data.cameraPosition ?? [2.5, 2, 3],
        materials_used: data.materialsUsed ?? [],
        design_mode: "manual",
      } as unknown as Record<string, unknown>;

      let savedId = designId;

      if (designId) {
        const { error } = await supabase
          .from("furniture_designs")
          .update({
            panels: panelData,
            dimensions: data.dims as unknown as Record<string, unknown>,
            style: data.style,
          })
          .eq("id", designId);

        if (error) {
          setSaving(false);
          toast({ title: "Error saving", description: error.message, variant: "destructive" });
          return;
        }
      } else {
        const { data: design, error } = await supabase
          .from("furniture_designs")
          .insert({
            customer_id: user.id,
            mode: state.mode!,
            space_type: state.spaceType!,
            room_id: state.roomId!,
            furniture_id: data.furnitureId,
            panels: panelData,
            dimensions: data.dims as unknown as Record<string, unknown>,
            style: data.style,
          })
          .select("id")
          .single();

        if (error || !design) {
          setSaving(false);
          toast({
            title: "Error saving",
            description: error?.message ?? "Unknown error",
            variant: "destructive",
          });
          return;
        }
        savedId = design.id;
        setDesignId(design.id);
      }

      setSaving(false);

      try {
        localStorage.setItem(
          "dexo_pending_design",
          JSON.stringify({
            panels: data.panels,
            dims: data.dims,
            style: data.style,
            furnitureId: data.furnitureId,
            roomId: state.roomId,
            spaceType: state.spaceType,
            designId: savedId,
          })
        );
      } catch {
        /* quota */
      }

      toast({ title: "Design saved!", description: "Your design has been saved." });
    },
    [user, saving, state, designId, toast]
  );

  const getRoomLabel = () => {
    if (!state.spaceType || !state.roomId) return "";
    const rooms = state.spaceType === "home" ? HOME_ROOMS : COMMERCIAL_SPACES;
    return rooms.find((r) => r.id === state.roomId)?.label ?? "";
  };

  if (designIdFromUrl && resumeLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your design…</p>
      </div>
    );
  }

  if (designIdFromUrl && resumeError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 bg-background">
        <p className="text-center text-foreground max-w-md">{resumeError}</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild variant="default">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/new-project">Start a new design</Link>
          </Button>
        </div>
      </div>
    );
  }

  switch (step) {
    case "mode":
      return <ModeSelector onSelect={handleModeSelect} />;

    case "method":
      return (
        <MethodSelector onSelect={handleMethodSelect} onBack={() => setStep("mode")} />
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
        <Suspense fallback={
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading 3D editor...</p>
          </div>
        }>
          <FurnitureEditor
            key={designIdFromUrl ?? "new-flow"}
            furnitureType={state.furniture!}
            roomLabel={getRoomLabel()}
            spaceType={state.spaceType ?? undefined}
            onBack={() => {
              if (designIdFromUrl) {
                navigate("/dashboard");
                return;
              }
              setStep("furniture");
            }}
            onSave={handleSave}
            initialEditorState={resumeInitial}
          />
        </Suspense>
      );
  }
}
