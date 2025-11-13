-- Create admin activity logs table
CREATE TABLE public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and moderators can view logs
CREATE POLICY "Admins and moderators can view logs"
ON public.admin_activity_logs
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

-- Only admins and moderators can insert logs
CREATE POLICY "Admins and moderators can insert logs"
ON public.admin_activity_logs
FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Add moderation fields to submissions table
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS moderation_flags JSONB,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_moderation_status ON public.submissions(moderation_status);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);