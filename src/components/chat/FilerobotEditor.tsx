import React, { Component, type ReactNode, useEffect } from "react";
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
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#FAF7F4] gap-4 rounded-2xl">
          <AlertTriangle className="w-10 h-10 text-[#C05621]" />
          <p className="text-[#1B2432] text-sm font-medium">The image editor failed to load.</p>
          <p className="text-[#4A5568] text-xs max-w-md text-center">{this.state.errorMsg}</p>
          <Button variant="outline" size="sm" onClick={this.props.onClose}
            className="border-[#E8E0D8] text-[#1B2432] hover:bg-[#F5F1E8]">
            Close
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Warm light palette — matches DEXO's interior-design aesthetic
const DEXO_THEME = {
  palette: {
    // Backgrounds — warm off-whites
    "bg-primary": "#FAF7F4",
    "bg-secondary": "#F5F1E8",
    "bg-primary-active": "rgba(192, 86, 33, 0.08)",

    // Accent — burnt orange brand color
    "accent-primary": "#C05621",
    "accent-primary-active": "#A84A1C",

    // Text — dark navy on light backgrounds
    "txt-primary": "#1B2432",
    "txt-secondary": "#6B7280",

    // Icons — warm gray tones
    "icons-primary": "#6B7280",
    "icons-secondary": "#9CA3AF",

    // Borders — soft warm tones
    "borders-primary": "#E8E0D8",
    "borders-secondary": "#F0EBE4",
    "borders-strong": "#C05621",

    // Shadows & states
    "light-shadow": "rgba(139, 109, 80, 0.08)",
    warning: "#DC2626",
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
  },
};

