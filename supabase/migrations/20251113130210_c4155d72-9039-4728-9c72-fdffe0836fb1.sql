-- Add scheduling fields to challenges table
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS publish_status text DEFAULT 'published' CHECK (publish_status IN ('draft', 'scheduled', 'published')),
ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamp with time zone;

-- Create index for scheduled challenges query
CREATE INDEX IF NOT EXISTS idx_challenges_scheduled ON public.challenges(scheduled_publish_at) 
WHERE publish_status = 'scheduled';

-- Update existing challenges to be published
UPDATE public.challenges SET publish_status = 'published' WHERE publish_status IS NULL;