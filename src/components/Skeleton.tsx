export function SkeletonLine({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`h-4 rounded-md bg-[var(--bg-hover)] animate-pulse ${className}`} style={style} />
  );
}

export function SkeletonTask({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] animate-pulse" />
          <SkeletonLine className="flex-1" style={{ animationDelay: `${i * 100}ms` } as React.CSSProperties} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
          <SkeletonLine className="w-3/4" />
          <SkeletonLine className="w-1/2" />
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full bg-[var(--bg-hover)] animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-[var(--bg-hover)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonSidebar() {
  return (
    <div className="space-y-6 p-4">
      <SkeletonLine className="w-2/3 h-6" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-hover)] animate-pulse" />
          <SkeletonLine className="flex-1" />
        </div>
      ))}
    </div>
  );
}
