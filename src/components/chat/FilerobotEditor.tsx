import React, { Component, type ReactNode } from "react";
import FilerobotImageEditor, { TABS, TOOLS } from "react-filerobot-image-editor";

// Filerobot's internal @scaleflex/ui uses the classic JSX transform (React.createElement)
// which requires React on the global scope — Vite's automatic JSX transform doesn't provide this.
if (typeof window !== "undefined" && !window.React) {
  (window as unknown as Record<string, unknown>).React = React;
}
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilerobotEditorProps {
  imageSrc: string;
  onSave: (imageBase64: string) => void;
  onClose: () => void;
}

// Error boundary to catch Filerobot crashes
class EditorErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { hasError: boolean; errorMsg: string }
> {
  state = { hasError: false, errorMsg: '' };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, errorMsg: err?.message || 'Unknown error' };
  }
  componentDidCatch(err: Error) { console.error('[FilerobotEditor] crash:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#0f1724] gap-4">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <p className="text-white text-sm">The image editor failed to load.</p>
          <p className="text-white/50 text-xs max-w-md text-center">{this.state.errorMsg}</p>
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
  return (
    <EditorErrorBoundary onClose={onClose}>
      <FilerobotImageEditor
        source={imageSrc}
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
        Crop={{
          presetsItems: [
            { titleKey: "square", descriptionKey: "1:1", ratio: 1 },
            { titleKey: "landscape", descriptionKey: "16:9", ratio: 16 / 9 },
            { titleKey: "portrait", descriptionKey: "9:16", ratio: 9 / 16 },
            { titleKey: "classic", descriptionKey: "4:3", ratio: 4 / 3 },
          ],
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
