import { Label } from "@/components/ui/label";
import { Car, Warehouse } from "lucide-react";
import type { ListingFormData } from "./ListingFormTypes";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
}

export default function StepTypeCategory({ form, update }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">What are you listing?</Label>
        <div className="grid grid-cols-2 gap-4 mt-3">
          {(["parking", "storage"] as const).map((cat) => (
            <div
              key={cat}
              onClick={() => update("category", cat)}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all text-center ${form.category === cat ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              {cat === "parking" ? <Car className="w-8 h-8 mx-auto mb-2 text-primary" /> : <Warehouse className="w-8 h-8 mx-auto mb-2 text-primary" />}
              <p className="font-medium capitalize text-foreground">{cat}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
