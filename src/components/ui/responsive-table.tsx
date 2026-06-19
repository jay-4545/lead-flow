import { cn } from "@/lib/utils"

export function ResponsiveTableWrapper({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="min-w-[900px]">{children}</div>
    </div>
  )
}
