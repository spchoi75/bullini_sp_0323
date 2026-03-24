"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  icon?: LucideIcon
  defaultExpanded?: boolean
  children: React.ReactNode
  className?: string
}

function CollapsibleSection({
  title,
  icon: Icon,
  defaultExpanded = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <span className="text-base font-semibold">{title}</span>
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-4">{children}</div>
      )}
    </div>
  )
}

export { CollapsibleSection }
export type { CollapsibleSectionProps }
