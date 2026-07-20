import { useRef } from "react";
import { Upload, Camera, X } from "lucide-react";
import IconButton from "../../components/ui/IconButton";

export default function UploadZone({
  preview,
  onFileSelect,
  onDrop,
  onRemove,
}: {
  preview: string | null;
  onFileSelect: (file: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div>
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-gold/30 aspect-[4/5]">
          <img
            src={preview}
            alt="Face Photo"
            className="w-full h-full object-cover"
          />
          {/* IconButton forces inline background/color — un-set them so the
              original bg-espresso/80, hover:bg-red-900 and text-cream classes
              keep applying; hover:opacity-100 cancels its base hover:opacity-80. */}
          <IconButton
            aria-label="Remove photo"
            onClick={onRemove}
            className="absolute top-3 right-3 w-8 h-8 bg-espresso/80 text-cream hover:bg-red-900 hover:opacity-100"
            style={{ background: undefined, color: undefined }}
          >
            <X className="w-4 h-4" />
          </IconButton>
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-espresso/80 to-transparent">
            <p className="text-cream text-xs font-medium">Face Photo</p>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="rounded-2xl border-2 border-dashed border-gold/20 hover:border-gold/40 bg-espresso-light/50 hover:bg-espresso-light aspect-[4/5] flex flex-col items-center justify-center gap-3 cursor-pointer transition group"
        >
          <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center text-gold group-hover:bg-gold/15 transition">
            <Camera className="w-6 h-6" />
          </div>
          <div className="text-center px-4">
            <p className="text-cream text-sm font-medium mb-1">Upload Your Face</p>
            <p className="text-cream-muted text-xs leading-relaxed">
              Natural daylight — no makeup, no filters
            </p>
          </div>
          <div className="flex items-center gap-1 text-gold/50 text-xs">
            <Upload className="w-3 h-3" />
            Drop or tap to upload
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }}
      />
    </div>
  );
}
