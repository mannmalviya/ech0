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

Files in `src/app/` are screens. The file path is the screen's address.

## Where the data is on the phone

- `Keynote.m4a`: a recording.
- `Keynote – whisper-1.txt`: one transcript per model.
- `.ech0/library.json`: names, lengths, and transcripts with their times.
- `.ech0/settings.json`: last models, language, and total spent.
- `.ech0/unsaved/`: recordings that do not have a name yet.

The API key is not in a file. It is in the iPhone Keychain.

## Commands

```bash
npm test              # automatic tests for the math
npm run typecheck     # check the TypeScript types
npm run lint          # check the code style
```
