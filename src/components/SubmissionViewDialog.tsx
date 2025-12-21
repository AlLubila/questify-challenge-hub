import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ReactNode } from "react";

interface SubmissionViewDialogProps {
  contentUrl: string;
  isVideo: boolean;
  children: ReactNode;
}

export const SubmissionViewDialog = ({ contentUrl, isVideo, children }: SubmissionViewDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
        <div className="relative w-full h-[80vh] flex items-center justify-center">
          {isVideo ? (
            <video
              src={contentUrl}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <img
              src={contentUrl}
              alt="Submission"
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
