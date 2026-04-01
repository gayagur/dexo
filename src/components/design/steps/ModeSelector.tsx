import { DesignStepLayout } from "../DesignStepLayout";
import { SelectionCard } from "../SelectionCard";

interface ModeSelectorProps {
  onSelect: (mode: "furniture" | "decorative") => void;
}

export function ModeSelector({ onSelect }: ModeSelectorProps) {
  return (
    <DesignStepLayout
      title="What would you like to create?"
      subtitle="Choose a design category to get started."
      breadcrumbs={[{ label: "Design Studio" }]}
    >
      <div className="grid sm:grid-cols-2 gap-8 max-w-3xl">
        <SelectionCard
          icon="🪑"
          label="Custom Furniture"
          description="Tables, shelves, cabinets, desks and more. Design from scratch with our 3D editor."
          imageUrl="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=75&auto=format&fit=crop"
          onClick={() => onSelect("furniture")}
        />
        <SelectionCard
          icon="🎨"
          label="Decorative Items"
          description="Wall art, lighting, planters, home accessories. Upload inspiration or describe your vision."
          imageUrl="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=75&auto=format&fit=crop"
          onClick={() => onSelect("decorative")}
        />
      </div>
    </DesignStepLayout>
  );
}
