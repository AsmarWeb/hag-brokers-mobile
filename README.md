# HAG Brokers Mobile

React Native + Expo application for the HAG Brokers commercial marketplace. Arabic/English, light/dark appearance, connected to the existing Laravel REST API v1. This repository is separate from the Laravel backend.

## Run

Node 24 LTS is recommended. Dependencies are locked with `package-lock.json`.

```bash
npm ci
cp .env.example .env
npm run check
npx expo install --check
npx expo start --go --clear
```

The project uses **Expo SDK 58**. Install a compatible Expo Go version for Android from https://expo.dev/go. If Expo Go does not support this SDK on your device (especially iOS), create a development build instead:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile development --platform android
npx expo start --dev-client --clear
```

Builds need your own Expo account and platform signing configuration. No cloud build, store submission, paid service, or remote repository has been created automatically. Do not switch SDK versions just to hide an Expo Go mismatch; use a matching client/development build.

## Included

- Real public marketplace search, sector filters, pagination, opportunity details and marine specifications.
- Native-only secure login, individual/company registration, verification resend, password-reset email and device session revocation.
- Company workspace and limits from the existing API, company opportunity reads, basic text edit/close.
- Five-step publication: intent, sector, details, photos/video, review. Explicit publication confirmation.
- RFQ submission with private attachments, sent/received offers, explicit versioned selection/decline/withdrawal.
- JSON negotiation polling while the screen is active, text messages, earlier-message pagination, explicit company-shared read acknowledgement.
- Supported private RFQ/moderation notifications and explicit notification read state.
- API/network/permission/validation errors, retry controls, persistent idempotency within the current form session, safe binary attachment viewing/sharing.
- App appearance and language preferences; server content is not machine-translated.

## API configuration

`EXPO_PUBLIC_API_ORIGIN=https://hagbrokers.net` is an origin only, without `/api/v1`, query, user info or fragment. These variables are public in the compiled application; never put a Stripe/OpenAI/SMTP/server key here. The app appends `/api/v1` and sends Bearer credentials only for protected requests to this origin.

Development-only LAN HTTP requires `EXPO_PUBLIC_ALLOW_LOCAL_HTTP=1` and a development build. Production origins require HTTPS. Public media is restricted to the configured origin in this first release; external CDN allowlists can be added deliberately later.

`npm run api:check` performs read-only checks against the configured HTTPS API; it sends no credentials and creates no records. Backend contract: `docs/openapi-v1.json` (v1.2, 32 routes).

## Checks

```bash
npm run check
npm run format:check
npm run export:check
CI=1 EXPO_OFFLINE=1 npx expo export --platform android --output-dir dist-native
```

CI runs types, network/session/idempotency unit tests, formatting, SDK dependency compatibility and a web bundle. These do not prove native rendering or real signed-in workflows on iOS/Android. See [README_AR.md](README_AR.md) for the device acceptance checklist.

## Initial-release boundaries

This is a development starter, not a store-ready release. Native push, background messaging, WebSockets, OAuth/partner keys, in-app payments, account deletion, full company-profile editing, saved searches and offline mutation persistence are not implemented. Email verification and password reset open the existing website flow; universal/deep-link completion is not wired.

The first publisher form exposes common trade types, location, price, expiry and basic yacht/boat specs, not every advanced backend field. Company opportunity editing exposes title/description/private notes only. RFQ uses backend-supported units/currencies. Quantity and prices are strings; totals are calculated by the server. Private offer comparison and immutable event history APIs remain available for the next screen iteration.

Web export is a visual/public-browsing preview: login is intentionally disabled because this project does not persist auth tokens in browser storage. Use native Android/iOS for authentication. On offline logout, local credentials are removed but server token revocation may need another device/the website or token expiry.

Use dedicated test companies when exercising writes: publication consumes a slot, RFQs consume the application quota, and messages/decisions may generate notifications and emails under existing preferences. Never test with financial production documents.
