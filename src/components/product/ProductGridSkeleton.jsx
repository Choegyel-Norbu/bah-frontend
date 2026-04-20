/** Placeholder cards while the product grid loads — mirrors ProductCard layout. */
function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col bg-white/90 p-2 sm:p-3">
      <div className="aspect-[3/4] w-full animate-pulse rounded-sm bg-gray-200" />
      <div className="mt-2 flex min-h-[112px] flex-col gap-2 sm:mt-4 sm:min-h-[140px]">
        <div className="flex items-center justify-between gap-2">
          <div className="h-2.5 w-20 animate-pulse rounded bg-gray-200 sm:h-3 sm:w-24" />
          <div className="h-2.5 w-10 animate-pulse rounded bg-gray-200 sm:h-3 sm:w-12" />
        </div>
        <div className="h-4 w-full animate-pulse rounded bg-gray-200 sm:h-5" />
        <div className="h-4 w-[85%] animate-pulse rounded bg-gray-200 sm:h-5" />
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200 sm:w-28" />
        <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
        <div className="mt-1 h-8 w-full animate-pulse rounded-full bg-gray-200 sm:h-9 lg:hidden" />
      </div>
    </div>
  );
}

export default function ProductGridSkeleton({ count = 12 }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-3 xl:grid-cols-4"
    >
      <span className="sr-only">Loading products</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}
