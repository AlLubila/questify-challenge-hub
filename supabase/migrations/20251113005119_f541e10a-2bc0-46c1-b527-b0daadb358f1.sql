-- Create challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  prize TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly')),
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view challenges
CREATE POLICY "Anyone can view challenges"
  ON public.challenges
  FOR SELECT
  USING (true);

-- Authenticated users can create challenges
CREATE POLICY "Authenticated users can create challenges"
  ON public.challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own challenges
CREATE POLICY "Users can update own challenges"
  ON public.challenges
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own challenges
CREATE POLICY "Users can delete own challenges"
  ON public.challenges
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_challenges_challenge_type ON public.challenges(challenge_type);
CREATE INDEX IF NOT EXISTS idx_challenges_end_date ON public.challenges(end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_is_ai_generated ON public.challenges(is_ai_generated);