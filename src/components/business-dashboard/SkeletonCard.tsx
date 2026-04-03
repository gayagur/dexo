interface SkeletonCardProps {
  variant?: 'status' | 'offer-row' | 'project';
}

export function SkeletonCard({ variant = 'status' }: SkeletonCardProps) {
  if (variant === 'offer-row') {
    return (
      <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
        <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-100 rounded-md w-2/5" />
          <div className="h-3 bg-gray-50 rounded-md w-3/5" />
        </div>
        <div className="h-3.5 bg-gray-100 rounded-md w-16" />
        <div className="h-5 bg-gray-50 rounded-full w-16" />
      </div>
    );
  }

  if (variant === 'project') {
    return (
      <div className="bg-white rounded-[14px] border border-black/[0.07] overflow-hidden animate-pulse">
        <div className="aspect-[16/10] bg-gray-100" />
        <div className="p-4 space-y-2.5">
          <div className="h-4 bg-gray-100 rounded-md w-3/4" />
          <div className="flex items-center gap-2">
            <div className="h-5 bg-gray-50 rounded-full w-16" />
            <div className="h-3 bg-gray-50 rounded-md w-20" />
          </div>
        </div>
      </div>
    );
  }

  // status card skeleton
  return (
    <div className="bg-white rounded-[14px] border border-black/[0.07] p-5 animate-pulse">
      <div className="h-3 bg-gray-100 rounded-md w-20 mb-3" />
      <div className="h-8 bg-gray-100 rounded-md w-10" />
    </div>
  );
}
