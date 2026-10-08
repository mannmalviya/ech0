import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useLibrary } from '@/lib/library';
import { formatTime } from '@/lib/transcript';

// .m4a (AAC), 128 kbps, mono: about 58 MB per hour.
const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 48000,
  numberOfChannels: 1,
  bitRate: 128000,
  isMeteringEnabled: true,
};

const KEEP_AWAKE_TAG = 'ech0-record';
// In Expo Go, recording stops when the screen locks, so there the screen stays on while recording.
// ech0's own build keeps recording with the screen locked.
const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function RecordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { addRecording } = useLibrary();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const state = useAudioRecorderState(recorder, 100);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);
  const sawRecording = useRef(false);
  // Set by the ech0://record link (Action Button or Back Tap shortcut). A new value means "start now".
  const { autostart } = useLocalSearchParams<{ autostart?: string }>();
  const handledAutostart = useRef<string | undefined>(undefined);

  useEffect(() => {
    requestRecordingPermissionsAsync().then((result) => setPermission(result.granted));
  }, []);

  const start = useCallback(async () => {
    await recorder.prepareToRecordAsync();
    recorder.record();
    sawRecording.current = false;
    setStartedAt(new Date());
    if (IN_EXPO_GO) activateKeepAwakeAsync(KEEP_AWAKE_TAG);
  }, [recorder]);

  const stop = useCallback(async () => {
    if (!startedAt) return;
    setStartedAt(null);
    if (IN_EXPO_GO) deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    await recorder.stop();
    if (recorder.uri) await addRecording(recorder.uri, startedAt);
  }, [startedAt, recorder, addRecording]);

  // The shortcut only starts a recording. It never stops one, so a second press cannot end a talk by mistake.
  useEffect(() => {
    if (!autostart || autostart === handledAutostart.current || permission !== true) return;
    handledAutostart.current = autostart;
    // start() changes state only after an await, so this does not cause an extra render pass.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!startedAt) start();
  }, [autostart, permission, startedAt, start]);

  // A phone call pauses the recorder. Keep what was recorded and open the name box.
  useEffect(() => {
    if (!startedAt) return;
    if (state.isRecording) sawRecording.current = true;
    else if (sawRecording.current) stop();
  }, [state.isRecording, startedAt, stop]);

  const recording = startedAt !== null;
  const level = recording && typeof state.metering === 'number' ? state.metering : -160;
  const levelPercent = Math.max(0, Math.min(100, ((level + 60) / 60) * 100));

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <ThemedText type="subtitle">ech0</ThemedText>

      <View style={styles.center}>
        <ThemedText style={styles.timer}>{formatTime(recording ? state.durationMillis / 1000 : 0)}</ThemedText>

        <View style={[styles.meter, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.meterFill, { width: `${levelPercent}%` }]} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
          disabled={permission === false}
          onPress={recording ? stop : start}
          style={({ pressed }) => [styles.ring, { borderColor: theme.backgroundSelected }, pressed && styles.pressed]}>
          <View style={[recording ? styles.stopShape : styles.recordShape, { backgroundColor: theme.danger }]} />
        </Pressable>

        <ThemedText themeColor="textSecondary">
          {permission === false
            ? 'Microphone access is off. Turn it on in the iPhone Settings app.'
            : recording
              ? 'Recording. Tap to stop.'
              : 'Tap to record'}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  timer: { fontSize: 56, lineHeight: 64, fontWeight: 300, fontVariant: ['tabular-nums'] },
  meter: { width: '80%', height: 10, borderRadius: 5, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: '#30A46C' },
  ring: { width: 200, height: 200, borderRadius: 100, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  recordShape: { width: 160, height: 160, borderRadius: 80 },
  stopShape: { width: 80, height: 80, borderRadius: 14 },
});
