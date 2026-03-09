import { useState, useEffect, Component, type ReactNode } from "react";
import FilerobotImageEditor, { TABS, TOOLS } from "react-filerobot-image-editor";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilerobotEditorProps {
  imageSrc: string;
  onSave: (imageBase64: string) => void;
  onClose: () => void;
}

// Error boundary to catch Filerobot crashes
class EditorErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.error('[FilerobotEditor] crash:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#0f1724] gap-4">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <p className="text-white text-sm">The image editor failed to load.</p>
          <Button variant="outline" size="sm" onClick={this.props.onClose}>Close</Button>
        </div>
      );
    }
    return this.props.children;
  }
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
  const [loadError, setLoadError] = useState(false);

  // Convert remote URL to base64 data URL to avoid CORS issues
  useEffect(() => {
    if (imageSrc.startsWith('data:')) {
      setDataUrl(imageSrc);
      return;
    }

    let cancelled = false;

    // Use an Image element to draw onto a canvas (avoids CORS fetch issues)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL('image/png');
        setDataUrl(base64);
      } catch {
        // Canvas tainted — fall back to direct URL
        setDataUrl(imageSrc);
      }
    };
    img.onerror = () => {
      if (cancelled) return;
      // Try fetch as fallback
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => { if (!cancelled) setDataUrl(reader.result as string); };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          if (!cancelled) setLoadError(true);
        });
    };
    img.src = imageSrc;

    return () => { cancelled = true; };
  }, [imageSrc]);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#0f1724] gap-4">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <p className="text-white text-sm">Could not load the image for editing.</p>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#0f1724]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <EditorErrorBoundary onClose={onClose}>
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
    </EditorErrorBoundary>
  );
}
