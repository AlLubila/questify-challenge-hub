import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCw, Check, X, Scissors, Type, Smile, Sparkles } from "lucide-react";

interface ImageEditorAdvancedProps {
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

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

const FILTER_PRESETS = {
  none: { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0 },
  vintage: { brightness: 110, contrast: 90, saturation: 80, blur: 0, grayscale: 0, sepia: 40, hueRotate: 0 },
  cool: { brightness: 105, contrast: 110, saturation: 120, blur: 0, grayscale: 0, sepia: 0, hueRotate: 200 },
  warm: { brightness: 110, contrast: 105, saturation: 110, blur: 0, grayscale: 0, sepia: 20, hueRotate: 20 },
  dramatic: { brightness: 90, contrast: 140, saturation: 110, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0 },
  bw: { brightness: 100, contrast: 120, saturation: 0, blur: 0, grayscale: 100, sepia: 0, hueRotate: 0 },
};

const STICKERS = ["😀", "😍", "🔥", "⭐", "❤️", "👍", "🎉", "✨", "💯", "🌟", "🎨", "📸"];

export const ImageEditorAdvanced = ({ imageFile, onSave, onCancel }: ImageEditorAdvancedProps) => {
  const [filters, setFilters] = useState<Filters>(FILTER_PRESETS.none);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [textSize, setTextSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const [stickers, setStickers] = useState<Array<{ emoji: string; x: number; y: number; size: number }>>([]);
  const [preview, setPreview] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    updatePreview();
  }, [filters, rotation, textOverlays, stickers, preview]);

  const getFilterString = () => {
    return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) hue-rotate(${filters.hueRotate}deg)`;
  };

  const updatePreview = () => {
    if (!previewCanvasRef.current || !imgRef.current || !preview) return;
    
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.filter = getFilterString();
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2);
    ctx.restore();

    // Draw text overlays
    textOverlays.forEach((overlay) => {
      ctx.font = `bold ${overlay.size}px Arial`;
      ctx.fillStyle = overlay.color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeText(overlay.text, overlay.x, overlay.y);
      ctx.fillText(overlay.text, overlay.x, overlay.y);
    });

    // Draw stickers
    stickers.forEach((sticker) => {
      ctx.font = `${sticker.size}px Arial`;
      ctx.fillText(sticker.emoji, sticker.x, sticker.y);
    });
  };

  const handleSave = async () => {
    if (!canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.filter = getFilterString();
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2);
    ctx.restore();

    // Draw text overlays
    textOverlays.forEach((overlay) => {
      ctx.font = `bold ${overlay.size}px Arial`;
      ctx.fillStyle = overlay.color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeText(overlay.text, overlay.x, overlay.y);
      ctx.fillText(overlay.text, overlay.x, overlay.y);
    });

    // Draw stickers
    stickers.forEach((sticker) => {
      ctx.font = `${sticker.size}px Arial`;
      ctx.fillText(sticker.emoji, sticker.x, sticker.y);
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const editedFile = new File([blob], imageFile.name, { type: "image/png" });
        onSave(editedFile);
      }
    }, "image/png");
  };

  const applyPreset = (preset: keyof typeof FILTER_PRESETS) => {
    setFilters(FILTER_PRESETS[preset]);
  };

  const addText = () => {
    if (!currentText.trim()) return;
    setTextOverlays([...textOverlays, {
      text: currentText,
      x: 50,
      y: 100 + textOverlays.length * 60,
      size: textSize,
      color: textColor,
    }]);
    setCurrentText("");
  };

  const addSticker = (emoji: string) => {
    setStickers([...stickers, {
      emoji,
      x: 100 + stickers.length * 50,
      y: 100 + stickers.length * 50,
      size: 48,
    }]);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Edit Image</h3>
        <div className="flex gap-2">
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

      <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
        {preview && (
          <>
            <img ref={imgRef} src={preview} alt="Original" className="hidden" />
            <canvas
              ref={previewCanvasRef}
              className="w-full h-full object-contain"
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      <Tabs defaultValue="filters" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="filters">
            <Sparkles className="w-4 h-4 mr-2" />
            Filters
          </TabsTrigger>
          <TabsTrigger value="adjust">
            <Scissors className="w-4 h-4 mr-2" />
            Adjust
          </TabsTrigger>
          <TabsTrigger value="text">
            <Type className="w-4 h-4 mr-2" />
            Text
          </TabsTrigger>
          <TabsTrigger value="stickers">
            <Smile className="w-4 h-4 mr-2" />
            Stickers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(FILTER_PRESETS).map((preset) => (
              <Button
                key={preset}
                variant="outline"
                onClick={() => applyPreset(preset as keyof typeof FILTER_PRESETS)}
                className="capitalize"
              >
                {preset}
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="adjust" className="space-y-4">
          <div>
            <Label>Rotate: {rotation}°</Label>
            <Slider
              value={[rotation]}
              onValueChange={([value]) => setRotation(value)}
              min={0}
              max={360}
              step={15}
            />
          </div>

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
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <div className="space-y-2">
            <Label>Text</Label>
            <Input
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              placeholder="Enter text..."
              onKeyPress={(e) => e.key === "Enter" && addText()}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Size: {textSize}px</Label>
              <Slider
                value={[textSize]}
                onValueChange={([value]) => setTextSize(value)}
                min={16}
                max={72}
                step={4}
              />
            </div>
            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={addText} className="w-full">
            Add Text
          </Button>

          {textOverlays.length > 0 && (
            <div className="space-y-2">
              <Label>Added Text:</Label>
              {textOverlays.map((overlay, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{overlay.text}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTextOverlays(textOverlays.filter((_, i) => i !== idx))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stickers" className="space-y-4">
          <div className="grid grid-cols-6 gap-2">
            {STICKERS.map((emoji) => (
              <Button
                key={emoji}
                variant="outline"
                onClick={() => addSticker(emoji)}
                className="text-2xl h-12"
              >
                {emoji}
              </Button>
            ))}
          </div>

          {stickers.length > 0 && (
            <div className="space-y-2">
              <Label>Added Stickers:</Label>
              <div className="flex flex-wrap gap-2">
                {stickers.map((sticker, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => setStickers(stickers.filter((_, i) => i !== idx))}
                  >
                    {sticker.emoji} <X className="w-3 h-3 ml-1" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
