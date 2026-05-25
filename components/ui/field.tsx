import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

function Field({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="field" className={cn("grid gap-2", className)} {...props} />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn("text-xs font-medium text-foreground", className)}
      {...props}
    />
  )
}

function FieldControl({ className, ...props }: React.ComponentProps<typeof Slot>) {
  return (
    <Slot
      data-slot="field-control"
      className={cn("w-full", className)}
      {...props}
    />
  )
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function FieldError({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-error"
      className={cn("text-xs text-destructive", className)}
      {...props}
    />
  )
}

export { Field, FieldLabel, FieldControl, FieldDescription, FieldError }
