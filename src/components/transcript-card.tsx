import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TranscriptView } from '@/components/transcript-view';
import { Button, Row } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { getModel } from '@/lib/models';
import { transcriptFile, type Recording } from '@/lib/storage';
import { toTxt, type Transcript } from '@/lib/transcript';

type Props = {
  recording: Recording;
  transcript: Transcript;
  time: number | null;
  onSeek: (seconds: number) => void;
  onRetry: () => void;
};

const TIMING_NOTE = {
  none: 'No times from this model, so no highlight.',
  turns: 'Highlights speaker turns while playing. Tap a turn to jump.',
  words: 'Highlights words while playing. Tap a word to jump.',
};

export function TranscriptCard({ recording, transcript, time, onSeek, onRetry }: Props) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const txt = () => toTxt(recording.name, transcript);

  const copy = async () => {
    await Clipboard.setStringAsync(txt());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    try {
      const file = transcriptFile(recording.name, transcript.model);
      if (!file.exists) file.create();
      file.write(txt());
      await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', UTI: 'public.plain-text' });
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={{ color: theme.accent }}>
        {transcript.model}
      </ThemedText>

      {transcript.status === 'running' && <ThemedText themeColor="textSecondary">Transcribing…</ThemedText>}

      {transcript.status === 'failed' && (
        <>
          <ThemedText style={{ color: theme.danger }}>Failed: {transcript.error}</ThemedText>
          <Button title="Retry" onPress={onRetry} />
        </>
      )}

      {transcript.status === 'done' && (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {TIMING_NOTE[getModel(transcript.model).timing]}
          </ThemedText>
          <TranscriptView transcript={transcript} time={time} onSeek={onSeek} />
          <Row>
            <Button title={copied ? 'Copied ✓' : 'Copy'} variant="secondary" onPress={copy} />
            <Button title="Share" variant="secondary" onPress={share} />
          </Row>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 12, gap: 10 },
});
