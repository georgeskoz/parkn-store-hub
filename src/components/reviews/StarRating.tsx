import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  className?: string;
  readOnly?: boolean;
}

export const StarRating = ({ value, onChange, size = 18, className, readOnly }: StarRatingProps) => {
  const interactive = !!onChange && !readOnly;
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(n)}
          className={cn(interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default")}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
