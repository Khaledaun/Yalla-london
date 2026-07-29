export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] pt-28 px-7 animate-pulse">
      <div className="max-w-7xl mx-auto">
        {/* Hero skeleton */}
        <div className="h-8 w-48 bg-[#D6D0C4]/40 rounded mb-3" />
        <div className="h-5 w-80 bg-[#D6D0C4]/30 rounded mb-8" />
        {/* Tri-bar */}
        <div className="flex h-1 mb-8">
          <div className="flex-1 bg-[#C8322B]/20" />
          <div className="flex-1 bg-[#1C2B39]/20" />
          <div className="flex-1 bg-[#C49A2A]/20" />
        </div>
        {/* Content grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-[#D6D0C4]/30">
              <div className="h-48 bg-[#D6D0C4]/20" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-3/4 bg-[#D6D0C4]/30 rounded" />
                <div className="h-3 w-full bg-[#D6D0C4]/20 rounded" />
                <div className="h-3 w-2/3 bg-[#D6D0C4]/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
