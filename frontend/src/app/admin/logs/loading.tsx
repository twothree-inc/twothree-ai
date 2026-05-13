import { Skeleton } from '@/components/ui/Skeleton';

export default function LogsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-1 w-full overflow-hidden rounded bg-gray-200">
        <div className="animate-loading-bar h-full w-1/4 rounded bg-blue-500" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-36" />
            <span className="text-sm text-gray-400">〜</span>
            <Skeleton className="h-8 w-36" />
          </div>
          <div className="space-y-1 rounded-lg border border-gray-200 bg-white px-4 py-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
