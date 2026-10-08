import { Alert } from 'react-native';

export type NameChoice = { kind: 'save'; name: string } | { kind: 'delete' };

/** The name box after Stop: Save, Use date & time, or Delete (with "Are you sure?"). */
export function askForName(suggested: string, durationText: string): Promise<NameChoice> {
  return new Promise((resolve) => {
    Alert.prompt(
      'Name this recording',
      `Length ${durationText}. Empty name = ${suggested}`,
      [
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete() },
        { text: 'Use date & time', onPress: () => resolve({ kind: 'save', name: suggested }) },
        { text: 'Save', isPreferred: true, onPress: (value?: string) => resolve({ kind: 'save', name: value ?? '' }) },
      ],
      'plain-text'
    );

    const confirmDelete = () =>
      Alert.alert('Delete this recording?', 'You cannot undo this.', [
        // Go back to the name box.
        { text: 'Cancel', style: 'cancel', onPress: () => askForName(suggested, durationText).then(resolve) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve({ kind: 'delete' }) },
      ]);
  });
}
