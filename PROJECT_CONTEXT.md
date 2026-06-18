# iDonate Project Context

## What this project is

iDonate is an Expo React Native app for blood donation coordination. It lets donors sign in, maintain a donor profile, browse blood requests, volunteer for a request, book donation appointments with verified institutions, track donation status, request blood, and receive notification updates.

The app is built with Expo SDK 54, React Native 0.81, React 19, Expo Router, Supabase, Expo Notifications, Expo Location, React Native Maps, and EAS Build.

## How to run it

- Install dependencies: `npm install`
- Start Expo: `npm run start`
- Android native/dev build: `npm run android`
- iOS native/dev build: `npm run ios`
- Web: `npm run web`
- Lint: `npm run lint`

Push notifications and `react-native-maps` are native features. Several code paths gracefully degrade in Expo Go, but the full app expects a development build or real native build, especially for notifications, Google Sign-In, and maps.

## Required environment and platform config

Supabase is configured in `lib/supabase.ts` and expects:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY`

The Supabase client stores auth sessions in `AsyncStorage` using a project-ref-based key. There is helper cleanup for bad refresh tokens.

Important native config lives in `app.json`:

- App scheme: `idonateapp`
- Android package: `com.henry33y.idonate`
- iOS bundle id: `com.henry33y.iDonate`
- EAS project id: `8778c660-6c82-48ba-8e6a-fe609274d28f`
- Google Maps Android API key is currently in `app.json`
- Firebase config is referenced through `google-services.json`
- Plugins include `expo-router`, `expo-splash-screen`, `expo-notifications`, and `@react-native-google-signin/google-signin`

Build profiles are in `eas.json`: `development`, `preview` APK, and `production`.

## App structure

Routing uses Expo Router under `app/`.

- `app/_layout.tsx`: root providers, splash screen, auth-based routing, notification-tap navigation.
- `app/(tabs)/_layout.tsx`: bottom tab navigation.
- `app/(tabs)/index.tsx`: home dashboard.
- `app/(tabs)/requests.tsx`: browse active blood requests.
- `app/(tabs)/map.tsx`: map of nearby verified institutions.
- `app/(tabs)/donations.tsx`: donor appointment/history tracking.
- `app/(tabs)/profile.tsx`: profile summary, stats, settings links, sign out.
- `app/signin.tsx`: email/password sign in and sign up, plus Google sign-in.
- `app/onboarding.tsx`: entry screen for signed-out users.
- `app/request-blood.tsx`: create a blood request.
- `app/donate-blood.tsx`: book a direct institution donation appointment.
- `app/blood-request/[id].tsx`: request details and volunteer flow.
- `app/my-requests.tsx`: requester view of their own requests and received donations.
- `app/notifications.tsx`: notification list.
- `app/edit-profile.tsx`, `app/settings.tsx`, `app/search.tsx`, `app/compatibility.tsx`: supporting screens.

Reusable UI components are in `components/`, with small app-specific components like `BloodTypeGatingModal` and generic UI wrappers like `Button`, `Card`, `ThemedText`, and `ThemedView`.

## Core data model assumed by the app

The code assumes these Supabase tables and relationships:

- `profiles`: user-facing identity fields such as `full_name`, `phone_number`, `avatar_url`, `push_token`, `user_type`.
- `donors`: donor medical/profile fields keyed by user id, including `blood_type`, `rh_factor`, `genotype`, `birth_date`, `weight_kg`, `availability_status`, `last_donation_date`, `next_eligible_date`, and `address`.
- `institutions`: verified donation centers/hospitals, including `institution_name`, `verified`, `location`, `address`, `institution_type`, and related profile data.
- `blood_requests`: requests for blood, including requester, blood type, urgency, status, dates, max donors, and confirmed counts.
- `donations`: donation appointments and commitments, including donor, institution, request, scheduled date, status, confirmation flags, units, and notes.
- `institution_slots`: recurring institution availability windows.
- `notifications`: database-backed notification records with `user_id`, `type`, `title`, `message`, `data`, `is_read`, and `created_at`.

Some behavior depends on database triggers or policies not present in this repo. For example, donor cooldown after completed donations is described as primarily handled by a DB trigger, with client-side fallback in `services/donationService.ts`.

## Main flows

### Authentication and profile loading

`contexts/AuthContext.tsx` wraps the app. It loads the Supabase session, fetches the user's `profiles` row joined with `donors`, and exposes `signUp`, `signIn`, `signInWithGoogle`, `signOut`, and `refreshProfile`.

Email sign-up creates a Supabase auth user, updates `profiles.phone_number`, and creates or updates the `donors` row. Google sign-in tries native Google Sign-In first, then falls back to browser OAuth with the `idonateapp://google-auth` redirect.

Root navigation in `app/_layout.tsx` sends authenticated users to `/(tabs)` and unauthenticated users to `/onboarding`.

### Donor eligibility

Eligibility logic is in `services/donorService.ts`.

Rules currently enforced client-side:

- Minimum age: 18
- Maximum age: 65
- Minimum weight: 50 kg
- Donation cooldown: 90 days
- Prefer `donors.next_eligible_date`; fall back to `last_donation_date`

`isBloodTypeComplete()` only requires `blood_type`. Genotype is optional.

### Blood requests

`services/requestService.ts` creates and fetches requests from `blood_requests`.

Active requests are statuses `open`, `matched`, or `in_progress`. The service enriches requester profile info and separately looks up institution names. Screens use request status plus the current user's donation status to decide what to show.

