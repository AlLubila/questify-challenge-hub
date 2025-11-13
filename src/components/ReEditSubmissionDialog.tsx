import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageEditorAdvanced } from "@/components/ImageEditorAdvanced";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ReEditSubmissionDialogProps {
  submission: any;
  children: React.ReactNode;
}

export const ReEditSubmissionDialog = ({ submission, children }: ReEditSubmissionDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [caption, setCaption] = useState(submission.caption || "");
  const [preview, setPreview] = useState<string>(submission.content_url);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      let contentUrl = submission.content_url;

      // If user uploaded a new image, upload it
      if (contentFile) {
        const fileExt = contentFile.name.split(".").pop();
        const filePath = `${user.id}/${submission.challenge_id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("submissions")
          .upload(filePath, contentFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("submissions")
          .getPublicUrl(filePath);

        contentUrl = urlData.publicUrl;
      }

      // Update submission
      const { error: updateError } = await supabase
        .from("submissions")
        .update({
          content_url: contentUrl,
          caption: caption.trim() || null,
        })
        .eq("id", submission.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submission"] });
      queryClient.invalidateQueries({ queryKey: ["feed-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Submission updated!");
      setOpen(false);
      setIsEditing(false);
      setContentFile(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update submission");
    },
  });

  const handleFileLoad = async () => {
    // Fetch the original image as a file
    const response = await fetch(submission.content_url);
    const blob = await response.blob();
    const file = new File([blob], "submission.jpg", { type: blob.type });
    setContentFile(file);
    setIsEditing(true);
  };

  const handleEditedImage = (editedFile: File) => {
    setContentFile(editedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(editedFile);
    setIsEditing(false);
    toast.success("Image edited successfully!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Re-Edit Submission</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isEditing ? (
            <>
              <div>
                <Label>Current Image</Label>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mt-2">
                  <img
                    src={preview}
                    alt="Submission"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleFileLoad}
                  className="w-full mt-2"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Image
                </Button>
              </div>

              <div>
                <Label htmlFor="caption">Caption</Label>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tell us about your submission..."
                  rows={4}
                />
              </div>

              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="w-full bg-gradient-primary"
              >
                <Upload className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Updating..." : "Update Submission"}
              </Button>
            </>
          ) : (
            contentFile && (
              <ImageEditorAdvanced
                imageFile={contentFile}
                onSave={handleEditedImage}
                onCancel={() => setIsEditing(false)}
              />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
