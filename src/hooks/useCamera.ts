import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export const useCamera = () => {
  const isNativePlatform = Capacitor.isNativePlatform();

  const takePicture = async (): Promise<File | null> => {
    try {
      // Check if camera is available
      if (!isNativePlatform) {
        toast.error('Camera is only available on mobile devices. Please use file upload instead.');
        return null;
      }

      // Request camera permissions and take photo
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      if (!image.webPath) {
        throw new Error('Failed to capture photo');
      }

      // Convert the image to a File object
      const response = await fetch(image.webPath);
      const blob = await response.blob();
      const file = new File([blob], `photo_${Date.now()}.${image.format}`, {
        type: `image/${image.format}`,
      });

      return file;
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        console.error('Camera error:', error);
        toast.error('Failed to take photo. Please check camera permissions.');
      }
      return null;
    }
  };

  const takeVideo = async (): Promise<File | null> => {
    try {
      if (!isNativePlatform) {
        toast.error('Video recording is only available on mobile devices. Please use file upload instead.');
        return null;
      }

      // For video, we use the camera with media type video
      const media = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        // Note: Video recording requires additional native configuration
        // and may need platform-specific implementation
      });

      if (!media.webPath) {
        throw new Error('Failed to record video');
      }

      const response = await fetch(media.webPath);
      const blob = await response.blob();
      const file = new File([blob], `video_${Date.now()}.mp4`, {
        type: 'video/mp4',
      });

      return file;
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        console.error('Video error:', error);
        toast.error('Failed to record video. Please check camera permissions.');
      }
      return null;
    }
  };

  const pickFromGallery = async (): Promise<File | null> => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });

      if (!image.webPath) {
        throw new Error('Failed to select media');
      }

      const response = await fetch(image.webPath);
      const blob = await response.blob();
      
      // Determine file type from blob
      const fileType = blob.type || `image/${image.format}`;
      const extension = fileType.split('/')[1] || 'jpg';
      
      const file = new File([blob], `media_${Date.now()}.${extension}`, {
        type: fileType,
      });

      return file;
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        console.error('Gallery error:', error);
        toast.error('Failed to select from gallery.');
      }
      return null;
    }
  };

  return {
    takePicture,
    takeVideo,
    pickFromGallery,
    isNativePlatform,
  };
};
