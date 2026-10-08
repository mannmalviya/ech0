# ech0

A simple iPhone app that records talks and transcribes them with speech-to-text models.
See [PLAN.md](PLAN.md) for what it does and why, and [TODO.md](TODO.md) for later ideas.

## Run it on your iPhone (Expo Go)

1. Install **Expo Go** from the App Store.
2. Connect the iPhone to the same Wi-Fi as this computer.
3. Run:

   ```bash
   cd "/home/mann/Developer/IOS apps/ech0"
   REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.66 npx expo start
   ```

   If the phone cannot connect, use `npx expo start --tunnel`.
4. Scan the QR code with the iPhone camera.
5. In ech0, open **Settings** and paste your OpenAI API key.

## Your own build (works for 7 days)

Your own build can do 3 things that Expo Go cannot: record with the screen locked, show the ech0 folder in the Files app, and transcribe audio longer than 25 minutes.

### 1. Build the app on GitHub

1. Open <https://github.com/mannmalviya/ech0/actions/workflows/ios-build.yml>.
2. Click **Run workflow** → **Run workflow**. Or run `gh workflow run ios-build.yml -R mannmalviya/ech0` as the mannmalviya account.
3. Wait about 20 minutes. Open the finished run and download **ech0-ipa** at the bottom. Unzip it to get `ech0.ipa`.

### 2. Prepare the iPhone (one time)

1. Settings → Privacy & Security → **Developer Mode** → On. The iPhone restarts.
2. Connect the iPhone to this computer with a USB cable, and tap **Trust**.

### 3. Install

See "Install tool" below. After you install it, open Settings → General → **VPN & Device Management**, tap your Apple ID, and tap **Trust**.

**Every 7 days**, install the same way again. Install over the old app, and do not delete it first: then your recordings and API key stay.

### 4. Action Button or Back Tap shortcut

1. Open the **Shortcuts** app → **+** → **Add Action** → **Open URLs**.
2. Type `ech0://record`. Name the shortcut "Record with ech0".
3. **Action Button:** Settings → Action Button → Shortcut → "Record with ech0".
4. **Back Tap:** Settings → Accessibility → Touch → Back Tap → Double Tap → "Record with ech0".

The shortcut opens ech0 and starts recording. It never stops a recording, so a second press cannot end a talk by mistake.

## The parts

The stack is **Expo + React Native + TypeScript**. React Native makes real iPhone screens from TypeScript code. Expo gives ready-made parts for audio, files, and more.

| File | What it does |
| --- | --- |
| `src/app/index.tsx` | **Record** screen: big button, timer, sound level. |
| `src/app/library/index.tsx` | **Library** list and **Import audio**. |
| `src/app/library/[id].tsx` | **Recording page**: player, rename, delete, transcribe, transcripts. |
| `src/app/settings.tsx` | **Settings**: API key and total spent. |
| `src/components/transcribe-panel.tsx` | Model and language buttons, cost estimate. |
| `src/components/transcript-card.tsx` | One transcript with Copy, Share, and Retry. |
| `src/components/transcript-view.tsx` | Transcript text with the highlight while playing. |
| `src/lib/library.tsx` | The shared state. All actions (save, name, import, rename, delete, transcribe) are here. |
| `src/lib/storage.ts` | Where files are kept on the phone. |
| `src/lib/models.ts` | **Model list and prices.** Change prices here when OpenAI changes them. |
| `src/lib/openai.ts`, `openai-format.ts` | What ech0 sends to OpenAI, and how it reads the answer. |
| `src/lib/transcript.ts` | The `.txt` format and the highlight math. |
| `src/lib/names.ts` | File names: date-time names, safe characters, "(2)" for taken names. |
| `src/app/+native-intent.tsx` | Turns the `ech0://record` link into "start recording". |
| `modules/audio-splitter/` | Native Swift code that cuts long audio into 20-minute parts. Only in the own build. |
| `.github/workflows/ios-build.yml` | The GitHub build that makes `ech0.ipa`. |

Files in `src/app/` are screens. The file path is the screen's address.

## Where the data is on the phone

- `Keynote.m4a`: a recording.
- `Keynote – whisper-1.txt`: one transcript per model.
- `.ech0/library.json`: names, lengths, and transcripts with their times.
- `.ech0/settings.json`: last models, language, and total spent.
- `.ech0/unsaved/`: recordings that do not have a name yet.
- `.ech0/parts/`: 20-minute parts of long audio, made when you transcribe.

The API key is not in a file. It is in the iPhone Keychain.

## Commands

```bash
npm test              # automatic tests for the math
npm run typecheck     # check the TypeScript types
npm run lint          # check the code style
```
