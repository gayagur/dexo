import { DesignStepLayout } from "../DesignStepLayout";
import { SelectionCard } from "../SelectionCard";
import {
  FURNITURE_BY_SPACE,
  HOME_ROOMS,
  COMMERCIAL_SPACES,
  type FurnitureOption,
} from "@/lib/furnitureData";

const FURNITURE_IMAGES: Record<string, string> = {
  // ── Living Room ──────────────────────────────────────
  sofa: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=75&auto=format&fit=crop",
  armchair: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=75&auto=format&fit=crop",
  coffee_table: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=400&q=75&auto=format&fit=crop",
  tv_unit: "https://images.unsplash.com/photo-1593085260707-5377ba37f868?w=400&q=75&auto=format&fit=crop",
  bookshelf: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&q=75&auto=format&fit=crop",
  side_table: "https://images.unsplash.com/photo-1499933374294-4584851497cc?w=400&q=75&auto=format&fit=crop",
  display_cabinet: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400&q=75&auto=format&fit=crop",

  // ── Kitchen ──────────────────────────────────────────
  dining_table: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&q=75&auto=format&fit=crop",
  dining_chair: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&q=75&auto=format&fit=crop",
  kitchen_island: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=75&auto=format&fit=crop",
  bar_stool: "https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=400&q=75&auto=format&fit=crop",
  pantry_cabinet: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400&q=75&auto=format&fit=crop",

  // ── Bedroom ──────────────────────────────────────────
  bed: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=75&auto=format&fit=crop",
  nightstand: "https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=400&q=75&auto=format&fit=crop",
  dresser: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=400&q=75&auto=format&fit=crop",
  wardrobe: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=75&auto=format&fit=crop",
  vanity_table: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=400&q=75&auto=format&fit=crop",
  bench: "https://images.unsplash.com/photo-1611464908623-07f19927264e?w=400&q=75&auto=format&fit=crop",

  // ── Bathroom ─────────────────────────────────────────
  vanity_cabinet: "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=400&q=75&auto=format&fit=crop",
  storage_shelf: "https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=400&q=75&auto=format&fit=crop",
  mirror_cabinet: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=75&auto=format&fit=crop",
  laundry_hamper: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&q=75&auto=format&fit=crop",

  // ── Kids Room ────────────────────────────────────────
  kids_bed: "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=400&q=75&auto=format&fit=crop",
  bunk_bed: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=75&auto=format&fit=crop",
  study_desk: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=75&auto=format&fit=crop",
  toy_storage: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&q=75&auto=format&fit=crop",
  kids_bookshelf: "https://images.unsplash.com/photo-1588279102819-f4e267de4e6f?w=400&q=75&auto=format&fit=crop",

  // ── Office ───────────────────────────────────────────
  desk: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=75&auto=format&fit=crop",
  office_chair: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&q=75&auto=format&fit=crop",
  filing_cabinet: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=400&q=75&auto=format&fit=crop",
  office_bookshelf: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&q=75&auto=format&fit=crop",
  standing_desk: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=400&q=75&auto=format&fit=crop",

  // ── Workshop ─────────────────────────────────────────
  workbench: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=75&auto=format&fit=crop",
  tool_cabinet: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400&q=75&auto=format&fit=crop",
  storage_rack: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=75&auto=format&fit=crop",

  // ── Balcony / Patio ──────────────────────────────────
  outdoor_table: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&q=75&auto=format&fit=crop",
  outdoor_chair: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&q=75&auto=format&fit=crop",
  lounge_chair: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&q=75&auto=format&fit=crop",
  plant_stand: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=75&auto=format&fit=crop",
  storage_bench: "https://images.unsplash.com/photo-1611464908623-07f19927264e?w=400&q=75&auto=format&fit=crop",

  // ── Commercial: Retail ───────────────────────────────
  display_shelf: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&q=75&auto=format&fit=crop",
  checkout_counter: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&q=75&auto=format&fit=crop",
  product_table: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&q=75&auto=format&fit=crop",
  clothing_rack: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=75&auto=format&fit=crop",

  // ── Commercial: Office ───────────────────────────────
  office_desk_c: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=75&auto=format&fit=crop",
  meeting_table: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=400&q=75&auto=format&fit=crop",
  reception_desk: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=75&auto=format&fit=crop",

  // ── Commercial: Restaurant ───────────────────────────
  cafe_table: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=75&auto=format&fit=crop",
  cafe_chair: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&q=75&auto=format&fit=crop",
  bar_counter: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=75&auto=format&fit=crop",
  booth_seating: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=75&auto=format&fit=crop",

  // ── Commercial: Clinic ───────────────────────────────
  reception_clinic: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=75&auto=format&fit=crop",
  waiting_chair: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&q=75&auto=format&fit=crop",
  medical_cabinet: "https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=400&q=75&auto=format&fit=crop",

  // ── Commercial: Hotel ────────────────────────────────
  lobby_sofa: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=75&auto=format&fit=crop",
  reception_hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=75&auto=format&fit=crop",
  console_table: "https://images.unsplash.com/photo-1499933374294-4584851497cc?w=400&q=75&auto=format&fit=crop",

  // ── Commercial: Salon ────────────────────────────────
  styling_station: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=75&auto=format&fit=crop",
  salon_chair: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&q=75&auto=format&fit=crop",
  reception_salon: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=75&auto=format&fit=crop",

  // ── Commercial: Conference ───────────────────────────
  conference_table: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=400&q=75&auto=format&fit=crop",
  podium: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&q=75&auto=format&fit=crop",
  credenza: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=400&q=75&auto=format&fit=crop",
};

interface FurnitureTypeSelectorProps {
  spaceType: "home" | "commercial";
  roomId: string;
  onSelect: (furniture: FurnitureOption) => void;
  onBack: () => void;
  onBackToStart: () => void;
}

export function FurnitureTypeSelector({
  spaceType,
  roomId,
  onSelect,
  onBack,
  onBackToStart,
}: FurnitureTypeSelectorProps) {
  const furniture: FurnitureOption[] = FURNITURE_BY_SPACE[roomId] ?? [];
  const allRooms = spaceType === "home" ? HOME_ROOMS : COMMERCIAL_SPACES;
  const room = allRooms.find((r) => r.id === roomId);
  const spaceLabel = spaceType === "home" ? "Home" : "Commercial";

  return (
    <DesignStepLayout
      title={`What are you making for the ${room?.label ?? "space"}?`}
      subtitle="Select the type of furniture to start designing."
      breadcrumbs={[
        { label: "Design Studio", onClick: onBackToStart },
        { label: spaceLabel },
        { label: room?.label ?? "Room", onClick: onBack },
        { label: "Furniture Type" },
      ]}
      onBack={onBack}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {furniture.map((item) => (
          <SelectionCard
            key={item.id}
            icon={item.icon}
            label={item.label}
            description={`${item.defaultDims.w} x ${item.defaultDims.h} x ${item.defaultDims.d} mm`}
            imageUrl={FURNITURE_IMAGES[item.id]}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </DesignStepLayout>
  );
}
