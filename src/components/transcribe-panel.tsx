// Choose models and language, see the cost, and start transcription.

import { Alert, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Row } from '@/components/ui';
import { useLibrary } from '@/lib/library';
import { canSplitAudio } from '../../modules/audio-splitter';
import { estimateCost, formatUsd, getModel, modelProblem, MODELS, partLengths, type ModelId } from '@/lib/models';
import type { Recording } from '@/lib/storage';
import { LANGUAGES } from '@/lib/transcript';

export function TranscribePanel({ recording }: { recording: Recording }) {
  const { settings, updateSettings, transcribe } = useLibrary();
  const { models: selected, language } = settings;

  const problemOf = (id: ModelId) => modelProblem(id, recording.durationSec, recording.sizeBytes, canSplitAudio);
  const partCount = partLengths(recording.durationSec, recording.sizeBytes).length;
  const isRunning = (id: ModelId) => recording.transcripts[id]?.status === 'running';
  const usable = selected.filter((id) => !problemOf(id) && !isRunning(id));

  const toggle = (id: ModelId) =>
    updateSettings({ models: selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id] });

  const minutes = recording.durationSec / 60;
  const prices = usable.map((id) => formatUsd(getModel(id).pricePerMinute)).join(' + ');
  const estimate =
    usable.length === 0
      ? 'Select at least one model.'
      : `${minutes.toFixed(1)} min × (${prices}) = ${formatUsd(estimateCost(recording.durationSec, usable))}`;

  const run = () => {
    const start = () => transcribe(recording.id, usable, language);
    const replacing = usable.filter((id) => recording.transcripts[id]?.status === 'done');
    if (replacing.length === 0) return start();
    Alert.alert('Replace transcripts?', `This replaces the old transcript of: ${replacing.join(', ')}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: start },
    ]);
  };

  return (
    <>
      <Row>
        {MODELS.map(({ id, pricePerMinute }) => (
          <Chip
            key={id}
            label={id}
            detail={isRunning(id) ? 'Running…' : (problemOf(id) ?? `${formatUsd(pricePerMinute)} / min`)}
            selected={selected.includes(id)}
            disabled={!!problemOf(id) || isRunning(id)}
            onPress={() => toggle(id)}
          />
        ))}
      </Row>
      <Row>
        {LANGUAGES.map(({ id, label }) => (
          <Chip key={id} label={label} selected={language === id} onPress={() => updateSettings({ language: id })} />
        ))}
      </Row>
      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        The diarize model always uses Auto language.
      </ThemedText>
      {partCount > 1 && canSplitAudio ? (
        <ThemedText type="small" themeColor="textSecondary">
          Long audio: ech0 sends it in {partCount} parts of 20 min. With diarize, speaker letters start again in
          each part, so &quot;A (part 1)&quot; and &quot;A (part 2)&quot; can be different people.
        </ThemedText>
      ) : null}
      <ThemedText style={styles.estimate}>{estimate}</ThemedText>
      <Button
        title={`Transcribe with ${usable.length} model${usable.length === 1 ? '' : 's'}`}
        disabled={usable.length === 0}
        onPress={run}
      />
    </>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: -4 },
  estimate: { fontWeight: 600 },
});
