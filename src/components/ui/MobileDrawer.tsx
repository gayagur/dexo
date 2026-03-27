import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: "half" | "full" | number;
}

export function MobileDrawer({ isOpen, onClose, title, children, height = "half" }: MobileDrawerProps) {
  // vaul treats numbers as fractions of container height, strings as pixel values
  const snaps = typeof height === "number"
    ? [Math.min(height / window.innerHeight, 1), 1]
    : height === "full" ? [1] : [0.5, 1];

  return (
    <DrawerPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      snapPoints={snaps}
      shouldScaleBackground={false}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <DrawerPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 flex h-[96dvh] flex-col rounded-t-2xl border-t bg-white overflow-hidden"
          style={{ touchAction: "auto" }}
        >
          {/* Drag handle */}
          <div className="flex items-center justify-center py-2 shrink-0">
            <div className="h-1.5 w-12 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 pb-2 shrink-0">
              <DrawerPrimitive.Title className="text-sm font-semibold text-gray-900">
                {title}
              </DrawerPrimitive.Title>
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}

          {/* Content — scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4" style={{ touchAction: "auto" }}>
            {children}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
