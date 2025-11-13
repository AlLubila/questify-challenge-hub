-- Add referral_code to profiles table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='referral_code') THEN
    ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='referred_by') THEN
    ALTER TABLE public.profiles ADD COLUMN referred_by UUID REFERENCES public.profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='referral_count') THEN
    ALTER TABLE public.profiles ADD COLUMN referral_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='referral_earnings') THEN
    ALTER TABLE public.profiles ADD COLUMN referral_earnings INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create referrals table if not exists
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_amount INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referrals_referrer_id_referred_id_key') THEN
    ALTER TABLE public.referrals ADD CONSTRAINT referrals_referrer_id_referred_id_key UNIQUE(referrer_id, referred_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;

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
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists;
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
  referral_bonus INTEGER := 50;
  referee_bonus INTEGER := 25;
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_amount, status, completed_at)
    VALUES (NEW.referred_by, NEW.id, referral_bonus, 'completed', now());
    
    UPDATE public.profiles
    SET 
      referral_count = referral_count + 1,
      referral_earnings = referral_earnings + referral_bonus,
      wallet_balance = wallet_balance + referral_bonus,
      points = points + referral_bonus
    WHERE id = NEW.referred_by;
    
    UPDATE public.profiles
    SET 
      wallet_balance = wallet_balance + referee_bonus,
      points = points + referee_bonus
    WHERE id = NEW.id;
    
    INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description)
    VALUES 
      (NEW.referred_by, referral_bonus, 'referral_reward', 'Referral bonus for inviting ' || NEW.username),
      (NEW.id, referee_bonus, 'referral_reward', 'Welcome bonus from referral');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_profile_referral ON public.profiles;

CREATE TRIGGER on_profile_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral();

-- Update existing profiles to have referral codes
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;