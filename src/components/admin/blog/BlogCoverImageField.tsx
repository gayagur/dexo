import { useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useImageUpload } from "@/hooks/useImageUpload";

const BLOG_BUCKET = "blog-images";

interface BlogCoverImageFieldProps {
  url: string;
  alt: string;
  onUrlChange: (url: string) => void;
  onAltChange: (alt: string) => void;
  disabled?: boolean;
}

export function BlogCoverImageField({ url, alt, onUrlChange, onAltChange, disabled }: BlogCoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, uploading, error, clearError } = useImageUpload();

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    clearError();
    const publicUrl = await uploadImage(file, BLOG_BUCKET);
    if (publicUrl) onUrlChange(publicUrl);
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cover image</Label>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPick} />
      {url ? (
        <div className="rounded-xl border border-border/70 overflow-hidden bg-muted/20">
          <img src={url} alt="" className="w-full aspect-video object-cover max-h-52" />
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-dashed border-border/80 py-12 flex flex-col items-center gap-2 text-muted-foreground hover:bg-secondary/40 hover:border-primary/30 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
          <span className="text-sm font-medium">{uploading ? "Uploading…" : "Upload cover"}</span>
        </button>
      )}
      {url ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>
            Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" className="rounded-lg text-destructive" disabled={disabled} onClick={() => onUrlChange("")}>
            Remove
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div>
        <Label htmlFor="cover-alt" className="text-xs text-muted-foreground">
          Alt text (SEO & accessibility)
        </Label>
        <Input
          id="cover-alt"
          value={alt}
          onChange={(e) => onAltChange(e.target.value)}
          disabled={disabled}
          placeholder="Describe the image for screen readers"
          className="mt-1.5 rounded-xl"
        />
      </div>
    </div>
  );
}
