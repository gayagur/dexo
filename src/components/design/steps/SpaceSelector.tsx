import { DesignStepLayout } from "../DesignStepLayout";
import { SelectionCard } from "../SelectionCard";

interface SpaceSelectorProps {
  onSelect: (space: "home" | "commercial") => void;
  onBack: () => void;
}

export function SpaceSelector({ onSelect, onBack }: SpaceSelectorProps) {
  return (
    <DesignStepLayout
      title="Where will this piece live?"
      subtitle="Select the type of space for your furniture."
      breadcrumbs={[
        { label: "Design Studio", onClick: onBack },
        { label: "Space Type" },
      ]}
      onBack={onBack}
    >
      <div className="grid sm:grid-cols-2 gap-8 max-w-3xl">
        <SelectionCard
          icon="🏠"
          label="Home / Residential"
          description="Living rooms, bedrooms, kitchens, offices and more"
          gradient="from-amber-50 to-orange-50"
          imageUrl="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&q=75&auto=format&fit=crop"
          onClick={() => onSelect("home")}
        />
        <SelectionCard
          icon="🏢"
          label="Commercial / Business"
          description="Retail, restaurants, offices, clinics and more"
          gradient="from-blue-50 to-indigo-50"
          imageUrl="https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=75&auto=format&fit=crop"
          onClick={() => onSelect("commercial")}
        />
      </div>
    </DesignStepLayout>
  );
}
