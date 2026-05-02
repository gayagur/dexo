import { useState, useCallback, useEffect } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pipette, Palette } from "lucide-react";
import { CURATED_PALETTE, COLOR_FAMILIES } from "@/lib/3d/materials/colorPalette";
import type { ColorFamily } from "@/lib/3d/materials/colorPalette";

const RECENT_KEY = "dexo_recent_picker_colors";
const MAX_RECENT = 5;

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
  catch { return []; }
}
function saveRecent(hex: string): string[] {
  const recent = [hex, ...loadRecent().filter((c) => c !== hex)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  return recent;
}

interface MaterialColorPickerProps {
  value: string | null;
  acceptsColorTint: boolean;
  onChange: (hex: string) => void;
  onClose?: () => void;
}

export function MaterialColorPicker({ value, acceptsColorTint, onChange, onClose }: MaterialColorPickerProps) {
  const [tab, setTab] = useState<"palette" | "custom">("palette");
  const [recent, setRecent] = useState(loadRecent);
  const [localColor, setLocalColor] = useState(value || "#FAFAFA");

  useEffect(() => {
    if (value) setLocalColor(value);
  }, [value]);

  const handleSelect = useCallback((hex: string) => {
    setLocalColor(hex);
    onChange(hex);
    setRecent(saveRecent(hex));
  }, [onChange]);

  const handleCustomChange = useCallback((hex: string) => {
    setLocalColor(hex);
  }, []);

  const handleCustomCommit = useCallback(() => {
    onChange(localColor);
    setRecent(saveRecent(localColor));
  }, [localColor, onChange]);

  if (!acceptsColorTint) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          This material's natural color is fixed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Recent colors */}
      {recent.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Recent</p>
          <div className="flex gap-1.5">
            {recent.map((hex) => (
              <button
                key={hex}
                onClick={() => handleSelect(hex)}
                className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: hex,
                  borderColor: value === hex ? "#C87D5A" : "rgba(0,0,0,0.08)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 p-0.5 bg-muted/50 rounded-full">
        <button
          onClick={() => setTab("palette")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
            tab === "palette"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Palette className="w-3 h-3" />
          Recommended
        </button>
        <button
          onClick={() => setTab("custom")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
            tab === "custom"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pipette className="w-3 h-3" />
          Custom
        </button>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === "palette" ? (
          <motion.div
            key="palette"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1"
          >
            {COLOR_FAMILIES.map((family) => {
              const colors = CURATED_PALETTE.filter((c) => c.family === family.id);
              if (colors.length === 0) return null;
              return (
                <div key={family.id}>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                    {family.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {colors.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelect(c.hex)}
                        title={c.name}
                        className="w-7 h-7 rounded-lg transition-all hover:scale-110 relative group"
                        style={{
                          backgroundColor: c.hex,
                          boxShadow: value === c.hex
                            ? "0 0 0 2px #C87D5A, 0 0 0 4px rgba(201,106,61,0.2)"
                            : "inset 0 0 0 1px rgba(0,0,0,0.06)",
                        }}
                      >
                        {value === c.hex && (
                          <Check className="w-3 h-3 absolute inset-0 m-auto text-white drop-shadow-sm" />
                        )}
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {c.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div className="[&_.react-colorful]:w-full [&_.react-colorful]:h-[140px] [&_.react-colorful]:rounded-xl">
              <HexColorPicker color={localColor} onChange={handleCustomChange} />
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg shrink-0"
                style={{
                  backgroundColor: localColor,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
                }}
              />
              <div className="flex-1 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">#</span>
                <HexColorInput
                  color={localColor}
                  onChange={handleCustomChange}
                  className="flex-1 text-xs font-mono bg-muted/50 rounded-lg px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-[#C87D5A] uppercase"
                  prefixed={false}
                />
              </div>
              <button
                onClick={handleCustomCommit}
                className="px-3 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
