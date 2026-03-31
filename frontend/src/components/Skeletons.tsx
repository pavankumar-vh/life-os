'use client'

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card animate-pulse">
      <div className="h-4 w-1/3 skeleton mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 skeleton mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function StatSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="w-9 h-9 rounded-xl skeleton mb-3" />
      <div className="h-6 w-16 skeleton mb-1" />
      <div className="h-3 w-20 skeleton" />
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card animate-pulse flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl skeleton shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-1/3 skeleton mb-2" />
            <div className="h-3 w-1/2 skeleton" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <StatSkeleton key={i} />
      ))}
    </div>
  )
}
