import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ModelPicker from './ModelPicker';
import type { Model } from '../types';
import { colors, spacing } from '../theme';

type Props = {
  onSend: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
  showGreeting?: boolean;
  models: Model[];
  selectedModel: string;
  onModelChange: (id: string) => void;
};

export default function ChatInput({
  onSend,
  onStop,
  isLoading,
  showGreeting,
  models,
  selectedModel,
  onModelChange,
}: Props) {
  const [input, setInput] = useState('');

  const hasText = input.trim().length > 0;

  const handleSubmit = () => {
    if (!hasText || isLoading) return;
    onSend(input);
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={styles.wrapper}>
        {showGreeting ? (
          <View style={styles.greeting}>
            <View style={styles.avatar} />
            <Text style={styles.greetingText}>
              Hey there! I'm here to help with anything you need
            </Text>
          </View>
        ) : null}

        <View style={styles.container}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={8000}
            editable={!isLoading}
          />

          <View style={styles.toolbar}>
            <ModelPicker
              models={models}
              selectedModel={selectedModel}
              onSelect={onModelChange}
              disabled={isLoading}
            />

            <Pressable
              style={[styles.sendBtn, isLoading && styles.stopBtn, (!hasText && !isLoading) && styles.sendDisabled]}
              onPress={isLoading ? onStop : handleSubmit}
              disabled={!isLoading && !hasText}
            >
              {isLoading ? (
                <Text style={styles.stopIcon}>■</Text>
              ) : (
                <Text style={styles.sendIcon}>↑</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8b5a2b',
  },
  greetingText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  container: {
    backgroundColor: colors.surfaceBg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.md,
    minHeight: 120,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 48,
    maxHeight: 140,
    marginBottom: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentPeach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    backgroundColor: '#2a2018',
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendIcon: {
    color: '#2a2018',
    fontSize: 18,
    fontWeight: '700',
  },
  stopIcon: {
    color: colors.accentPeach,
    fontSize: 14,
  },
});
