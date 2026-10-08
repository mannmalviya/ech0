// Small shared building blocks: Button, Chip (a toggle button), and Section.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({ title, onPress, disabled, variant = 'primary' }: ButtonProps) {
  const theme = useTheme();
  const background = { primary: theme.accent, secondary: theme.backgroundElement, danger: theme.danger }[variant];
  const color = variant === 'secondary' ? theme.text : '#ffffff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, { backgroundColor: background }, (pressed || disabled) && styles.dim]}>
      <ThemedText style={[styles.buttonText, { color }]}>{title}</ThemedText>
    </Pressable>
  );
}

type ChipProps = { label: string; detail?: string; selected: boolean; disabled?: boolean; onPress: () => void };

export function Chip({ label, detail, selected, disabled, onPress }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        { borderColor: theme.accent },
        selected && { backgroundColor: theme.accent },
        disabled && styles.dim,
      ]}>
      <ThemedText style={[styles.chipText, { color: selected ? '#ffffff' : theme.accent }]}>{label}</ThemedText>
      {detail ? (
        <ThemedText type="small" style={{ color: selected ? '#ffffff' : theme.textSecondary }}>
          {detail}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

export const Row = ({ children }: { children: ReactNode }) => <View style={styles.row}>{children}</View>;

const styles = StyleSheet.create({
  button: { flexGrow: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontWeight: 600 },
  dim: { opacity: 0.45 },
  chip: { flexGrow: 1, minWidth: '45%', padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  chipText: { fontWeight: 600, fontSize: 15 },
  section: { gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
