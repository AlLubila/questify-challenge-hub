import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RotateCw, Check, X } from "lucide-react";

interface ImageEditorProps {
  imageFile: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
}

export const ImageEditor = ({ imageFile, onSave, onCancel }: ImageEditorProps) => {
  const [filters, setFilters] = useState<Filters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    hueRotate: 0,
  });
  const [preview, setPreview] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  const getFilterString = () => {
    return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) hue-rotate(${filters.hueRotate}deg)`;
  };

  const handleSave = async () => {
    if (!canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Apply filters to canvas
    ctx.filter = getFilterString();
    ctx.drawImage(img, 0, 0);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const editedFile = new File([blob], imageFile.name, {
          type: "image/png",
        });
        onSave(editedFile);
      }
    }, "image/png");
  };

  const resetFilters = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      grayscale: 0,
      sepia: 0,
      hueRotate: 0,
    });
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Edit Image</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RotateCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-gradient-primary">
            <Check className="w-4 h-4 mr-2" />
            Apply
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
        {preview && (
          <>
            <img
              ref={imgRef}
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
              style={{ filter: getFilterString() }}
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      {/* Filter Controls */}
      <div className="space-y-4">
        <div>
          <Label>Brightness: {filters.brightness}%</Label>
          <Slider
            value={[filters.brightness]}
            onValueChange={([value]) => setFilters({ ...filters, brightness: value })}
            min={0}
            max={200}
            step={1}
          />
        </div>

        <div>
          <Label>Contrast: {filters.contrast}%</Label>
          <Slider
            value={[filters.contrast]}
            onValueChange={([value]) => setFilters({ ...filters, contrast: value })}
            min={0}
            max={200}
            step={1}
          />
        </div>

        <div>
          <Label>Saturation: {filters.saturation}%</Label>
          <Slider
            value={[filters.saturation]}
            onValueChange={([value]) => setFilters({ ...filters, saturation: value })}
            min={0}
            max={200}
            step={1}
          />
        </div>

        <div>
          <Label>Blur: {filters.blur}px</Label>
          <Slider
            value={[filters.blur]}
            onValueChange={([value]) => setFilters({ ...filters, blur: value })}
            min={0}
            max={10}
            step={0.5}
          />
        </div>

        <div>
          <Label>Grayscale: {filters.grayscale}%</Label>
          <Slider
            value={[filters.grayscale]}
            onValueChange={([value]) => setFilters({ ...filters, grayscale: value })}
            min={0}
            max={100}
            step={1}
          />
        </div>

        <div>
          <Label>Sepia: {filters.sepia}%</Label>
          <Slider
            value={[filters.sepia]}
            onValueChange={([value]) => setFilters({ ...filters, sepia: value })}
            min={0}
            max={100}
            step={1}
          />
        </div>

        <div>
          <Label>Hue Rotate: {filters.hueRotate}°</Label>
          <Slider
            value={[filters.hueRotate]}
            onValueChange={([value]) => setFilters({ ...filters, hueRotate: value })}
            min={0}
            max={360}
            step={1}
          />
        </div>
      </div>
    </Card>
  );
};
