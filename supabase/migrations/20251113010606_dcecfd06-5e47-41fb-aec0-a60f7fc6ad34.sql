-- Function to increment user points and XP
CREATE OR REPLACE FUNCTION increment_points(user_id UUID, points_to_add INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_xp INTEGER;
  new_level INTEGER;
BEGIN
  -- Update points and XP
  UPDATE profiles
  SET 
    points = points + points_to_add,
    xp = xp + points_to_add
  WHERE id = user_id
  RETURNING xp INTO new_xp;

  -- Calculate new level (every 1000 XP = 1 level)
  new_level := FLOOR(new_xp / 1000) + 1;

  -- Update level if it changed
  UPDATE profiles
  SET level = new_level
  WHERE id = user_id AND level != new_level;
END;
$$;