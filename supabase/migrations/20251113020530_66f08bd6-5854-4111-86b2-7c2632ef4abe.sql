-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or moderator
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Everyone can view roles"
ON public.user_roles
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update submissions table policies for moderation
CREATE POLICY "Admins and moderators can view all submissions"
ON public.submissions
FOR SELECT
USING (
  (status = 'approved'::text) 
  OR (auth.uid() = user_id)
  OR public.is_admin_or_moderator(auth.uid())
);

CREATE POLICY "Admins and moderators can update any submission"
ON public.submissions
FOR UPDATE
USING (
  (auth.uid() = user_id)
  OR public.is_admin_or_moderator(auth.uid())
);

-- Update challenges table policies for moderation
CREATE POLICY "Admins and moderators can update any challenge"
ON public.challenges
FOR UPDATE
USING (
  (created_by = auth.uid())
  OR public.is_admin_or_moderator(auth.uid())
);

CREATE POLICY "Admins and moderators can delete any challenge"
ON public.challenges
FOR DELETE
USING (
  (created_by = auth.uid())
  OR public.is_admin_or_moderator(auth.uid())
);

-- Create index for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);