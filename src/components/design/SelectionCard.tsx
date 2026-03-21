interface SelectionCardProps {
  icon: string;
  label: string;
  description?: string;
  gradient?: string;
  imageUrl?: string;
  onClick: () => void;
}

export function SelectionCard({
  icon,
  label,
  description,
  gradient = "from-amber-50 to-orange-50",
  imageUrl,
  onClick,
}: SelectionCardProps) {
  if (imageUrl) {
    return (
      <button
        onClick={onClick}
        className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white text-left transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-xl hover:shadow-[#C87D5A]/10 hover:border-[#C87D5A]/30 min-h-[250px] flex flex-col"
      >
        {/* Image section - 65% */}
        <div className="relative w-full flex-[0_0_65%] overflow-hidden">
          <img
            src={imageUrl}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
          {/* Gradient overlay for smooth transition to text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Text section - 35% */}
        <div className="relative flex-[0_0_35%] p-4 flex flex-col justify-center bg-gradient-to-b from-white to-[#FDF8F4]">
          <h3 className="font-serif font-medium text-gray-900 text-sm leading-snug">
            {label}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Hover shine effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </button>
    );
  }

  // Fallback: emoji display with gradient background
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white text-left transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-xl hover:shadow-[#C87D5A]/10 hover:border-[#C87D5A]/30 min-h-[250px] flex flex-col"
    >
      {/* Emoji / gradient section */}
      <div
        className={`relative w-full flex-[0_0_65%] bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}
      >
        <span className="text-5xl transition-transform duration-300 group-hover:scale-110 drop-shadow-sm">
          {icon}
        </span>
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/20 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/15 rounded-full" />
      </div>

      {/* Text section */}
      <div className="relative flex-[0_0_35%] p-4 flex flex-col justify-center bg-gradient-to-b from-white to-[#FDF8F4]">
        <h3 className="font-serif font-medium text-gray-900 text-sm leading-snug">
          {label}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Hover shine effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </button>
  );
}
