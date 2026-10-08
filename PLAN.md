# ech0: plan

ech0 is a simple iPhone app. It records talks at events and conferences, and it transcribes them with speech-to-text models. The goal is to compare a plain iPhone with recorders like Plaud and Pocket.

**Folder:** `/home/mann/Developer/IOS apps/ech0`
**Stack:** Expo + React Native + TypeScript, and git with one commit per feature.

## Screens

1. **Record:** big button, timer, sound level bar.
   - The app records `.m4a` at 128 kbps mono, in the default mic mode.
   - After Stop, a name box opens with 3 buttons: **Save**, **Use date & time**, **Delete** (asks "Are you sure?").
   - In Expo Go, the screen stays on while recording, because Expo Go stops recording when the screen locks.
   - If the app closes before you choose, ech0 asks again the next time you open it.
   - If a phone call stops the recording, the app keeps the audio and opens the name box.
2. **Library:** the newest recordings are first. You can rename, delete (with "Are you sure?"), and **Import audio** (mp3, m4a, wav, and more, copied into ech0).
   - **Recording page:** player, **Share audio** (for "Save to Files" in Expo Go), rename, delete, transcribe panel, transcript cards.
   - **Transcribe panel:**
     - Model buttons with multi-select. They start with your last choice.
     - Language: **Auto**, English, or Hindi.
     - Cost estimate, for example "12 min × ($0.0045 + $0.006) = $0.13".
     - The selected models run at the same time.
   - **Running a model again:** it replaces the old transcript of that model. The app asks first.
   - **While transcribing:** the screen stays on. Each finished part is saved. **Retry** sends only the failed parts.
   - **Transcript card:** model name, **Copy**, **Share** (`.txt` with speakers and times when the model gives them).
   - **Highlight while playing:** word by word with `whisper-1`, and speaker turn by turn with diarize. Tap a word or turn to jump there. Other models show plain text.
3. **Settings:** the API key (kept in the iOS Keychain) and the total that ech0 spent.

**Files:** Each recording has its `.m4a` file and one `.txt` file per model, in the ech0 folder.

## Models and prices (October 2026)

| Model | Price per minute | Times for highlight |
| --- | --- | --- |
| `gpt-transcribe` | $0.0045 | none |
| `gpt-4o-transcribe` | $0.006 | none |
| `gpt-4o-mini-transcribe` | $0.003 | none |
| `gpt-4o-transcribe-diarize` | $0.006 | per speaker turn |
| `whisper-1` | $0.006 | per word |

- The `gpt-*` models accept a maximum of 25 minutes of audio (1500 seconds) per request.
- All models accept a maximum file size of 25 MB per request.
- OpenAI does not let apps read the credit balance. The total spent in Settings is ech0's own estimate.

## Phase 1: Expo Go (recordings up to 25 minutes)

Steps in this order. Each step has a check:

1. Make the project with 3 tabs. → **Check:** it opens in Expo Go.
2. Settings and API key. → **Check:** the key is still there after a reload.
3. Record screen and name box. → **Check:** close the app before naming. ech0 asks again when you open it.
4. Library, rename, delete, import. → **Check:** an imported mp3 shows its correct length.
5. Transcribe panel. → **Check:** 3 models run on 1 recording, and the total spent in Settings changes.
6. Transcript cards, highlight, and tap to jump. → **Check:** the highlight follows the audio.
7. Automatic tests for the math: cost, names, `.txt` format, and which word to highlight at each moment.

Audio longer than 25 minutes shows a warning in Expo Go and suggests `whisper-1`.

## Phase 2: your own build

- Recording with the screen locked.
- The ech0 folder shows in the Files app under **On My iPhone › ech0**.
- Long audio is cut into parts only when you transcribe, with native code.
- A public GitHub repo builds the app on a free GitHub Mac. A free Apple ID installs it for 7 days.
- A shortcut link, `ech0://record`, opens ech0 and starts recording. You can put it on the Action Button or Back Tap. It never stops a recording.
- Long audio is cut into 20-minute parts. Retry sends only the failed parts. With diarize, speaker letters start again in each part ("A (part 2)").

## Decisions and why

- **`.m4a`, not `.mp3`:** iPhones record `.m4a`. MP3 needs an extra encoder that Expo Go cannot run. The import still accepts `.mp3`.
- **Default mic:** iOS records from one mic choice at a time, and its default mix is usually best for speech. A fair test of each mic is in `TODO.md`.
- **No audio processing in version 1:** first get real recordings from events, then decide what to fix.
- **API key in the Keychain, not in the code:** the GitHub repo is public, so the code must never contain the key.
- **Name box before saving:** the audio stays in a hidden "unsaved" folder until you choose. So a crash cannot lose it.
