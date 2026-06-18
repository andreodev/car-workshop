import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const typographyVariants = cva("text-foreground", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-3xl font-semibold tracking-tight",
      h2: "scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight",
      h3: "scroll-m-20 text-xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-lg font-semibold tracking-tight",
      p: "text-sm leading-relaxed",
      lead: "text-base text-muted-foreground",
      large: "text-base font-medium",
      small: "text-xs font-medium",
      muted: "text-xs text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "p",
  },
})

function Typography({
  className,
  variant = "p",
  asChild = false,
  ...props
}: React.ComponentProps<"p"> &
  VariantProps<typeof typographyVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "p"

  return (
    <Comp
      data-slot="typography"
      data-variant={variant}
      className={cn(typographyVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Typography, typographyVariants }
