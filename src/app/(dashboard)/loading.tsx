import { CardSkeleton, Skeleton } from '@/components/ui/states'

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}
