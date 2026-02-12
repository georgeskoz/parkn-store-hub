import { Button } from "@/components/ui/button";
import { StorageListing, DurationOption } from "@/data/storageListings";
import { X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  items: StorageListing[];
  duration: DurationOption;
  onRemove: (id: string) => void;
  onCompare: () => void;
}

export default function ComparisonBar({ items, duration, onRemove, onCompare }: Props) {
  if (items.length === 0) return null;

  const formattedDuration = duration === "daily" ? "/day" : duration === "weekly" ? "/wk" : duration === "monthly" ? "/mo" : "/4mo";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg shadow-lg"
      >
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            Compare ({items.length}/3)
          </span>
          <div className="flex-1 flex gap-3 overflow-x-auto">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 min-w-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">${item.pricing[duration]}{formattedDuration}</p>
                </div>
                <button onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            disabled={items.length < 2}
            onClick={onCompare}
            className="shrink-0 gap-1"
          >
            Compare <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
