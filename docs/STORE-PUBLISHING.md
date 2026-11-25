# Store publishing plan

This is the January 2027 plan for listing CalSite Safety on the Apple App Store and Google Play. The November home-screen install is the web app (manifest, icons, service worker, `/install`). This document does not add Capacitor, a Trusted Web Activity, or store accounts.

The web app stays the product. A store build should load the production site and add a few native capabilities. Do not statically export Next.js for the stores. Sign-in, server actions, and Prisma need the server.

## Recommendation

Use Capacitor for both stores. One `appId`, one icon source, and the same camera, push, and offline-draft work.

Trusted Web Activity (TWA) is the Android fallback, not the main plan. It wraps the installed PWA in Chrome and can be built with Bubblewrap or PWABuilder. It does not produce an iOS app. Use it only if Play has to ship while the native iOS features are still being reviewed, or if a Capacitor Android binary is rejected and the PWA itself is the thing you want listed. Do not maintain TWA and Capacitor Android at the same time.

Apple Guideline 4.2 (minimum functionality) is the main schedule risk. A binary that only opens `https://<production host>` in a web view is a wrapped website and is likely to be rejected. The native features below have to be in the binary the reviewer installs.

## Accounts, started in December

Do this before writing store code. Verification often takes longer than the build.

| Store | Account | Cost | Name on the listing |
| --- | --- | --- | --- |
| Apple App Store | Apple Developer Program, **Organization** | 99 USD per year | The company's legal name |
| Google Play | Google Play Console, **organization** | 25 USD one time | The same legal name |

Apple's organization enrollment needs a D-U-N-S number for the legal entity. The legal name on the D-U-N-S record has to match the name you enroll. If you do not have a D-U-N-S number, request one from Dun & Bradstreet first. That request is free and can take days or weeks. An individual Apple ID puts the app under a person's name and is the wrong account for this product.

Google's organization verification can also ask for the D-U-N-S number and a website. Start both accounts in December so January is for the build and review, not for waiting on identity checks.

You also need:

- A public privacy-policy URL that loads without signing in
- A support URL and an email a reviewer can use
- A phone number and a name for the store contact, not only a shared inbox that nobody reads
- A demo company on production for the reviewer, marked as demonstration data, with no real employee, injury, or medical notes

Set `AUTH_URL` on the Netlify site `calsite-safety` to the public origin (the custom domain, or `https://calsite-safety.netlify.app` if there is no custom domain). Auth.js and the printed install QR both use that origin.

## Bundle id

Use `co.rosenex.calsite` for the iOS bundle id and the Android `applicationId`.

- Same id on both stores. Changing it later means a new listing and a new install for the crew.
- Apple's App ID is the team id plus this bundle id. Register the id in Certificates, Identifiers & Profiles before the first Xcode archive.
- Use the id only if the company is comfortable being the publisher of record under that name. The domain in the id does not have to resolve for the listing itself. Associated domains and Digital Asset Links, if you add them later, do have to be files you control on the production host.

## What to add to the repo later

Do not add these for the home-screen release. They pull in Xcode and Android SDK work and do not change the Netlify web build the crew uses now.

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- `@capacitor/app`, `@capacitor/splash-screen`, `@capacitor/status-bar`
- `@capacitor/camera` for jobsite photos and a drawn signature
- `@capacitor/push-notifications` for a tailgate due today or a new incident assignment
- `@capacitor/preferences` (or filesystem) for offline drafts on the device
- `capacitor.config.ts` with `appId: "co.rosenex.calsite"`, `appName: "CalSite"`, and `server.url` set to the production origin. `webDir` can be a tiny local shell. This app cannot be a static `out/` folder.
- `ios/` and `android/` generated projects, committed so CI and a second machine can archive without regenerating blindly
- App icons generated from `public/icons/icon-1024.png` (already in the repo, full-bleed navy, same mark as the favicon)
- iOS privacy manifest `PrivacyInfo.xcprivacy`, camera and photo usage strings, and a push entitlement
- Play App Signing, plus `/.well-known/assetlinks.json` only if you also ship a TWA
- A CI job that builds the web app as it does now. The native archive stays a separate job so a store change cannot break the Netlify deploy.

`server.url` means a web deploy updates the installed app without a store review. That is what you want for copy and bug fixes. It is also why Apple looks at whether the binary does anything the Safari site does not. Keep native features in the binary, not only on the website.

The service worker in this repo is for the browser install. Do not use it as the offline store for the native app. iOS web views are a poor place to keep safety records. Drafts belong in Capacitor storage, on that device, holding only what that person typed before submit.

## Native features to build before review

Build these in the binary. A settings toggle that does nothing is not enough.

