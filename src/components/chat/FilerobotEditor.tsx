import { useState, useEffect } from "react";
import FilerobotImageEditor, { TABS, TOOLS } from "react-filerobot-image-editor";
import { Loader2 } from "lucide-react";

interface FilerobotEditorProps {
  imageSrc: string;
  onSave: (imageBase64: string) => void;
  onClose: () => void;
}

const DEXO_THEME = {
  palette: {
    "bg-secondary": "#1B2432",
    "bg-primary": "#0f1724",
    "bg-primary-active": "#C05621",
    "accent-primary": "#C05621",
    "accent-primary-active": "#A84A1C",
    "icons-primary": "#FDFCF8",
    "icons-secondary": "#9CA3AF",
    "borders-secondary": "#2D3748",
    "borders-primary": "#4A5568",
    "borders-strong": "#C05621",
    "light-shadow": "rgba(0, 0, 0, 0.3)",
    warning: "#EF4444",
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
  },
};

export function FilerobotEditor({ imageSrc, onSave, onClose }: FilerobotEditorProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  // Convert remote URL to base64 data URL to avoid CORS issues
  useEffect(() => {
    if (imageSrc.startsWith('data:')) {
      setDataUrl(imageSrc);
      return;
    }
    let cancelled = false;
    fetch(imageSrc)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!cancelled) setDataUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        // Fallback: try using the URL directly
        if (!cancelled) setDataUrl(imageSrc);
      });
    return () => { cancelled = true; };
  }, [imageSrc]);

  if (!dataUrl) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#0f1724]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <FilerobotImageEditor
      source={dataUrl}
      onSave={(editedImageObject) => {
        if (editedImageObject.imageBase64) {
          onSave(editedImageObject.imageBase64);
        } else {
          console.error('Filerobot: save produced no imageBase64');
          onClose();
        }
      }}
      onClose={onClose}
      annotationsCommon={{
        fill: "#C05621",
        stroke: "#C05621",
        strokeWidth: 2,
      }}
      Text={{
        text: "DEXO",
        fontSize: 24,
        fontFamily: "Inter",
      }}
      tabsIds={[TABS.ANNOTATE, TABS.WATERMARK, TABS.RESIZE, TABS.ADJUST]}
      defaultTabId={TABS.ANNOTATE}
      defaultToolId={TOOLS.TEXT}
      savingPixelRatio={4}
      previewPixelRatio={2}
      closeAfterSave={true}
      theme={DEXO_THEME}
    />
  );
}
