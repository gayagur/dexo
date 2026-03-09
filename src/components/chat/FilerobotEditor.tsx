import FilerobotImageEditor, { TABS, TOOLS } from "react-filerobot-image-editor";

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
  return (
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
