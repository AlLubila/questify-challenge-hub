import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RotateCw, Check, X, Scissors, Type, Smile, Sparkles, Undo2, Redo2, Save, Palette, Eye, EyeOff, MoveUp, MoveDown, Trash2, Move } from "lucide-react";
import { toast } from "sonner";

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
  exposure: number;
  highlights: number;
  shadows: number;
  temperature: number;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  visible: boolean;
}

interface Sticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  visible: boolean;
}

interface DrawPath {
  id: string;
  points: DrawPoint[];
  visible: boolean;
}

interface DrawPoint {
  x: number;
  y: number;
  color: string;
  size: number;
}

const FILTER_PRESETS: Record<string, Filters> = {
  none: { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, vignette: 0, sharpen: 0, exposure: 0, highlights: 0, shadows: 0, temperature: 0 },
  vintage: { brightness: 110, contrast: 90, saturation: 80, blur: 0, grayscale: 0, sepia: 40, hueRotate: 0, vignette: 20, sharpen: 0, exposure: 5, highlights: -10, shadows: 5, temperature: 10 },
  cool: { brightness: 105, contrast: 110, saturation: 120, blur: 0, grayscale: 0, sepia: 0, hueRotate: 200, vignette: 0, sharpen: 5, exposure: 0, highlights: 5, shadows: -5, temperature: -15 },
  warm: { brightness: 110, contrast: 105, saturation: 110, blur: 0, grayscale: 0, sepia: 20, hueRotate: 20, vignette: 10, sharpen: 0, exposure: 5, highlights: 0, shadows: 0, temperature: 20 },
  dramatic: { brightness: 90, contrast: 140, saturation: 110, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, vignette: 30, sharpen: 10, exposure: -10, highlights: 10, shadows: -10, temperature: 0 },
  bw: { brightness: 100, contrast: 120, saturation: 0, blur: 0, grayscale: 100, sepia: 0, hueRotate: 0, vignette: 15, sharpen: 5, exposure: 0, highlights: 5, shadows: 5, temperature: 0 },
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

interface EditorState {
  filters: Filters;
  rotation: number;
  textOverlays: TextOverlay[];
  stickers: Sticker[];
  drawingPaths: DrawPath[];
}

export const ImageEditorAdvanced = ({ imageFile, onSave, onCancel }: ImageEditorAdvancedProps) => {
  const [filters, setFilters] = useState<Filters>(FILTER_PRESETS.none);
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [aspectRatio, setAspectRatio] = useState("free");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [textSize, setTextSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [drawingPaths, setDrawingPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState("#ff0000");
  const [preview, setPreview] = useState<string>("");
  
  // Drag state for text and stickers
  const [draggingItem, setDraggingItem] = useState<{ type: 'text' | 'sticker', id: string } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Undo/Redo
  const [history, setHistory] = useState<EditorState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Custom Presets
  const [customPresets, setCustomPresets] = useState<Record<string, Filters>>({});
  const [presetName, setPresetName] = useState("");
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

  // Save to history when state changes
  const saveToHistory = () => {
    const currentState: EditorState = {
      filters: { ...filters },
      rotation,
      textOverlays: [...textOverlays],
      stickers: [...stickers],
      drawingPaths: [...drawingPaths],
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setFilters(state.filters);
      setRotation(state.rotation);
      setTextOverlays(state.textOverlays);
      setStickers(state.stickers);
      setDrawingPaths(state.drawingPaths);
      setHistoryIndex(newIndex);
      toast.success("Undo");
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setFilters(state.filters);
      setRotation(state.rotation);
      setTextOverlays(state.textOverlays);
      setStickers(state.stickers);
      setDrawingPaths(state.drawingPaths);
      setHistoryIndex(newIndex);
      toast.success("Redo");
    }
  };

  const getFilterString = () => {
    const adjustedBrightness = filters.brightness + filters.exposure;
    return `brightness(${adjustedBrightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) hue-rotate(${filters.hueRotate + filters.temperature}deg)`;
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

    // Apply highlights and shadows
    if (filters.highlights !== 0 || filters.shadows !== 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const luminance = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        
        if (luminance > 127 && filters.highlights !== 0) {
          const adjustment = filters.highlights / 100;
          pixels[i] = Math.min(255, pixels[i] + adjustment * (255 - pixels[i]));
          pixels[i + 1] = Math.min(255, pixels[i + 1] + adjustment * (255 - pixels[i + 1]));
          pixels[i + 2] = Math.min(255, pixels[i + 2] + adjustment * (255 - pixels[i + 2]));
        } else if (luminance < 127 && filters.shadows !== 0) {
          const adjustment = filters.shadows / 100;
          pixels[i] = Math.max(0, pixels[i] + adjustment * pixels[i]);
          pixels[i + 1] = Math.max(0, pixels[i + 1] + adjustment * pixels[i + 1]);
          pixels[i + 2] = Math.max(0, pixels[i + 2] + adjustment * pixels[i + 2]);
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Draw text overlays
    textOverlays.forEach((overlay) => {
      if (!overlay.visible) return;
      ctx.font = `bold ${overlay.size}px Arial`;
      ctx.fillStyle = overlay.color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeText(overlay.text, overlay.x, overlay.y);
      ctx.fillText(overlay.text, overlay.x, overlay.y);
    });

    // Draw stickers
    stickers.forEach((sticker) => {
      if (!sticker.visible) return;
      ctx.font = `${sticker.size}px Arial`;
      ctx.fillText(sticker.emoji, sticker.x, sticker.y);
    });

    // Draw drawing paths
    drawingPaths.forEach((drawPath) => {
      if (!drawPath.visible || drawPath.points.length < 2) return;
      const path = drawPath.points;
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

    // Apply highlights and shadows
    if (filters.highlights !== 0 || filters.shadows !== 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const luminance = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        
        if (luminance > 127 && filters.highlights !== 0) {
          const adjustment = filters.highlights / 100;
          pixels[i] = Math.min(255, pixels[i] + adjustment * (255 - pixels[i]));
          pixels[i + 1] = Math.min(255, pixels[i + 1] + adjustment * (255 - pixels[i + 1]));
          pixels[i + 2] = Math.min(255, pixels[i + 2] + adjustment * (255 - pixels[i + 2]));
        } else if (luminance < 127 && filters.shadows !== 0) {
          const adjustment = filters.shadows / 100;
          pixels[i] = Math.max(0, pixels[i] + adjustment * pixels[i]);
          pixels[i + 1] = Math.max(0, pixels[i + 1] + adjustment * pixels[i + 1]);
          pixels[i + 2] = Math.max(0, pixels[i + 2] + adjustment * pixels[i + 2]);
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Draw text overlays
    textOverlays.forEach((overlay) => {
      if (!overlay.visible) return;
      ctx.font = `bold ${overlay.size}px Arial`;
      ctx.fillStyle = overlay.color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeText(overlay.text, overlay.x, overlay.y);
      ctx.fillText(overlay.text, overlay.x, overlay.y);
    });

    // Draw stickers
    stickers.forEach((sticker) => {
      if (!sticker.visible) return;
      ctx.font = `${sticker.size}px Arial`;
      ctx.fillText(sticker.emoji, sticker.x, sticker.y);
    });

    // Draw paths
    drawingPaths.forEach((drawPath) => {
      if (!drawPath.visible || drawPath.points.length < 2) return;
      const path = drawPath.points;
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

  const applyPreset = (preset: string) => {
    const presetFilters = FILTER_PRESETS[preset] || customPresets[preset];
    if (presetFilters) {
      setFilters(presetFilters);
      saveToHistory();
      toast.success(`Applied ${preset} preset`);
    }
  };

  const saveCustomPreset = () => {
    if (!presetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }
    setCustomPresets({ ...customPresets, [presetName]: { ...filters } });
    toast.success(`Saved preset: ${presetName}`);
    setPresetName("");
  };

  const deleteCustomPreset = (name: string) => {
    const newPresets = { ...customPresets };
    delete newPresets[name];
    setCustomPresets(newPresets);
    toast.success(`Deleted preset: ${name}`);
  };

  const addText = () => {
    if (!currentText.trim()) return;
    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: currentText,
      x: 50,
      y: 100 + textOverlays.length * 60,
      size: textSize,
      color: textColor,
      visible: true,
    };
    setTextOverlays([...textOverlays, newOverlay]);
    setCurrentText("");
    saveToHistory();
  };

  const addSticker = (emoji: string) => {
    const newSticker: Sticker = {
      id: Date.now().toString(),
      emoji,
      x: 100 + stickers.length * 50,
      y: 100 + stickers.length * 50,
      size: 48,
      visible: true,
    };
    setStickers([...stickers, newSticker]);
    saveToHistory();
  };

  // Get position relative to the image container
  const getRelativePosition = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current || !imgRef.current) return { x: 0, y: 0 };
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Get client position (works for both mouse and touch)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Calculate scale between displayed size and natural size
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleDragStart = (type: 'text' | 'sticker', id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getRelativePosition(e);
    const item = type === 'text' 
      ? textOverlays.find(t => t.id === id) 
      : stickers.find(s => s.id === id);
    
    if (item) {
      setDraggingItem({ type, id });
      setDragOffset({ x: pos.x - item.x, y: pos.y - item.y });
    }
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingItem) return;
    e.preventDefault();
    
    const pos = getRelativePosition(e);
    const newX = pos.x - dragOffset.x;
    const newY = pos.y - dragOffset.y;
    
    if (draggingItem.type === 'text') {
      setTextOverlays(textOverlays.map(item =>
        item.id === draggingItem.id ? { ...item, x: newX, y: newY } : item
      ));
    } else if (draggingItem.type === 'sticker') {
      setStickers(stickers.map(item =>
        item.id === draggingItem.id ? { ...item, x: newX, y: newY } : item
      ));
    }
  };

  const handleDragEnd = () => {
    if (draggingItem) {
      saveToHistory();
      setDraggingItem(null);
    }
  };

  const toggleLayerVisibility = (type: 'text' | 'sticker' | 'draw', id: string) => {
    if (type === 'text') {
      setTextOverlays(textOverlays.map(item => 
        item.id === id ? { ...item, visible: !item.visible } : item
      ));
    } else if (type === 'sticker') {
      setStickers(stickers.map(item => 
        item.id === id ? { ...item, visible: !item.visible } : item
      ));
    } else if (type === 'draw') {
      setDrawingPaths(drawingPaths.map(item => 
        item.id === id ? { ...item, visible: !item.visible } : item
      ));
    }
    saveToHistory();
  };

  const deleteLayer = (type: 'text' | 'sticker' | 'draw', id: string) => {
    if (type === 'text') {
      setTextOverlays(textOverlays.filter(item => item.id !== id));
    } else if (type === 'sticker') {
      setStickers(stickers.filter(item => item.id !== id));
    } else if (type === 'draw') {
      setDrawingPaths(drawingPaths.filter(item => item.id !== id));
    }
    saveToHistory();
    toast.success("Layer deleted");
  };

  const moveLayer = (type: 'text' | 'sticker' | 'draw', id: string, direction: 'up' | 'down') => {
    const moveInArray = <T extends { id: string }>(arr: T[]): T[] => {
      const index = arr.findIndex(item => item.id === id);
      if (index === -1) return arr;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= arr.length) return arr;
      
      const newArr = [...arr];
      [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
      return newArr;
    };

    if (type === 'text') {
      setTextOverlays(moveInArray(textOverlays));
    } else if (type === 'sticker') {
      setStickers(moveInArray(stickers));
    } else if (type === 'draw') {
      setDrawingPaths(moveInArray(drawingPaths));
    }
    saveToHistory();
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
      const newPath: DrawPath = {
        id: Date.now().toString(),
        points: currentPath,
        visible: true,
      };
      setDrawingPaths([...drawingPaths, newPath]);
      setCurrentPath([]);
      saveToHistory();
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo2 className="w-4 h-4" />
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

      <div 
        ref={containerRef}
        className="aspect-video bg-muted rounded-lg overflow-hidden relative"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {preview && (
          <>
            <img ref={imgRef} src={preview} alt="Original" className="hidden" />
            <canvas
              ref={previewCanvasRef}
              className="w-full h-full object-contain absolute top-0 left-0 pointer-events-none"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Draggable text overlays */}
            {textOverlays.filter(t => t.visible).map((overlay) => {
              const container = containerRef.current;
              const img = imgRef.current;
              if (!container || !img) return null;
              
              const scaleX = container.offsetWidth / (img.naturalWidth || 1);
              const scaleY = container.offsetHeight / (img.naturalHeight || 1);
              
              return (
                <div
                  key={overlay.id}
                  className="absolute cursor-move select-none"
                  style={{
                    left: overlay.x * scaleX,
                    top: overlay.y * scaleY,
                    fontSize: overlay.size * Math.min(scaleX, scaleY),
                    color: overlay.color,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    fontWeight: 'bold',
                  }}
                  onMouseDown={(e) => handleDragStart('text', overlay.id, e)}
                  onTouchStart={(e) => handleDragStart('text', overlay.id, e)}
                >
                  {overlay.text}
                  <Move className="w-3 h-3 absolute -top-3 -right-3 text-white bg-primary rounded p-0.5" />
                </div>
              );
            })}
            
            {/* Draggable stickers */}
            {stickers.filter(s => s.visible).map((sticker) => {
              const container = containerRef.current;
              const img = imgRef.current;
              if (!container || !img) return null;
              
              const scaleX = container.offsetWidth / (img.naturalWidth || 1);
              const scaleY = container.offsetHeight / (img.naturalHeight || 1);
              
              return (
                <div
                  key={sticker.id}
                  className="absolute cursor-move select-none"
                  style={{
                    left: sticker.x * scaleX,
                    top: sticker.y * scaleY,
                    fontSize: sticker.size * Math.min(scaleX, scaleY),
                  }}
                  onMouseDown={(e) => handleDragStart('sticker', sticker.id, e)}
                  onTouchStart={(e) => handleDragStart('sticker', sticker.id, e)}
                >
                  {sticker.emoji}
                </div>
              );
            })}
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
          <TabsTrigger value="grading">
            <Palette className="w-4 h-4 mr-1" />
            Grade
          </TabsTrigger>
          <TabsTrigger value="text">
            <Type className="w-4 h-4 mr-1" />
            Text
          </TabsTrigger>
          <TabsTrigger value="stickers">
            <Smile className="w-4 h-4 mr-1" />
            Stickers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-4">
          <div>
            <Label>Built-in Presets</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {Object.keys(FILTER_PRESETS).map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  onClick={() => applyPreset(preset)}
                  className="capitalize"
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          {Object.keys(customPresets).length > 0 && (
            <div>
              <Label>Custom Presets</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.keys(customPresets).map((preset) => (
                  <div key={preset} className="flex gap-1">
                    <Button
                      variant="outline"
                      onClick={() => applyPreset(preset)}
                      className="flex-1 capitalize"
                    >
                      {preset}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCustomPreset(preset)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Save Current as Preset</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name..."
              />
              <Button onClick={saveCustomPreset}>
                <Save className="w-4 h-4" />
              </Button>
            </div>
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

        <TabsContent value="grading" className="space-y-4">
          <div>
            <Label>Exposure: {filters.exposure}</Label>
            <Slider
              value={[filters.exposure]}
              onValueChange={([value]) => { setFilters({ ...filters, exposure: value }); saveToHistory(); }}
              min={-50}
              max={50}
              step={1}
            />
          </div>

          <div>
            <Label>Highlights: {filters.highlights}</Label>
            <Slider
              value={[filters.highlights]}
              onValueChange={([value]) => { setFilters({ ...filters, highlights: value }); saveToHistory(); }}
              min={-50}
              max={50}
              step={1}
            />
          </div>

          <div>
            <Label>Shadows: {filters.shadows}</Label>
            <Slider
              value={[filters.shadows]}
              onValueChange={([value]) => { setFilters({ ...filters, shadows: value }); saveToHistory(); }}
              min={-50}
              max={50}
              step={1}
            />
          </div>

          <div>
            <Label>Temperature: {filters.temperature}°</Label>
            <Slider
              value={[filters.temperature]}
              onValueChange={([value]) => { setFilters({ ...filters, temperature: value }); saveToHistory(); }}
              min={-30}
              max={30}
              step={1}
            />
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
              onValueChange={([value]) => { setFilters({ ...filters, brightness: value }); saveToHistory(); }}
              min={0}
              max={200}
              step={1}
            />
          </div>

          <div>
            <Label>Contrast: {filters.contrast}%</Label>
            <Slider
              value={[filters.contrast]}
              onValueChange={([value]) => { setFilters({ ...filters, contrast: value }); saveToHistory(); }}
              min={0}
              max={200}
              step={1}
            />
          </div>

          <div>
            <Label>Saturation: {filters.saturation}%</Label>
            <Slider
              value={[filters.saturation]}
              onValueChange={([value]) => { setFilters({ ...filters, saturation: value }); saveToHistory(); }}
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
              <Label>Added Text (drag to reposition):</Label>
              {textOverlays.map((overlay, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{overlay.text}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTextOverlays(textOverlays.filter((_, i) => i !== idx))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Drag text directly on the image to reposition
              </p>
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

        <TabsContent value="layers" className="space-y-4">
          <div className="space-y-2">
            {textOverlays.length === 0 && stickers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No layers yet. Add text or stickers to see them here.
              </p>
            ) : (
              <>
                {textOverlays.map((overlay, idx) => (
                  <Card key={overlay.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Type className="w-4 h-4" />
                        <span className="text-sm truncate">{overlay.text}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLayerVisibility('text', overlay.id)}
                        >
                          {overlay.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLayer('text', overlay.id, 'up')}
                          disabled={idx === 0}
                        >
                          <MoveUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLayer('text', overlay.id, 'down')}
                          disabled={idx === textOverlays.length - 1}
                        >
                          <MoveDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLayer('text', overlay.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {stickers.map((sticker, idx) => (
                  <Card key={sticker.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Smile className="w-4 h-4" />
                        <span className="text-sm">Sticker: {sticker.emoji}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLayerVisibility('sticker', sticker.id)}
                        >
                          {sticker.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLayer('sticker', sticker.id, 'up')}
                          disabled={idx === 0}
                        >
                          <MoveUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLayer('sticker', sticker.id, 'down')}
                          disabled={idx === stickers.length - 1}
                        >
                          <MoveDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLayer('sticker', sticker.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
