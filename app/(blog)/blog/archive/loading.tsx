import { Skeleton } from "@/components/ui/Skeleton";

const titleWidths = ["w-2/3", "w-1/2", "w-3/5", "w-2/5"];

// 骨架结构与归档页一致，避免布局跳动。
export default function ArchiveLoading() {
  return (
    <div aria-busy="true">
      <Skeleton className="h-12 w-40" />
      <Skeleton className="mt-3 h-5 w-56" />
      <div className="mt-12 space-y-14">
        {Array.from({ length: 2 }, (_, s) => (
          <section key={s}>
            <Skeleton className="h-9 w-24" />
            <ul className="mt-6 space-y-4 border-l-2 border-border pl-6">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-4">
                  <Skeleton className={`h-5 ${titleWidths[i % titleWidths.length]}`} />
                  <Skeleton className="h-4 w-24" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
