import { DesignStepLayout } from "../DesignStepLayout";
import { Sparkles } from "lucide-react";

interface MethodSelectorProps {
  onSelect: (method: "editor" | "ai") => void;
  onBack: () => void;
}

const METHODS = [
  {
    id: "editor" as const,
    imageUrl:
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&q=80",
    title: "Design It Myself",
    description:
      "Use our visual 3D editor to build your furniture piece — choose dimensions, materials, and style with full control.",
  },
  {
    id: "ai" as const,
    imageUrl:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80",
    title: "Let AI Help Me",
    description:
      "Chat with our AI assistant to describe your vision. Upload inspiration images and get a detailed project brief.",
  },
];

export function MethodSelector({ onSelect, onBack }: MethodSelectorProps) {
  return (
    <DesignStepLayout
      title="How would you like to design?"
      subtitle="Choose your preferred creation method."
      breadcrumbs={[
        { label: "New Project", onClick: onBack },
        { label: "Method" },
      ]}
      onBack={onBack}
    >
      {/* Hero badge */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C87D5A]/10 text-[#C87D5A] text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          Choose your path
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {METHODS.map((method) => (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white text-left transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-2xl hover:shadow-[#C87D5A]/10 hover:border-[#C87D5A]/30 min-h-[340px] flex flex-col"
          >
            {/* Image area */}
            <div className="relative w-full flex-[0_0_65%] overflow-hidden">
              <img
                src={method.imageUrl}
                alt={method.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </div>

            {/* Text area */}
            <div className="relative flex-[0_0_35%] p-5 flex flex-col justify-center bg-gradient-to-b from-white to-[#FDF8F4]">
              <h3 className="text-lg font-serif text-gray-900 mb-1.5">
                {method.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {method.description}
              </p>
            </div>

            {/* Hover shine */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </button>
        ))}
      </div>
    </DesignStepLayout>
  );
}
