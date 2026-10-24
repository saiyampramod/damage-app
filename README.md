# Damage app

The iOS and Android app for Damage, built with Expo.

## See it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. In a terminal, in this folder:

   ```bash
   npm install
   npx expo start
   ```

3. Scan the QR code: with the Camera app on iPhone, or from inside Expo Go on Android. Your phone and laptop need to be on the same Wi-Fi.
   If they can't see each other (office or college Wi-Fi), run `npx expo start --tunnel` instead.

Every saved change reloads on the phone in a second or two. Press `w` in the terminal to open it in a browser too.

## What's built

- Home: the receipt summary, bills and groups as price tags, and the two people stickers.
- The nav bar with the torn add button.
- Every other screen is a placeholder listing what goes there, so you can tap through the whole app.

Data is example data for now. See `CLAUDE.md` for how the code is organised and the design rules.
