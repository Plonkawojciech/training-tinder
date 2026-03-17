export default function AppLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 mb-6">
        <div className="skeleton h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-48 rounded-full" />
          <div className="skeleton h-3 w-32 rounded-full" />
        </div>
      </div>

      {/* Hero card skeleton */}
      <div className="skeleton h-36 w-full rounded-[20px] mb-6" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-[20px]" />
        ))}
      </div>

      {/* Content rows skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-[16px]" />
        ))}
      </div>
    </div>
  );
}
