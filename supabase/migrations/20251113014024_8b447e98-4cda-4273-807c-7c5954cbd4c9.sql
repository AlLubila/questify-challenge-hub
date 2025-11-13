-- Create table to track boost ticket purchases
CREATE TABLE public.boost_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  boost_type TEXT NOT NULL CHECK (boost_type IN ('small', 'medium', 'large')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boost_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view their own boost purchases"
ON public.boost_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own purchases (will be done via edge function)
CREATE POLICY "Users can insert their own boost purchases"
ON public.boost_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create table to track subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  subscription_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Create table to track wallet transactions
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('boost_purchase', 'challenge_reward', 'refund')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.wallet_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Add wallet_balance to profiles table
ALTER TABLE public.profiles
ADD COLUMN wallet_balance INTEGER NOT NULL DEFAULT 0;

-- Create function to update wallet balance
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = wallet_balance + NEW.amount
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create trigger to update wallet balance on new transaction
CREATE TRIGGER update_wallet_on_transaction
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_balance();

-- Add boost_level to submissions table to track boosted submissions
ALTER TABLE public.submissions
ADD COLUMN boost_level TEXT CHECK (boost_level IN ('none', 'small', 'medium', 'large')) DEFAULT 'none';

-- Create index for efficient queries
CREATE INDEX idx_boost_purchases_user_id ON public.boost_purchases(user_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);