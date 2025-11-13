-- Add referral_code to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_earnings INTEGER DEFAULT 0;

-- Create referrals table to track referral relationships
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_amount INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referrer_id, referred_id)
);

-- Enable RLS on referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can insert referrals"
ON public.referrals
FOR INSERT
WITH CHECK (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Function to handle referral on signup
CREATE OR REPLACE FUNCTION public.process_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_profile_id UUID;
  referral_bonus INTEGER := 50;
  referee_bonus INTEGER := 25;
BEGIN
  -- Check if user was referred
  IF NEW.referred_by IS NOT NULL THEN
    -- Create referral record
    INSERT INTO public.referrals (referrer_id, referred_id, reward_amount, status)
    VALUES (NEW.referred_by, NEW.id, referral_bonus, 'completed');
    
    -- Update referrer stats and wallet
    UPDATE public.profiles
    SET 
      referral_count = referral_count + 1,
      referral_earnings = referral_earnings + referral_bonus,
      wallet_balance = wallet_balance + referral_bonus,
      points = points + referral_bonus
    WHERE id = NEW.referred_by;
    
    -- Reward the new user (referee)
    UPDATE public.profiles
    SET 
      wallet_balance = wallet_balance + referee_bonus,
      points = points + referee_bonus
    WHERE id = NEW.id;
    
    -- Create wallet transactions
    INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description)
    VALUES 
      (NEW.referred_by, referral_bonus, 'referral_reward', 'Referral bonus for inviting ' || NEW.username),
      (NEW.id, referee_bonus, 'referral_reward', 'Welcome bonus from referral');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to process referrals after profile creation
CREATE TRIGGER on_profile_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral();

-- Update existing profiles to have referral codes
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;