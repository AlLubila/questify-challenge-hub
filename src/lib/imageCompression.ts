/**
 * Image compression utility for reducing file sizes before upload
 * Particularly important for mobile users with limited data
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, where 1 is highest quality
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 2560,
  maxHeight: 2560,
  quality: 0.9,
  outputFormat: 'image/jpeg',
};

/**
 * Load an image file into an HTMLImageElement
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  let width = originalWidth;
  let height = originalHeight;

  // Only resize if the image exceeds max dimensions
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;

    if (width > height) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
    } else {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }
  }

  return { width, height };
};

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed image as a File object
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  // Skip compression for non-image files
  if (!file.type.startsWith('image/')) {
    console.log('Skipping compression for non-image file');
    return file;
  }

  // Skip compression for small files (less than 500KB)
  const MIN_SIZE_FOR_COMPRESSION = 500 * 1024; // 500KB
  if (file.size < MIN_SIZE_FOR_COMPRESSION) {
    console.log('File is small enough, skipping compression');
    return file;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    // Load the image
    const img = await loadImage(file);
    console.log(`Original dimensions: ${img.width}x${img.height}`);

    // Calculate new dimensions
    const { width, height } = calculateDimensions(
      img.width,
      img.height,
      opts.maxWidth,
      opts.maxHeight
    );
    console.log(`Target dimensions: ${width}x${height}`);

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image to canvas
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob with compression
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        opts.outputFormat,
        opts.quality
      );
    });

    console.log(`Compressed file size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Compression ratio: ${((1 - blob.size / file.size) * 100).toFixed(1)}% reduction`);

    // Create new file from blob
    const compressedFile = new File(
      [blob],
      file.name.replace(/\.[^.]+$/, `.${opts.outputFormat.split('/')[1]}`),
      {
        type: opts.outputFormat,
        lastModified: Date.now(),
      }
    );

    // Only return compressed file if it's actually smaller
    if (compressedFile.size < file.size) {
      return compressedFile;
    } else {
      console.log('Compressed file is larger, returning original');
      return file;
    }
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
};

/**
 * Get estimated compression savings for display to user
 */
export const getCompressionEstimate = (fileSize: number): string => {
  const sizeMB = fileSize / 1024 / 1024;
  
  if (sizeMB < 0.2) {
    return 'No compression needed';
  }
  
  // Rough estimates based on typical compression ratios
  const estimatedReduction = Math.min(70, sizeMB * 30);
  return `~${estimatedReduction.toFixed(0)}% smaller`;
};
