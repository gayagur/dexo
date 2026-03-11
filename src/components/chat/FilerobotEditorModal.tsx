import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { FilerobotEditor } from "./FilerobotEditor";

interface FilerobotEditorModalProps {
  isOpen: boolean;
  imageSrc: string;
  saving?: boolean;
  onSave: (imageBase64: string) => void;
  onClose: () => void;
}

/** Convert a remote image URL to a base64 data URL (avoids CORS canvas tainting in Filerobot) */
function useImageAsBase64(url: string, enabled: boolean) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !url) { setDataUrl(null); return; }
    if (url.startsWith('data:')) { setDataUrl(url); return; }

    let cancelled = false;
    setDataUrl(null);

    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => { if (!cancelled) setDataUrl(reader.result as string); };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        // Fallback: pass URL directly and hope Filerobot handles it
        if (!cancelled) setDataUrl(url);
      });

    return () => { cancelled = true; };
  }, [url, enabled]);

  return dataUrl;
}

export function FilerobotEditorModal({
  isOpen,
  imageSrc,
  saving = false,
  onSave,
  onClose,
}: FilerobotEditorModalProps) {
  const resolvedSrc = useImageAsBase64(imageSrc, isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop — warm tinted overlay */}
          <div className="absolute inset-0 bg-[#1B2432]/60 backdrop-blur-sm" />

          {/* Editor container */}
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10 w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(139, 109, 80, 0.2), 0 8px 24px rgba(0, 0, 0, 0.1)' }}
          >
            {resolvedSrc ? (
              <FilerobotEditor
                imageSrc={resolvedSrc}
                onSave={onSave}
                onClose={onClose}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-[#FAF7F4]">
                <Loader2 className="w-8 h-8 text-[#C05621] animate-spin" />
              </div>
            )}

            {/* Saving overlay */}
            {saving && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#FAF7F4]/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 bg-white/90 rounded-2xl px-8 py-6 shadow-lg border border-[#E8E0D8]">
                  <Loader2 className="w-8 h-8 text-[#C05621] animate-spin" />
                  <span className="text-sm text-[#1B2432] font-medium">Saving image...</span>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