`app/request-blood.tsx` creates individual requests. It requires selected blood type, urgency, and reason. Location can come from a verified center, manual entry, or reverse geocoded current location. The form blocks submission if the user's blood profile is incomplete.

### Donating to a request

`app/blood-request/[id].tsx` handles the volunteer flow.

The donor can accept only if:

- Their blood type is compatible with the requested type.
- They are not accepting their own request.
- They have no active donation elsewhere.
- They are not already actively committed to this request.
- The request is not full or completed.
- They are not in cooldown.
- Their blood profile has a blood type.

Accepting a request calls `bookDonation()` with `bloodRequestId`, creates a `donations` row with status `scheduled`, then sends the donor to the Donations tab.

### Direct institution appointments

`app/donate-blood.tsx` is for booking a donation appointment at a nearby verified institution, not necessarily tied to a blood request.

It gets the user's location, finds verified institutions nearby, optionally shows a map, loads `institution_slots`, calculates remaining capacity for the chosen date, and books a donation with `blood_request_id = null`.

### Donation lifecycle

Donation status values are:

- `scheduled`
- `confirmed`
- `completed`
- `cancelled`
- `no_show`

`services/donationService.ts` supports booking, cancelling, listing, status lookup, donor confirmation, recipient confirmation, and institution slot capacity.

Completion can happen when both sides confirm. Donor confirmation checks `institution_confirmed`; recipient confirmation checks `donor_confirmed`. When completed, the client fallback updates donor cooldown fields.

### Notifications

Push notification registration is in `services/notificationService.ts`.

Push behavior:

- Skipped in Expo Go.
- Requires physical device.
- Saves Expo push token to `profiles.push_token`.
- Clears token on sign out.
- Notification taps route to `/blood-request/[id]` when `data.requestId` exists.

Database notification behavior:

- `NotificationContext` tracks total unread count and "new since last home seen" count.
- It stores `notification_last_seen` in `AsyncStorage`.
- It subscribes to Supabase Realtime changes on the `notifications` table for the current user.

### Offline/cache behavior

`services/offlineCache.ts` stores JSON in `AsyncStorage` under `@idonate:*` keys. Home, profile, and donation screens use cached donor profiles, active requests, request statuses, and donations to render quickly before fresh Supabase calls complete.

### Maps and locations

Location is handled through `expo-location`.

Institution coordinates are parsed in `services/institutionService.ts`. `extractCoords()` supports PostGIS WKB hex, GeoJSON point objects, and WKT `POINT(lng lat)` strings. Distance filtering uses client-side Haversine math.

`app/(tabs)/map.tsx` imports `react-native-maps` directly and expects maps to be available. `app/donate-blood.tsx` dynamically requires maps and has a fallback view for Expo Go.

## Important service files

- `lib/supabase.ts`: Supabase client and auth storage cleanup.
- `contexts/AuthContext.tsx`: auth, profile enrichment, Google sign-in, push registration.
- `contexts/NotificationContext.tsx`: unread counts and realtime notification subscription.
- `services/donorService.ts`: donor profile CRUD and eligibility/cooldown logic.
- `services/requestService.ts`: blood request CRUD and request enrichment.
- `services/donationService.ts`: appointment booking, statuses, confirmations, slots.
- `services/institutionService.ts`: verified institutions, coordinate parsing, nearby filtering.
- `services/matchingService.ts`: blood compatibility matrix and available donor lookup.
- `services/notificationService.ts`: push token handling and notification table helpers.
- `services/offlineCache.ts`: `AsyncStorage` cache wrapper.

## Things to watch

- The generated Expo `README.md` is still generic and does not explain this app.
- Supabase schema, RLS policies, triggers, and Edge Functions are not in this repo, but the app depends heavily on them.
- Several user-facing strings show mojibake characters in source/output, likely from encoding issues around arrows, bullets, emojis, or smart punctuation.
- `app/(tabs)/map.tsx` imports `react-native-maps` directly, while `donate-blood.tsx` guards it dynamically. If Expo Go compatibility matters, the map tab may need the same guard.
- `app.json` contains a Google Maps API key. Confirm whether this key is restricted appropriately in Google Cloud.
- Request creation stores `date_needed` as `selectedDate.toISOString()`, while other code sometimes treats it like a date string. Be careful with timezone/date display bugs.
- Some request location data is embedded into `description` as `Reason:` and `Location:` text. That works for display but is brittle for querying or structured updates.
- `donors_confirmed_count` and request completion appear to rely on database-side logic that is not visible here.
- Direct appointment booking allows selecting "High Demand" full slots visually, because full slots are styled but not disabled in `donate-blood.tsx`.

## Good places to change common behavior

- Change app startup/auth routing: `app/_layout.tsx`
- Change sign-in/sign-up behavior: `contexts/AuthContext.tsx` and `app/signin.tsx`
- Change donor eligibility rules: `services/donorService.ts`
- Change blood compatibility: `services/matchingService.ts` and the local map in `app/blood-request/[id].tsx`
- Change request creation fields: `app/request-blood.tsx` and `services/requestService.ts`
- Change donation status lifecycle: `services/donationService.ts`
- Change notification counts/badges: `contexts/NotificationContext.tsx`
- Change map/nearby center behavior: `services/institutionService.ts`, `app/(tabs)/map.tsx`, and `app/donate-blood.tsx`
