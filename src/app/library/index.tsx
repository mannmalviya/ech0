import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useLibrary } from '@/lib/library';
import type { Recording } from '@/lib/storage';
import { formatTime } from '@/lib/transcript';

const open = (id: string) => router.push({ pathname: '/library/[id]', params: { id } });

function describe(r: Recording): string {
  const date = new Date(r.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const count = Object.values(r.transcripts).filter((t) => t.status === 'done').length;
  const parts = [date, formatTime(r.durationSec), `${count} transcript${count === 1 ? '' : 's'}`];
  if (r.source === 'imported') parts.push('imported');
  return parts.join(' · ');
}

export default function LibraryScreen() {
  const theme = useTheme();
  const { recordings, importAudio } = useLibrary();

  const onImport = async () => {
    try {
      const id = await importAudio();
      if (id) open(id);
    } catch (e) {
      Alert.alert('Could not import the file', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      data={recordings}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={<Button title="Import audio" variant="secondary" onPress={onImport} />}
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          No recordings yet. Record one, or import an audio file.
        </ThemedText>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => open(item.id)}
          style={({ pressed }) => [styles.item, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {describe(item)}
          </ThemedText>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 16 },
  empty: { textAlign: 'center', marginTop: 40 },
  item: { padding: 14, borderRadius: 12, gap: 2 },
  name: { fontSize: 17 },
  pressed: { opacity: 0.6 },
  gap: { height: 8 },
});
