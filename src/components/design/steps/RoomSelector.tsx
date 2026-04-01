import { DesignStepLayout } from "../DesignStepLayout";
import { SelectionCard } from "../SelectionCard";
import { HOME_ROOMS, COMMERCIAL_SPACES, type SpaceOption } from "@/lib/furnitureData";

const ROOM_IMAGES: Record<string, string> = {
  // Home
  living_room: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=75&auto=format&fit=crop",
  kitchen: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=75&auto=format&fit=crop",
  bedroom: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&q=75&auto=format&fit=crop",
  bathroom: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=75&auto=format&fit=crop",
  kids_room: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&q=75&auto=format&fit=crop",
  office: "https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400&q=75&auto=format&fit=crop",
  workshop: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&q=75&auto=format&fit=crop",
  balcony: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&q=75&auto=format&fit=crop",
  // Commercial
  retail: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&q=75&auto=format&fit=crop",
  coworking: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=75&auto=format&fit=crop",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=75&auto=format&fit=crop",
  clinic: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=75&auto=format&fit=crop",
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=75&auto=format&fit=crop",
  salon: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=75&auto=format&fit=crop",
  conference: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=400&q=75&auto=format&fit=crop",
};

interface RoomSelectorProps {
  spaceType: "home" | "commercial";
  onSelect: (roomId: string) => void;
  onBack: () => void;
  onBackToStart: () => void;
}

export function RoomSelector({ spaceType, onSelect, onBack, onBackToStart }: RoomSelectorProps) {
  const rooms: SpaceOption[] = spaceType === "home" ? HOME_ROOMS : COMMERCIAL_SPACES;
  const spaceLabel = spaceType === "home" ? "Home" : "Commercial";

  return (
    <DesignStepLayout
      title={`Choose a ${spaceLabel.toLowerCase()} space`}
      subtitle="Pick the room or area where this furniture will be placed."
      breadcrumbs={[
        { label: "Design Studio", onClick: onBackToStart },
        { label: spaceLabel, onClick: onBack },
        { label: "Room" },
      ]}
      onBack={onBack}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {rooms.map((room) => (
          <SelectionCard
            key={room.id}
            icon={room.icon}
            label={room.label}
            gradient={room.gradient}
            imageUrl={ROOM_IMAGES[room.id]}
            onClick={() => onSelect(room.id)}
          />
        ))}
      </div>
    </DesignStepLayout>
  );
}
