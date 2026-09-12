import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline'
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-blue-100 text-blue-700": variant === "default",
          "border-transparent bg-emerald-100 text-emerald-700": variant === "success",
          "border-transparent bg-yellow-100 text-yellow-700": variant === "warning",
          "border-transparent bg-red-100 text-red-700": variant === "destructive",
          "border-gray-300 text-gray-600": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
