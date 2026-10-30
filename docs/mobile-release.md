# A Challenge mobile release

## Current deliverables

The Android and iOS projects package the reviewed Vite bundle locally, use application identifier `com.albilubila.achallenge`, and display the A Challenge name and existing brand mark. Both include the five interface languages. Camera access uses the native Capacitor Camera plugin. Safe-area spacing supports notches and system bars. Android back navigation returns through the app or minimizes it at the root.

The first mobile edition is free. It hides Creator Pass purchase screens, boost purchase buttons and Google login; email/password and email-code authentication remain available. Payment hooks also reject native purchase attempts. The web edition keeps its existing payment and Google login flows. Do not enable mobile purchases without a separate store billing implementation and server-side entitlement validation.

Authentication callbacks use PKCE and the system browser. Recovery links return to the password-reset screen. Before device testing, add both addresses to Supabase Auth's allowed redirect URLs:

- `com.albilubila.achallenge://auth/callback`
- `com.albilubila.achallenge://auth/callback?mode=reset`

The native projects register the same URL scheme. Referral links always use the public HTTPS site, never the native localhost origin.

Push registration is off by default. Enable `VITE_NATIVE_PUSH_ENABLED=true` only after configuring Firebase/APNs, registering the correct application identifiers and verifying notifications on real devices. No signing keys, provisioning profiles or Firebase configuration are committed.

## Build and test

- `npm ci`
- `npm run check`
- `npm run mobile:sync` (builds the web bundle and updates both projects)
- `node scripts/mobile-assets.mjs` (regenerates icons from the existing SVG)
- `npm run mobile:open:android` (Android Studio)
- `npm run mobile:open:ios` (Xcode on macOS)

The Mobile builds GitHub workflow produces a debug APK, an **unsigned** Android release bundle and an **unsigned iOS simulator** application. The simulator build does not install on a physical iPhone and is not an App Store upload. Release signing is intentionally not configured before the developer accounts and distribution identities exist.

Capacitor 8 requires Node 22+, Android Studio 2025.2.1+ and Xcode 26+ with iOS 15+. This Windows workspace has no Android SDK/JDK or Xcode; native compilation runs on the appropriate GitHub build machines. Run camera, keyboard, offline-start, login/recovery and permission-denial checks on actual Android and iPhone devices before submission.

## Publication remains blocked

The owner confirmed that neither developer account exists yet. Nothing has been submitted to Google Play or App Store Connect.

1. Create and verify a Google Play Console account and Apple Developer membership as the legal owner. Complete any identity, business or DSA trader verification requested by the stores. Do not send passwords or private signing keys in chat.
2. Confirm identifier availability, create the two app records, configure Supabase callback URLs, and configure signing in protected build secrets. Keep the Android upload key backed up and use Play App Signing. Configure an Apple distribution identity and provisioning profile for the same bundle identifier.
3. Complete the remaining community-release requirements before a store submission: users need in-app reporting, blocking, and account deletion; the operator needs a documented moderation response process. The existing website has staff moderation but does not yet provide all these self-service flows. Store review must not be attempted as if these features already existed.
4. Review and complete Apple privacy disclosures, Google Data Safety, content/age ratings, countries, support contact, privacy-policy and account-deletion URLs. The app handles account/profile information, user photos/videos, captions/comments, technical diagnostics and analytics; the owner must validate the final declarations against enabled services.
5. Capture screenshots from the actual native app. Add final localized descriptions and keywords in English, French, Polish, German and Spanish. Use an approved original demo account for reviewers and explain how to submit and moderate a challenge entry.
6. Test the signed releases through Google Play internal/closed testing and TestFlight. New personal Google Play accounts can require at least 12 continuously opted-in testers for 14 days before requesting production access.
7. Submit complete signed releases for store review. Publication and acceptance dates are controlled by Google and Apple; a successful build does not constitute approval.

Official references:

- https://capacitorjs.com/docs/getting-started/environment-setup
- https://play.google.com/console/signup
- https://developer.apple.com/programs/enroll/
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/
- https://support.google.com/googleplay/android-developer/answer/14151465
