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
  sofa: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
  armchair: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80",
  coffee_table: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=600&q=80",
  tv_unit: "https://images.unsplash.com/photo-1593085260707-5377ba37f868?w=600&q=80",
  bookshelf: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=600&q=80",
  side_table: "https://images.unsplash.com/photo-1499933374294-4584851497cc?w=600&q=80",
  display_cabinet: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&q=80",

  // ── Kitchen ──────────────────────────────────────────
  dining_table: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80",
  dining_chair: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&q=80",
  kitchen_island: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
  bar_stool: "https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=600&q=80",
  pantry_cabinet: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=600&q=80",

  // ── Bedroom ──────────────────────────────────────────
  bed: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80",
  nightstand: "https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=600&q=80",
  dresser: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=600&q=80",
  wardrobe: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",
  vanity_table: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=600&q=80",
  bench: "https://images.unsplash.com/photo-1611464908623-07f19927264e?w=600&q=80",

  // ── Bathroom ─────────────────────────────────────────
  vanity_cabinet: "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600&q=80",
  storage_shelf: "https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=600&q=80",
  mirror_cabinet: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80",
  laundry_hamper: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80",

  // ── Kids Room ────────────────────────────────────────
  kids_bed: "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=600&q=80",
  bunk_bed: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
  study_desk: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&q=80",
  toy_storage: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80",
  kids_bookshelf: "https://images.unsplash.com/photo-1588279102819-f4e267de4e6f?w=600&q=80",

  // ── Office ───────────────────────────────────────────
  desk: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&q=80",
  office_chair: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&q=80",
  filing_cabinet: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=600&q=80",
  office_bookshelf: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=600&q=80",
  standing_desk: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=600&q=80",

  // ── Workshop ─────────────────────────────────────────
  workbench: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80",
  tool_cabinet: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=600&q=80",
  storage_rack: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",

  // ── Balcony / Patio ──────────────────────────────────
  outdoor_table: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80",
  outdoor_chair: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&q=80",
  lounge_chair: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80",
  plant_stand: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80",
  storage_bench: "https://images.unsplash.com/photo-1611464908623-07f19927264e?w=600&q=80",

  // ── Commercial: Retail ───────────────────────────────
  display_shelf: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=600&q=80",
  checkout_counter: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80",
  product_table: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80",
  clothing_rack: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",

  // ── Commercial: Office ───────────────────────────────
  office_desk_c: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
  meeting_table: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=600&q=80",
  reception_desk: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",

  // ── Commercial: Restaurant ───────────────────────────
  cafe_table: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
  cafe_chair: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&q=80",
  bar_counter: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80",
  booth_seating: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80",

  // ── Commercial: Clinic ───────────────────────────────
  reception_clinic: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&q=80",
  waiting_chair: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&q=80",
  medical_cabinet: "https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=600&q=80",

  // ── Commercial: Hotel ────────────────────────────────
  lobby_sofa: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
  reception_hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
  console_table: "https://images.unsplash.com/photo-1499933374294-4584851497cc?w=600&q=80",

  // ── Commercial: Salon ────────────────────────────────
  styling_station: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
  salon_chair: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&q=80",
  reception_salon: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",

  // ── Commercial: Conference ───────────────────────────
  conference_table: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=600&q=80",
  podium: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80",
  credenza: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=600&q=80",
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
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
