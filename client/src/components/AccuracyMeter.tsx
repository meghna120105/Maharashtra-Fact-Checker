import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface AccuracyMeterProps {
  accuracy: number;
  animate?: boolean;
}

export default function AccuracyMeter({ accuracy, animate = true }: AccuracyMeterProps) {
  const [displayAccuracy, setDisplayAccuracy] = useState(animate ? 0 : accuracy);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setDisplayAccuracy(accuracy);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [accuracy, animate]);

  const getAccuracyZone = (acc: number) => {
    if (acc >= 71) return { label: "High", color: "text-primary" };
    if (acc >= 41) return { label: "Medium", color: "text-accent-foreground" };
    return { label: "Low", color: "text-destructive" };
  };

  const zone = getAccuracyZone(accuracy);

  return (
    <div className="space-y-3" data-testid="component-accuracy-meter">
      <div className="flex items-end gap-3">
        <div className="text-5xl font-bold" data-testid="text-accuracy-score">
          {Math.round(displayAccuracy)}%
        </div>
        <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Factual Accuracy Score
        </div>
      </div>
      
      <div className="space-y-2">
        <Progress 
          value={displayAccuracy} 
          className="h-3"
          data-testid="progress-accuracy"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className={`font-semibold ${zone.color}`}>{zone.label}</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
