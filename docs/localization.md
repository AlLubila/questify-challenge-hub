# Languages and editorial content

The public interface supports English, French, Polish, German and Spanish. The first visit uses the first supported browser language. Choosing another language saves `questify.language.v1` in browser storage. If storage is blocked, switching still works for the current visit. The document language, metadata, date formatting and countdowns follow the selection.

## Editing translations

English strings live in `src/translations/en.json`. The four other languages are maintained in `src/translations/translations.tsv` (key, French, Polish, German, Spanish). Regenerate the checked-in JSON files with `python scripts/build-locales.py`. Translation tests check complete coverage and interpolation variables.

Public navigation, landing page, authentication forms and validation messages, challenge details, feed controls, leaderboard, profile controls, rewards, referrals, FAQ, legal documents and image-editor controls use these catalogs. Administrative screens retain some original English copy; challenge translation fields are localized.

Challenge records have `source_language` and a `translations` JSON object. Each language entry contains a title, description, optional reward text and optional HTTPS cover URL. The admin creation form and challenge edit dialog expose these fields. Started entries require both title and description. Selecting the source language always displays the main record. Missing translations display the original brief with an explicit notice. Dates, identifiers, scoring and publication rules are shared across languages.

The built-in editorial challenges have reviewed translations in `supabase/functions/_shared/challengeCatalog.ts`, generated from `src/translations/challenges.tsv`. These also cover the existing published briefs without rewriting their original text. A built-in translation is only used when the original description still matches, preventing outdated translations after an edit.

Automatic generation requires complete French, Polish, German and Spanish translations alongside the English source before saving new generated challenges. Built-in weekly fallbacks already include them. No AI translation request is made when a visitor switches language.

## Images and participant work

Editorial illustrations contain no text and can be shared across languages. A translated cover URL overrides the shared cover when provided. Alt text follows the translated title; failed cover loads use the text-free illustration fallback. Logos and brand names remain unchanged. Participant photos, videos, captions, comments, usernames, custom image-editor text and personal preset names are preserved as authored. The language selector does not rewrite text embedded in participant images or translate user posts. New editorial images containing text need a supplied version for each language.

## Rollout

1. Apply `supabase/migrations/20261030191009_challenge_localizations.sql` before deploying the updated frontend. It adds two columns to the existing table and preserves its access policies.
2. Deploy the updated `generate-challenge` and `generate-weekly-challenge` functions with their shared files.
3. Publish the frontend through the existing deployment flow.

The migration and function changes are prepared in the repository. Development and browser checks use test data; they do not publish to the production site or modify live challenge records.

Validation: `npm run check`, `npx playwright test`, and Deno checks/tests for the modified functions and `challengeLocalization_test.ts`.
