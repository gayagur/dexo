import { motion, AnimatePresence } from "framer-motion";
import { FilerobotEditor } from "./FilerobotEditor";

interface FilerobotEditorModalProps {
  isOpen: boolean;
  imageSrc: string;
  onSave: (imageBase64: string) => void;
  onClose: () => void;
}

export function FilerobotEditorModal({
  isOpen,
  imageSrc,
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
