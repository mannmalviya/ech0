import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TranscribePanel } from '@/components/transcribe-panel';
import { TranscriptCard } from '@/components/transcript-card';
import { Button, Row, Section } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useLibrary } from '@/lib/library';
import { MODELS } from '@/lib/models';
import { audioFile } from '@/lib/storage';
import { formatTime } from '@/lib/transcript';

export default function RecordingScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recordings, rename, remove, retry } = useLibrary();
  const recording = recordings.find((r) => r.id === id);

  const player = useAudioPlayer(recording ? audioFile(recording).uri : null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [barWidth, setBarWidth] = useState(1);

  const seek = useCallback(
    (seconds: number) => {
      player.seekTo(Math.max(0, seconds));
      player.play();
    },
    [player]
  );

  if (!recording) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.background }]}>
        <ThemedText>This recording was deleted.</ThemedText>
      </View>
    );
  }

  const duration = status.duration || recording.durationSec;
  // Highlight only after playback has started.
  const time = status.playing || status.currentTime > 0 ? status.currentTime : null;

  const onRename = () =>
    Alert.prompt(
      'Rename',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', isPreferred: true, onPress: (value?: string) => rename(recording.id, value ?? '') },
      ],
      'plain-text',
      recording.name
    );

  const onDelete = () =>
    Alert.alert('Delete this recording?', 'This deletes the audio and all its transcripts. You cannot undo this.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          player.pause();
          remove(recording.id);
          router.back();
        },
      },
    ]);

  const onShareAudio = () =>
    Sharing.shareAsync(audioFile(recording).uri).catch((e) => Alert.alert('Could not share', String(e)));

  const transcripts = MODELS.map((m) => recording.transcripts[m.id]).filter((t) => t !== undefined);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: recording.name }} />

      <Section title="Audio">
        <Pressable
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width || 1)}
          onPress={(e) => seek((e.nativeEvent.locationX / barWidth) * duration)}
          style={[styles.bar, { backgroundColor: theme.backgroundElement }]}>
          <View
            style={[
              styles.barFill,
              { backgroundColor: theme.accent, width: `${Math.min(100, (status.currentTime / (duration || 1)) * 100)}%` },
            ]}
          />
        </Pressable>
        <ThemedText themeColor="textSecondary" style={styles.time}>
          {formatTime(status.currentTime)} / {formatTime(duration)}
        </ThemedText>
        <Row>
          <Button title="−15 s" variant="secondary" onPress={() => seek(status.currentTime - 15)} />
          <Button
            title={status.playing ? 'Pause' : 'Play'}
            onPress={() => (status.playing ? player.pause() : player.play())}
          />
          <Button title="+15 s" variant="secondary" onPress={() => seek(status.currentTime + 15)} />
        </Row>
        <Row>
          <Button title="Share audio" variant="secondary" onPress={onShareAudio} />
          <Button title="Rename" variant="secondary" onPress={onRename} />
          <Button title="Delete" variant="danger" onPress={onDelete} />
        </Row>
      </Section>

      <Section title="Transcribe">
        <TranscribePanel recording={recording} />
      </Section>

      <Section title="Transcripts">
        {transcripts.length === 0 ? (
          <ThemedText themeColor="textSecondary">No transcripts yet.</ThemedText>
        ) : (
          transcripts.map((t) => (
            <TranscriptCard
              key={t.model}
              recording={recording}
              transcript={t}
              time={time}
              onSeek={seek}
              onRetry={() => retry(recording.id, t.model)}
            />
          ))
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 28, paddingBottom: 60 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 28, borderRadius: 8, overflow: 'hidden' },
  barFill: { height: '100%' },
  time: { textAlign: 'center', fontVariant: ['tabular-nums'] },
});
