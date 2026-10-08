import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Row, Section } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useLibrary } from '@/lib/library';
import { formatUsd } from '@/lib/models';
import { deleteApiKey, getApiKey, setApiKey } from '@/lib/storage';

const mask = (key: string) => `${key.slice(0, 3)}…${key.slice(-4)}`;

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings } = useLibrary();
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    getApiKey().then(setSavedKey);
  }, []);

  const save = async () => {
    const key = draft.trim();
    if (!key) return;
    await setApiKey(key);
    setSavedKey(key);
    setDraft('');
  };

  const remove = () =>
    Alert.alert('Remove the API key?', 'Transcription stops working until you add a key again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteApiKey();
          setSavedKey(null);
        },
      },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">
      <ThemedText type="subtitle">Settings</ThemedText>

      <Section title="OpenAI API key">
        {savedKey ? (
          <ThemedText>Saved in the iPhone Keychain: {mask(savedKey)}</ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary">
            No key yet. Make one at platform.openai.com/api-keys and paste it here.
          </ThemedText>
        )}
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder={savedKey ? 'Paste a new key to replace it' : 'sk-...'}
          placeholderTextColor={theme.textSecondary}
          value={draft}
          onChangeText={setDraft}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Row>
          <Button title="Save key" onPress={save} disabled={!draft.trim()} />
          {savedKey ? <Button title="Remove key" variant="danger" onPress={remove} /> : null}
        </Row>
      </Section>

      <Section title="Total spent">
        <ThemedText type="subtitle">{formatUsd(settings.totalSpentUsd)}</ThemedText>
        <ThemedText themeColor="textSecondary">
          ech0&apos;s own estimate for all transcriptions. OpenAI does not let apps read your real balance. See it
          at platform.openai.com/usage.
        </ThemedText>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 28 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
});
