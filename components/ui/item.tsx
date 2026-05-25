import * as React from "react"

import { cn } from "@/lib/utils"

function Item({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item"
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground",
        className
      )}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  )
}

function ItemDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function ItemMeta({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-meta"
      className={cn("shrink-0 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Item, ItemContent, ItemTitle, ItemDescription, ItemMeta }
