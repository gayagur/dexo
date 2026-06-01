import { useState } from "react";

interface SelectionCardProps {
  icon: string;
  label: string;
  description?: string;
  gradient?: string;
  imageUrl?: string;
  selected?: boolean;
  onClick: () => void;
}

export function SelectionCard({
  icon,
  label,
  description,
  gradient = "from-cream to-cream-warm",
  imageUrl,
  selected = false,
  onClick,
}: SelectionCardProps) {
  const [imgError, setImgError] = useState(false);
  const useImage = imageUrl && !imgError;

  const baseClasses = [
    "group relative overflow-hidden rounded-sm border bg-white text-left",
    "transition-all duration-300 ease-out",
    "hover:shadow-lg hover:shadow-terracotta/10 hover:border-terracotta",
    "min-h-[180px] sm:min-h-[250px] flex flex-col",
    selected
      ? "border-terracotta ring-2 ring-terracotta ring-offset-2"
      : "border-navy/10",
  ].join(" ");

  if (useImage) {
    return (
      <button onClick={onClick} className={baseClasses}>
        <div className="relative w-full flex-[0_0_65%] overflow-hidden">
          <img
            src={imageUrl}
            alt={label}
            loading="lazy"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        <div className="relative flex-[0_0_35%] p-4 flex flex-col justify-center bg-white">
          <h3 className="font-serif font-medium text-navy text-sm leading-snug">
            {label}
          </h3>
          {description && (
            <p className="font-sans text-xs text-stone mt-1 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-sm bg-terracotta flex items-center justify-center">
            <svg className="w-3 h-3 text-cream" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </button>
    );
  }

  return (
    <button onClick={onClick} className={baseClasses}>
      <div className={`relative w-full flex-[0_0_65%] bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        <span className="text-5xl transition-transform duration-300 group-hover:scale-110 drop-shadow-sm">
          {icon}
        </span>
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-terracotta/5 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-terracotta/5 rounded-full" />
      </div>

      <div className="relative flex-[0_0_35%] p-4 flex flex-col justify-center bg-white">
        <h3 className="font-serif font-medium text-navy text-sm leading-snug">
          {label}
        </h3>
        {description && (
          <p className="font-sans text-xs text-stone mt-1 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-sm bg-terracotta flex items-center justify-center">
          <svg className="w-3 h-3 text-cream" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}
