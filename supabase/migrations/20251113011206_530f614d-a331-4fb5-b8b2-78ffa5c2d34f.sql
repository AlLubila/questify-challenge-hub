-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Comments are viewable by everyone
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create votes table
CREATE TABLE public.submission_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, user_id)
);

ALTER TABLE public.submission_votes ENABLE ROW LEVEL SECURITY;

-- Votes are viewable by everyone
CREATE POLICY "Votes are viewable by everyone"
  ON public.submission_votes FOR SELECT
  USING (true);

-- Authenticated users can vote
CREATE POLICY "Authenticated users can vote"
  ON public.submission_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own votes
CREATE POLICY "Users can remove their own votes"
  ON public.submission_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add updated_at trigger to comments
CREATE TRIGGER set_updated_at_comments
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to update submission vote count
CREATE OR REPLACE FUNCTION update_submission_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE submissions
    SET votes = votes + 1
    WHERE id = NEW.submission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE submissions
    SET votes = votes - 1
    WHERE id = OLD.submission_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger to update vote count on submissions
CREATE TRIGGER update_votes_on_insert
  AFTER INSERT ON public.submission_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_votes();

CREATE TRIGGER update_votes_on_delete
  AFTER DELETE ON public.submission_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_votes();

-- Create indexes for better performance
CREATE INDEX idx_comments_submission_id ON public.comments(submission_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_votes_submission_id ON public.submission_votes(submission_id);
CREATE INDEX idx_votes_user_id ON public.submission_votes(user_id);