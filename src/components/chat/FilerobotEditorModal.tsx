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

export function FilerobotEditorModal({
  isOpen,
  imageSrc,
  saving = false,
  onSave,
  onClose,
}: FilerobotEditorModalProps) {
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
          {/* Backdrop — no click-to-close to prevent accidental data loss */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Editor container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] rounded-2xl overflow-hidden shadow-2xl"
          >
            <FilerobotEditor
              imageSrc={imageSrc}
              onSave={onSave}
              onClose={onClose}
            />

            {/* Saving overlay */}
            {saving && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <span className="text-sm text-white font-medium">Saving image...</span>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