// CSS overrides for structural styles the palette can't control
const FILEROBOT_STYLE_OVERRIDES = `
  /* ── Global overrides for warm rounded aesthetic ────────── */
  .FIE_root {
    background: #FAF7F4 !important;
    font-family: Inter, system-ui, sans-serif !important;
  }

  /* Top bar */
  .FIE_topbar {
    background: #FDFCF8 !important;
    border-bottom: 1px solid #E8E0D8 !important;
    box-shadow: 0 1px 3px rgba(139, 109, 80, 0.06) !important;
  }
  .FIE_topbar-save-button {
    background: #C05621 !important;
    color: #fff !important;
    border-radius: 10px !important;
    font-weight: 500 !important;
    border: none !important;
    padding: 6px 20px !important;
    transition: background 0.2s ease !important;
  }
  .FIE_topbar-save-button:hover {
    background: #A84A1C !important;
  }
  .FIE_topbar-reset-button,
  .FIE_topbar-undo-button,
  .FIE_topbar-redo-button,
  .FIE_topbar-close-button {
    border-radius: 8px !important;
    transition: background 0.15s ease !important;
  }
  .FIE_topbar-reset-button:hover,
  .FIE_topbar-undo-button:hover,
  .FIE_topbar-redo-button:hover,
  .FIE_topbar-close-button:hover {
    background: rgba(192, 86, 33, 0.08) !important;
  }

  /* Left sidebar tabs */
  .FIE_tabs {
    background: #FDFCF8 !important;
    border-right: 1px solid #E8E0D8 !important;
    box-shadow: 2px 0 8px rgba(139, 109, 80, 0.04) !important;
    padding: 12px !important;
    gap: 8px !important;
  }
  .FIE_tab {
    border-radius: 12px !important;
    background: #FAF7F4 !important;
    border: 1px solid #F0EBE4 !important;
    transition: all 0.2s ease !important;
    min-height: 62px !important;
  }
  .FIE_tab:hover {
    background: #F5F1E8 !important;
    border-color: #E8E0D8 !important;
    box-shadow: 0 2px 8px rgba(139, 109, 80, 0.06) !important;
  }
  .FIE_tab[aria-selected='true'] {
    background: rgba(192, 86, 33, 0.08) !important;
    border-color: rgba(192, 86, 33, 0.25) !important;
    box-shadow: 0 2px 8px rgba(192, 86, 33, 0.08) !important;
  }
  .FIE_tab[aria-selected='true'] svg {
    color: #C05621 !important;
  }
  .FIE_tab[aria-selected='true'] label,
  .FIE_tab[aria-selected='true'] span {
    color: #A84A1C !important;
    font-weight: 500 !important;
  }
  .FIE_tab label,
  .FIE_tab span {
    color: #4A5568 !important;
    font-size: 11px !important;
  }
  .FIE_tab svg {
    color: #6B7280 !important;
  }

  /* Canvas area */
  .FIE_canvas-container {
    background: #F0EBE4 !important;
  }

  /* Bottom tools bar */
  .FIE_tools-bar-wrapper {
    background: #FDFCF8 !important;
    border-top: 1px solid #E8E0D8 !important;
    box-shadow: 0 -1px 3px rgba(139, 109, 80, 0.04) !important;
  }
  .FIE_tool-options-wrapper {
    background: #FDFCF8 !important;
    border-top: 1px solid #E8E0D8 !important;
  }
  .FIE_tools-bar {
    background: transparent !important;
  }
  .FIE_tool-button {
    border-radius: 8px !important;
    transition: all 0.15s ease !important;
  }
  .FIE_tool-button:hover {
    background: rgba(192, 86, 33, 0.08) !important;
  }
  .FIE_tool-button[aria-selected='true'] {
    background: rgba(192, 86, 33, 0.1) !important;
  }

  /* Right panel (options) */
  .FIE_editor-content > div:last-child {
    background: #FDFCF8 !important;
  }

  /* Inputs and selects */
  .FIE_root input,
  .FIE_root select {
    border-radius: 8px !important;
    border-color: #E8E0D8 !important;
    background: #FAF7F4 !important;
    transition: border-color 0.15s ease !important;
  }
  .FIE_root input:focus,
  .FIE_root select:focus {
    border-color: #C05621 !important;
    box-shadow: 0 0 0 2px rgba(192, 86, 33, 0.1) !important;
  }

  /* Sliders */
  .FIE_root [role="slider"]::before,
  .FIE_root .SfxSlider-track {
    background: #E8E0D8 !important;
  }
  .FIE_root .SfxSlider-rail {
    background: #C05621 !important;
  }
  .FIE_root .SfxSlider-thumb {
    background: #C05621 !important;
    border-color: #C05621 !important;
    box-shadow: 0 2px 4px rgba(192, 86, 33, 0.2) !important;
  }

  /* Buttons inside panels */
  .FIE_root button {
    border-radius: 8px !important;
    font-family: Inter, system-ui, sans-serif !important;
  }

  /* ── Annotation options bar (color, stroke, opacity, etc.) ── */
  .FIE_annotations-options {
    background: #FDFCF8 !important;
    padding: 10px 16px !important;
    gap: 10px !important;
    border-top: 1px solid #F0EBE4 !important;
    min-height: 48px;
  }

  /* Color picker trigger swatch */
  .FIE_color-picker-triggerer {
    width: 34px !important;
    height: 34px !important;
    border-radius: 10px !important;
    border: 2px solid #E8E0D8 !important;
    cursor: pointer !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    box-shadow: 0 1px 3px rgba(139, 109, 80, 0.08) !important;
  }
  .FIE_color-picker-triggerer:hover {
    border-color: #C05621 !important;
    box-shadow: 0 2px 8px rgba(192, 86, 33, 0.15) !important;
  }

  /* Annotation option icon buttons (stroke, opacity, shadow, position) */
  .FIE_annotation-option-triggerer {
    border-radius: 10px !important;
    padding: 8px !important;
    transition: all 0.15s ease !important;
    color: #6B7280 !important;
  }
  .FIE_annotation-option-triggerer:hover {
    background: rgba(192, 86, 33, 0.06) !important;
    color: #C05621 !important;
  }
  .FIE_annotation-option-triggerer:hover svg {
    color: #C05621 !important;
  }

  /* Annotation option popup (stroke fields, opacity slider, etc.) */
  .FIE_annotation-option-popup {
    border-radius: 14px !important;
    box-shadow: 0 8px 32px rgba(139, 109, 80, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06) !important;
    border: 1px solid #E8E0D8 !important;
    overflow: hidden !important;
  }
  .FIE_annotation-option-popup > div {
    background: #FDFCF8 !important;
    border-radius: 14px !important;
    padding: 12px 16px !important;
    font-family: Inter, system-ui, sans-serif !important;
  }

  /* Color picker modal */
  .SfxModal-root {
    backdrop-filter: blur(4px) !important;
  }
  .SfxModal-container {
    border-radius: 16px !important;
    box-shadow: 0 20px 60px rgba(139, 109, 80, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08) !important;
    border: 1px solid #E8E0D8 !important;
    overflow: hidden !important;
  }
  .SfxModal-container,
  .SfxModalContent-root {
    background: #FDFCF8 !important;
  }
  .SfxModalTitle-root {
    background: #FAF7F4 !important;
    border-bottom: 1px solid #F0EBE4 !important;
  }
  .SfxModalActions-root {
    background: #FAF7F4 !important;
    border-top: 1px solid #F0EBE4 !important;
    padding: 16px 24px !important;
  }
  .SfxModalActions-root .SfxButton-root[color="primary"] {
    background: #C05621 !important;
    border-radius: 10px !important;
    color: #fff !important;
    border: none !important;
  }
  .SfxModalActions-root .SfxButton-root[color="primary"]:hover {
    background: #A84A1C !important;
  }
  .SfxModalActions-root .SfxButton-root[color="basic"] {
    border-radius: 10px !important;
    border-color: #E8E0D8 !important;
    color: #4A5568 !important;
  }

  /* Color picker component styling */
  .SfxColorPicker-root {
    background: #FDFCF8 !important;
    font-family: Inter, system-ui, sans-serif !important;
  }
  .SfxColorPicker-root input {
    border-radius: 8px !important;
    border-color: #E8E0D8 !important;
    font-family: Inter, system-ui, sans-serif !important;
  }
  .SfxColorPicker-root input:focus {
    border-color: #C05621 !important;
  }

  /* Pinned colors in color picker */
  .SfxColorPicker-root [class*="pinned"] div,
  .SfxColorPicker-root [class*="Pinned"] div {
    border-radius: 6px !important;
    border: 1.5px solid #E8E0D8 !important;
  }

  /* Labels inside options */
  .FIE_root label {
    font-family: Inter, system-ui, sans-serif !important;
    color: #4A5568 !important;
    font-size: 12px !important;
    font-weight: 500 !important;
  }

  /* Scrollbar styling */
  .FIE_root ::-webkit-scrollbar {
    width: 6px;
  }
  .FIE_root ::-webkit-scrollbar-track {
    background: transparent;
  }
  .FIE_root ::-webkit-scrollbar-thumb {
    background: #D5CEC6;
    border-radius: 3px;
  }
  .FIE_root ::-webkit-scrollbar-thumb:hover {
    background: #C05621;
  }
`;

export function FilerobotEditor({ imageSrc, onSave, onClose }: FilerobotEditorProps) {
  // Inject style overrides once
  useEffect(() => {
    const id = "dexo-filerobot-overrides";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = FILEROBOT_STYLE_OVERRIDES;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

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
          stroke: "#1B2432",
          strokeWidth: 2,
          opacity: 1,
        }}
        Pen={{
          strokeWidth: 3,
          tension: 0.4,
          lineCap: "round" as const,
          selectAnnotationAfterDrawing: true,
        }}
        Line={{ strokeWidth: 2, lineCap: "round" as const }}
        Arrow={{ strokeWidth: 3, lineCap: "round" as const }}
        Rect={{ cornerRadius: 4 }}
        Polygon={{ sides: 4 }}
        Text={{
          text: "DEXO",
          fontSize: 24,
          fontFamily: "Inter",
          fonts: [
            { label: "Inter", value: "Inter" },
            { label: "Playfair Display", value: "Playfair Display" },
            "Arial",
            "Georgia",
            "Tahoma",
          ],
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
