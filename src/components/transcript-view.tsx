// Shows a transcript. While the audio plays, it highlights the current word (whisper-1)
// or speaker turn (diarize). Tap a word or turn to jump there.

import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { activeIndex, formatTime, type Transcript, type Word } from '@/lib/transcript';

type Props = {
  transcript: Transcript;
  /** Playback position in seconds, or null when nothing has played yet. */
  time: number | null;
  onSeek: (seconds: number) => void;
};

export function TranscriptView({ transcript, time, onSeek }: Props) {
  if (transcript.words?.length) return <WordsView words={transcript.words} time={time} onSeek={onSeek} />;
  if (transcript.turns?.some((t) => t.speaker)) return <TurnsView transcript={transcript} time={time} onSeek={onSeek} />;
  return (
    <ThemedText selectable style={styles.text}>
      {transcript.text}
    </ThemedText>
  );
}

// Words are drawn in groups, so each update only redraws the group with the current word.
const GROUP_SIZE = 40;

function WordsView({ words, time, onSeek }: { words: Word[]; time: number | null; onSeek: (s: number) => void }) {
  const theme = useTheme();
  const active = time === null ? -1 : activeIndex(words, time);
  const groups: Word[][] = [];
  for (let i = 0; i < words.length; i += GROUP_SIZE) groups.push(words.slice(i, i + GROUP_SIZE));

  return (
    <Text style={[styles.text, { color: theme.text }]}>
      {groups.map((group, g) => {
        const offset = g * GROUP_SIZE;
        const local = active >= offset && active < offset + group.length ? active - offset : -1;
        return (
          <WordGroup key={g} words={group} activeWord={local} highlight={theme.highlight} onSeek={onSeek} />
        );
      })}
    </Text>
  );
}

const WordGroup = memo(function WordGroup(props: {
  words: Word[];
  activeWord: number;
  highlight: string;
  onSeek: (s: number) => void;
}) {
  return props.words.map((w, i) => (
    <Text
      key={i}
      onPress={() => props.onSeek(w.start)}
      style={i === props.activeWord ? { backgroundColor: props.highlight } : undefined}>
      {w.word}{' '}
    </Text>
  ));
});

function TurnsView({ transcript, time, onSeek }: Props) {
  const theme = useTheme();
  const turns = transcript.turns ?? [];
  const active = time === null ? -1 : activeIndex(turns, time);

  return (
    <View style={styles.turns}>
      {turns.map((turn, i) => (
        <Pressable
          key={i}
          onPress={() => onSeek(turn.start)}
          style={[styles.turn, i === active && { backgroundColor: theme.highlight }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {turn.speaker} · {formatTime(turn.start)}
          </ThemedText>
          <ThemedText style={styles.text}>{turn.text.trim()}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 16, lineHeight: 24 },
  turns: { gap: 4 },
  turn: { padding: 6, borderRadius: 8 },
});
