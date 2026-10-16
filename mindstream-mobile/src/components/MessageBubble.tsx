import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import type { ChatMessage } from '../types';
import { colors } from '../theme';

type Props = {
  message: ChatMessage;
  isStreaming?: boolean;
};

export default function MessageBubble({ message, isStreaming }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const canCopy = Boolean(message.content?.trim()) && !isStreaming;

  const handleCopy = async () => {
    if (!canCopy) return;
    await Clipboard.setStringAsync(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble, message.isError && styles.errorBubble]}>
        {canCopy && (
          <Pressable onPress={handleCopy} style={styles.copyBtn} hitSlop={8}>
            <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
        )}

        {message.fallbackNotice ? (
          <Text style={styles.notice}>{message.fallbackNotice}</Text>
        ) : null}

        {!isUser && message.statusHint && !message.content && !message.reasoning ? (
          <Text style={styles.statusHint}>{message.statusHint}</Text>
        ) : null}

        {!isUser && message.reasoning ? (
          <View style={styles.reasoningBlock}>
            <Text style={styles.reasoningLabel}>Reasoning</Text>
            <Markdown style={markdownStyles}>{message.reasoning}</Markdown>
          </View>
        ) : null}

        {isUser ? (
          <Text style={styles.userText}>{message.content}</Text>
        ) : (
          <>
            {isStreaming && !message.content && message.reasoning ? (
              <Text style={styles.statusHint}>Thinking…</Text>
            ) : null}
            <Markdown style={markdownStyles}>
              {message.content || (isStreaming && !message.reasoning ? '▍' : '')}
            </Markdown>
            {isStreaming && message.content ? <Text style={styles.cursor}>▍</Text> : null}
          </>
        )}
      </View>
    </View>
  );
}

const markdownStyles = StyleSheet.create({
  body: { color: colors.textPrimary, fontSize: 15, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  code_inline: {
    backgroundColor: colors.surfaceBtn,
    color: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  fence: {
    backgroundColor: colors.surfaceBtn,
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
});

const styles = StyleSheet.create({
  row: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '92%',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  userBubble: {
    backgroundColor: colors.surfaceBtn,
    borderColor: colors.surfaceBtnBorder,
  },
  assistantBubble: {
    backgroundColor: colors.surfaceBg,
  },
  errorBubble: {
    borderColor: colors.error,
  },
  userText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  copyBtn: {
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  copyText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  notice: {
    color: colors.accent,
    fontSize: 12,
    marginBottom: 8,
  },
  statusHint: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  reasoningBlock: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceBtn,
    borderWidth: 1,
    borderColor: colors.surfaceBtnBorder,
  },
  reasoningLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  cursor: {
    color: colors.accent,
  },
});