1. **Camera capture.** Take a photo on an inspection or incident, and capture a drawn signature, through the native camera plugin. The web app's file input can stay for the browser. When this ships, change `Permissions-Policy` from `camera=()` to allow the camera on this origin, and add the iOS usage string. Leave the camera blocked until that feature is real.
2. **Push notifications.** A tailgate that is due, or an incident assigned to the signed-in person. Ask for permission in context, not on first launch. Store the device token server-side against the membership, and let the person turn it off.
3. **Offline drafts.** On a jobsite with no signal, let the signed-in person start an inspection or incident on the device and submit it when the network returns. Do not cache other people's records, `/api` responses, or the session. The web service worker must keep refusing those. A draft is local until the server accepts it.
4. **Optional, if review still looks thin:** require the device passcode or Face ID before the records open.

In App Review notes, say who the user is (a crew member on a California jobsite), give the demo login, and say which of the three features to try. Do not give the reviewer a company that holds real injury reports.

## Privacy, health data, and deletion

The app stores account name and email, a password hash, company and jobsite addresses, employee name, phone, and trade, training, inspections, uploaded files, and incident reports. Incident types include injury and illness. Treat those notes as health information even though this is not a medical product.

Before submission:

- Publish a privacy policy, in English and Spanish, at a URL that does not require sign-in. State what is collected, that a company admin can see it, how long it is kept, that it is not sold, and how a person asks for deletion.
- Apple nutrition labels and the Google Data safety form must list personal info, photos, and health info if injury or illness text is in the build the reviewer sees. Do not mark health data as "not collected" if the incident form is in the app.
- Add in-app account deletion. Apple requires it when the app lets someone create an account (App Store Review Guideline 5.1.1(v)). Sign-up exists today. Deletion has to remove or anonymize that person's membership and the personal fields, and the policy has to say what the company record still keeps (for example an incident narrative the company is required to retain, with the name removed).
- Google Play wants a data-deletion URL as well as the in-app path. The same public page can host it.
- The demo account for review uses the existing demonstration banner. Do not load real crew data into it.

Crew Sign, if it is in the build you submit, adds a PIN hash, a drawn signature, and a device cookie. The privacy policy and Data safety form have to mention those. The web service worker still must not cache `/api/sign` or kiosk pages.

## Checklist

December, accounts:

- [ ] Confirm the legal entity name and request a D-U-N-S number if one is not already on file
- [ ] Enroll in the Apple Developer Program as an organization (99 USD/year)
- [ ] Create the Google Play Console organization account (25 USD) and finish identity verification
- [ ] Register bundle id `co.rosenex.calsite` on Apple and as the Play application id
- [ ] Set `AUTH_URL` on Netlify site `calsite-safety` to the public origin
- [ ] Publish the privacy policy and the deletion instructions at a public URL
- [ ] Create a demonstration company for reviewers

January, product:

- [ ] Add Capacitor with `server.url` pointed at production. Do not static-export the Next.js app
- [ ] Generate iOS and Android icons from `public/icons/icon-1024.png`
- [ ] Ship camera capture for a photo and a signature
- [ ] Ship push for a due tailgate or an assigned incident, with a way to turn it off
- [ ] Ship on-device drafts that submit later, without caching `/api`, `/auth`, or another person's record
- [ ] Add in-app account deletion and point the store forms at the public deletion URL
- [ ] Update `Permissions-Policy` so camera works only when that feature is on
- [ ] Fill in Apple privacy labels, `PrivacyInfo.xcprivacy`, and the Play Data safety form, including injury/illness text
- [ ] Produce phone screenshots of sign-in, Today, an inspection, and the new camera or draft flow. No real people's data
- [ ] Archive a release build. iOS through Xcode or `xcodebuild`. Android as an AAB signed with Play App Signing
- [ ] Complete the age rating and export questionnaire. Standard HTTPS only is the usual export answer. Do not add custom cryptography
- [ ] Submit with review notes, the demo login, and the three native features called out
- [ ] After approval, install from the store on one iPhone and one Android phone, sign in, take a photo, and confirm a draft made in airplane mode does not appear for a second user

## TWA fallback, Android only

If you use TWA instead of Capacitor on Android:

- The PWA from this branch has to stay installable (manifest, 192 and 512 icons, a service worker that handles fetch, HTTPS)
- `/.well-known/assetlinks.json` must return HTTP 200 as `application/json`, with the Play signing certificate SHA-256. It must not redirect to sign-in. The middleware matcher has to leave that path alone
- The asset-links package name is `co.rosenex.calsite`
- Play still reviews web wrappers. A broken manifest or a login wall on the start URL fails review
- This path does not help the App Store

## What this plan does not do

- It does not file the app, open the developer accounts, or buy the memberships
- It does not change Netlify Team SSO. Phones that install from the home screen or the stores have to reach production without the team login. Preview deploys can stay locked
- It does not make safety records available offline. Offline is a notice on the web, and later a personal draft on the device
