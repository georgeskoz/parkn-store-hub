import { AlertTriangle } from "lucide-react";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";

export default function MaintenanceBanner() {
  const on = useMaintenanceMode();
  if (!on) return null;
  return (
    <div className="bg-destructive text-destructive-foreground">
      <div className="container mx-auto px-4 py-2 flex items-center gap-2 justify-center text-sm font-medium">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Spotsvault is currently undergoing maintenance. Some features may be unavailable.
      </div>
    </div>
  );
}
