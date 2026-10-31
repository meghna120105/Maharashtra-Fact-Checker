import { CheckCircle, XCircle, AlertTriangle, Info, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import type { VerdictType } from "@shared/schema";

interface VerdictBadgeProps {
  verdict: VerdictType;
  size?: "sm" | "lg";
}

const verdictConfig = {
  TRUE: {
    label: "TRUE",
    icon: CheckCircle,
    className: "border-2 bg-primary text-primary-foreground border-primary-border",
  },
  FALSE: {
    label: "FALSE",
    icon: XCircle,
    className: "border-2 bg-destructive text-destructive-foreground border-destructive-border",
  },
  PARTIALLY_TRUE: {
    label: "PARTIALLY TRUE",
    icon: Info,
    className: "border-2 border-dashed bg-secondary text-secondary-foreground border-secondary-border",
  },
  UNVERIFIED: {
    label: "UNVERIFIED",
    icon: HelpCircle,
    className: "border-2 border-dotted bg-muted text-muted-foreground",
  },
  MISLEADING: {
    label: "MISLEADING",
    icon: AlertTriangle,
    className: "border-[3px] bg-accent text-accent-foreground border-accent-border",
  },
};

export default function VerdictBadge({ verdict, size = "sm" }: VerdictBadgeProps) {
  const config = verdictConfig[verdict];
  const Icon = config.icon;
  
  return (
    <Badge 
      className={`${config.className} ${size === "lg" ? "text-3xl font-bold px-8 py-3 h-auto" : "text-xs font-medium uppercase tracking-wide px-3 py-1"} flex items-center gap-2 whitespace-nowrap`}
      data-testid={`badge-verdict-${verdict.toLowerCase()}`}
    >
      <Icon className={size === "lg" ? "h-8 w-8" : "h-4 w-4"} />
      {config.label}
    </Badge>
  );
}
