import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ListingFormData, UploadedPhoto } from "./ListingFormTypes";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
}

const MAX_PHOTOS = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function StepPhotos({ form, update }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    const remaining = MAX_PHOTOS - form.photos.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) {
      toast({ title: t("listingWizard.limitReached"), description: t("listingWizard.maxPhotosAllowed", { count: MAX_PHOTOS }), variant: "destructive" });
      return;
    }

    setUploading(true);
    const newPhotos: UploadedPhoto[] = [];

    for (const file of toUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: t("listingWizard.invalidFileType"), description: t("listingWizard.unsupportedImage", { fileName: file.name }), variant: "destructive" });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: t("listingWizard.fileTooLarge"), description: t("listingWizard.exceedsFileSizeLimit", { fileName: file.name }), variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from("listing-photos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        toast({ title: t("listingWizard.uploadFailed"), description: error.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(path);
      newPhotos.push({ url: urlData.publicUrl, path, name: file.name });
    }

    update("photos", [...form.photos, ...newPhotos]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removePhoto = async (photo: UploadedPhoto) => {
    await supabase.storage.from("listing-photos").remove([photo.path]);
    update("photos", form.photos.filter((p) => p.path !== photo.path));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary mb-2">
        <Camera className="w-5 h-5" />
        <span className="font-semibold text-foreground">{t("listingWizard.photosOfYourSpace")}</span>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("listingWizard.photosHint", { count: MAX_PHOTOS })}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || form.photos.length >= MAX_PHOTOS}
        className="w-full border-dashed border-2 py-8"
      >
        <Upload className="w-5 h-5 mr-2" />
        {uploading ? t("listingWizard.uploading") : t("listingWizard.uploadPhotosCount", { count: form.photos.length, max: MAX_PHOTOS })}
      </Button>

      {form.photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {form.photos.map((photo) => (
            <div key={photo.path} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
              <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(photo)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
