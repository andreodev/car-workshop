import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "inline-block animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground",
  {
    variants: {
      size: {
        sm: "size-4",
        md: "size-5",
        lg: "size-6",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

function Spinner({
  className,
  size = "md",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof spinnerVariants>) {
  return (
    <span
      data-slot="spinner"
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  )
}

export { Spinner, spinnerVariants }
