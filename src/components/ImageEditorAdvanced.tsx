import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCw, Check, X, Scissors, Type, Smile, Sparkles, Brush } from "lucide-react";

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
  vignette: number;
  sharpen: number;
}

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

interface DrawPoint {
  x: number;
  y: number;
  color: string;
  size: number;
}

const FILTER_PRESETS = {
  none: { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, vignette: 0, sharpen: 0 },
  vintage: { brightness: 110, contrast: 90, saturation: 80, blur: 0, grayscale: 0, sepia: 40, hueRotate: 0, vignette: 20, sharpen: 0 },
  cool: { brightness: 105, contrast: 110, saturation: 120, blur: 0, grayscale: 0, sepia: 0, hueRotate: 200, vignette: 0, sharpen: 5 },
  warm: { brightness: 110, contrast: 105, saturation: 110, blur: 0, grayscale: 0, sepia: 20, hueRotate: 20, vignette: 10, sharpen: 0 },
  dramatic: { brightness: 90, contrast: 140, saturation: 110, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, vignette: 30, sharpen: 10 },
  bw: { brightness: 100, contrast: 120, saturation: 0, blur: 0, grayscale: 100, sepia: 0, hueRotate: 0, vignette: 15, sharpen: 5 },
};

const STICKER_CATEGORIES = {
  emotions: ["😀", "😍", "😂", "🥰", "😎", "🤩", "😇", "🥳", "😊", "😘"],
  reactions: ["🔥", "💯", "✨", "⭐", "❤️", "👍", "🙌", "👏", "💪", "🎉"],
  nature: ["🌟", "🌈", "☀️", "🌙", "⚡", "💫", "🌸", "🌺", "🌻", "🌹"],
  symbols: ["💖", "💝", "💕", "✅", "🎯", "🏆", "👑", "💎", "🎨", "📸"],
  seasonal: ["🎄", "🎃", "🎆", "🎇", "🎁", "🎈", "🎊", "🎀", "🧨", "✨"],
  food: ["🍕", "🍔", "🍟", "🌮", "🍦", "🍰", "🍩", "🍪", "☕", "🥤"],
};

const ASPECT_RATIOS = [
  { label: "Free", value: "free" },
  { label: "1:1 (Square)", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "16:9", value: "16:9" },
  { label: "9:16 (Story)", value: "9:16" },
];

