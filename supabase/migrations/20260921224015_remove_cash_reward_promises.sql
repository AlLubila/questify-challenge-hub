-- Replace public cash-style challenge labels with non-cash recognition.
UPDATE public.challenges
SET prize = points::text || ' points + Weekly Spotlight badge'
WHERE prize ~* '(\$|€|£|\mcash\M|\mdollars?\M|\meuros?\M|\mpounds?\M|\mUSD\M|\mEUR\M|\mGBP\M)';
