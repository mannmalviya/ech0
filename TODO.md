# ech0: TODO for later versions

## Mics
- Add a mic picker: bottom, front, back, and stereo.
- Do a fair test of each mic choice: play the same recording from a speaker at a fixed distance, and record it once with each mic choice. Then compare the transcripts and the sound.
- Look at the newer iOS spatial audio recording APIs.

## Audio processing
- Silence removal before upload, for lower cost.
- Noise removal. Test it first: it can make speech-to-text worse.
- Better speaker separation than the diarize model.

## Transcripts
- Highlight for all models: get word times from `whisper-1` and match them to the text of better models.
- Real speaker names for diarize, from short voice samples (`known_speaker_names[]` and `known_speaker_references[]`).
- More export formats: `.srt` and `.json`.

## Recording
- After a phone call, continue in the same file, not a new file.

## Models
- More speech-to-text services (for example Deepgram, AssemblyAI, ElevenLabs).
- Models that run on the phone, with no internet.