export const ImageEditorAdvanced = ({ imageFile, onSave, onCancel }: ImageEditorAdvancedProps) => {
  const [filters, setFilters] = useState<Filters>(FILTER_PRESETS.none);
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [aspectRatio, setAspectRatio] = useState("free");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [textSize, setTextSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const [stickers, setStickers] = useState<Array<{ emoji: string; x: number; y: number; size: number }>>([]);
  const [drawingPaths, setDrawingPaths] = useState<DrawPoint[][]>([]);
  const [currentPath, setCurrentPath] = useState<DrawPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState("#ff0000");
  const [preview, setPreview] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
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
  }, [filters, rotation, textOverlays, stickers, drawingPaths, preview, cropArea]);

  const getFilterString = () => {
    return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) hue-rotate(${filters.hueRotate}deg)`;
  };

  const applySharpen = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, amount: number) => {
    if (amount === 0) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    const factor = amount / 10;
    
    const sharpenKernel = [
      0, -factor, 0,
      -factor, 1 + 4 * factor, -factor,
      0, -factor, 0
    ];

    const tempData = new Uint8ClampedArray(pixels);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          const idx = (y * width + x) * 4 + c;
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixelIdx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += tempData[pixelIdx] * sharpenKernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          pixels[idx] = Math.max(0, Math.min(255, sum));
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const applyVignette = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, amount: number) => {
    if (amount === 0) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${amount / 100})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const updatePreview = () => {
    if (!previewCanvasRef.current || !imgRef.current || !preview) return;
    
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Apply rotation and filters
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.filter = getFilterString();
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2);
    ctx.restore();

    // Apply sharpen
    if (filters.sharpen > 0) {
      applySharpen(ctx, canvas, filters.sharpen);
    }

    // Apply vignette
    if (filters.vignette > 0) {
      applyVignette(ctx, canvas, filters.vignette);
    }

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

    // Draw drawing paths
    drawingPaths.forEach((path) => {
      if (path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
        ctx.strokeStyle = path[i].color;
        ctx.lineWidth = path[i].size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(path[i].x, path[i].y);
      }
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

    // Apply all transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.filter = getFilterString();
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2);
    ctx.restore();

    if (filters.sharpen > 0) {
      applySharpen(ctx, canvas, filters.sharpen);
    }

    if (filters.vignette > 0) {
      applyVignette(ctx, canvas, filters.vignette);
    }

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

    // Draw paths
    drawingPaths.forEach((path) => {
      if (path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
        ctx.strokeStyle = path[i].color;
        ctx.lineWidth = path[i].size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(path[i].x, path[i].y);
      }
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

  const handleDrawStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDrawing(true);
    setCurrentPath([{ x, y, color: brushColor, size: brushSize }]);
  };

  const handleDrawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCurrentPath([...currentPath, { x, y, color: brushColor, size: brushSize }]);
  };

  const handleDrawEnd = () => {
    if (currentPath.length > 0) {
      setDrawingPaths([...drawingPaths, currentPath]);
      setCurrentPath([]);
    }
    setIsDrawing(false);
  };

  const handleCrop = () => {
    // Crop functionality would apply the crop area to final render
    // For now, this updates the display
    updatePreview();
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
              className="w-full h-full object-contain absolute top-0 left-0"
            />
            <canvas
              ref={drawCanvasRef}
              className="w-full h-full object-contain absolute top-0 left-0 cursor-crosshair"
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              width={imgRef.current?.naturalWidth || 800}
              height={imgRef.current?.naturalHeight || 600}
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      <Tabs defaultValue="filters" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="filters">
            <Sparkles className="w-4 h-4 mr-1" />
            Filters
          </TabsTrigger>
          <TabsTrigger value="adjust">
            <Scissors className="w-4 h-4 mr-1" />
            Adjust
          </TabsTrigger>
          <TabsTrigger value="text">
            <Type className="w-4 h-4 mr-1" />
            Text
          </TabsTrigger>
          <TabsTrigger value="stickers">
            <Smile className="w-4 h-4 mr-1" />
            Stickers
          </TabsTrigger>
          <TabsTrigger value="draw">
            <Brush className="w-4 h-4 mr-1" />
            Draw
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

          <div className="space-y-3">
            <div>
              <Label>Vignette: {filters.vignette}%</Label>
              <Slider
                value={[filters.vignette]}
                onValueChange={([value]) => setFilters({ ...filters, vignette: value })}
                min={0}
                max={100}
                step={5}
              />
            </div>

            <div>
              <Label>Sharpen: {filters.sharpen}</Label>
              <Slider
                value={[filters.sharpen]}
                onValueChange={([value]) => setFilters({ ...filters, sharpen: value })}
                min={0}
                max={20}
                step={1}
              />
            </div>

            <div>
              <Label>Blur Edges: {filters.blur}px</Label>
              <Slider
                value={[filters.blur]}
                onValueChange={([value]) => setFilters({ ...filters, blur: value })}
                min={0}
                max={10}
                step={0.5}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="adjust" className="space-y-4">
          <div>
            <Label>Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ratio) => (
                  <SelectItem key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
          <Tabs defaultValue="emotions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="emotions">😀</TabsTrigger>
              <TabsTrigger value="reactions">🔥</TabsTrigger>
              <TabsTrigger value="nature">🌟</TabsTrigger>
            </TabsList>
            
            {Object.entries(STICKER_CATEGORIES).slice(0, 3).map(([category, emojis]) => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-5 gap-2">
                  {emojis.map((emoji) => (
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
              </TabsContent>
            ))}
          </Tabs>

          <Tabs defaultValue="symbols" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="symbols">💖</TabsTrigger>
              <TabsTrigger value="seasonal">🎄</TabsTrigger>
              <TabsTrigger value="food">🍕</TabsTrigger>
            </TabsList>
            
            {Object.entries(STICKER_CATEGORIES).slice(3, 6).map(([category, emojis]) => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-5 gap-2">
                  {emojis.map((emoji) => (
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
              </TabsContent>
            ))}
          </Tabs>

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

        <TabsContent value="draw" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>Brush Size: {brushSize}px</Label>
              <Slider
                value={[brushSize]}
                onValueChange={([value]) => setBrushSize(value)}
                min={1}
                max={20}
                step={1}
              />
            </div>

            <div>
              <Label>Brush Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-20 h-10"
                />
                <div className="flex gap-1">
                  {["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ffffff", "#000000"].map((color) => (
                    <Button
                      key={color}
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0"
                      style={{ backgroundColor: color }}
                      onClick={() => setBrushColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {drawingPaths.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setDrawingPaths([])}
                className="w-full"
              >
                Clear Drawing
              </Button>
            )}

            <p className="text-sm text-muted-foreground">
              Click and drag on the image above to draw
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
