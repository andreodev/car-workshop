import * as React from "react"

import { cn } from "@/lib/utils"

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function EmptyDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-description"
      className={cn("max-w-sm text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function EmptyAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-action"
      className={cn("mt-2 flex items-center gap-2", className)}
      {...props}
    />
  )
}

export { Empty, EmptyTitle, EmptyDescription, EmptyAction }
