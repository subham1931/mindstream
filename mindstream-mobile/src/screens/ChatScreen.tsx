import { useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import ChatInput from '../components/ChatInput';
import MessageBubble from '../components/MessageBubble';
import { useChatContext } from '../context/ChatContext';
import { colors, spacing } from '../theme';

type Props = {
  navigation: DrawerNavigationProp<Record<string, undefined>>;
};

export default function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const chat = useChatContext();

  const messages = chat.activeConversation?.messages ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <Text style={styles.title}>MindStream</Text>
        {!chat.isTempChat ? (
          <Pressable style={styles.tempBtn} onPress={chat.handleTempChat}>
            <Text style={styles.tempIcon}>🕶</Text>
          </Pressable>
        ) : (
          <View style={styles.tempBtnPlaceholder} />
        )}
      </View>

      {chat.isTempChat ? (
        <View style={styles.tempBanner}>
          <Text style={styles.tempBannerText}>Temporary chat — not saved</Text>
        </View>
      ) : null}

      {chat.isEmpty ? (
        <KeyboardAvoidingView
          style={styles.emptyStage}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ChatInput
            onSend={chat.handleSend}
            onStop={chat.handleStop}
            isLoading={chat.isLoading}
            showGreeting
            models={chat.models}
            selectedModel={chat.selectedModel}
            onModelChange={chat.setSelectedModel}
          />
        </KeyboardAvoidingView>
      ) : (
        <>
          <FlatList
            ref={listRef}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                isStreaming={chat.isLoading && index === messages.length - 1 && item.role === 'assistant'}
              />
            )}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
          <ChatInput
            onSend={chat.handleSend}
            onStop={chat.handleStop}
            isLoading={chat.isLoading}
            models={chat.models}
            selectedModel={chat.selectedModel}
            onModelChange={chat.setSelectedModel}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.surfaceBtn,
    borderWidth: 1,
    borderColor: colors.surfaceBtnBorder,
  },
  menuIcon: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  tempBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.surfaceBg,
    borderWidth: 1,
    borderColor: colors.surfaceBtnBorder,
  },
  tempBtnPlaceholder: {
    width: 36,
    height: 36,
  },
  tempIcon: {
    fontSize: 16,
  },
  tempBanner: {
    backgroundColor: colors.tempPurpleBg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(155, 138, 255, 0.2)',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tempBannerText: {
    color: colors.tempPurple,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyStage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
