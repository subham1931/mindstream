import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';
import type { Conversation } from '../types';
import { colors, spacing } from '../theme';

type Props = DrawerContentComponentProps & {
  conversations: Conversation[];
  activeId?: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onPinChat: (id: string) => void;
  onShowAuth: (mode?: 'signin' | 'signup') => void;
  onSignOut: () => void;
};

export default function DrawerContent({
  conversations,
  activeId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onPinChat,
  onShowAuth,
  onSignOut,
  navigation,
}: Props) {
  const { user, signOut } = useAuth();

  const sorted = [...conversations].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const handleSignOut = async () => {
    await signOut();
    onSignOut();
    navigation.closeDrawer();
  };

  const confirmDelete = (id: string, title: string) => {
    Alert.alert('Delete chat', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteChat(id) },
    ]);
  };

  return (
    <DrawerContentScrollView style={styles.drawer} contentContainerStyle={styles.drawerContent}>
      <View style={styles.header}>
        <View style={styles.logoAvatar} />
        <Text style={styles.logoText}>MindStream</Text>
      </View>

      <Pressable style={styles.newChatBtn} onPress={() => { onNewChat(); navigation.closeDrawer(); }}>
        <Text style={styles.newChatIcon}>+</Text>
        <Text style={styles.newChatText}>New chat</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Chats</Text>

      <ScrollView style={styles.list}>
        {sorted.map((conv) => (
          <Pressable
            key={conv.id}
            style={[styles.convItem, conv.id === activeId && styles.convItemActive]}
            onPress={() => {
              onSelectChat(conv.id);
              navigation.closeDrawer();
            }}
            onLongPress={() => {
              Alert.alert(conv.title, undefined, [
                {
                  text: conv.pinned ? 'Unpin' : 'Pin',
                  onPress: () => onPinChat(conv.id),
                },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => confirmDelete(conv.id, conv.title),
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
            <Text style={styles.convIcon}>{conv.pinned ? '📌' : '💬'}</Text>
            <Text style={styles.convTitle} numberOfLines={1}>
              {conv.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {user ? (
          <View style={styles.userRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {(user.user_metadata?.full_name || user.email)?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.user_metadata?.full_name || 'User'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            <Pressable onPress={handleSignOut} hitSlop={8}>
              <Text style={styles.signOut}>Out</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.authRow}>
            <Pressable style={styles.signInBtn} onPress={() => onShowAuth('signin')}>
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
            <Pressable style={styles.signUpBtn} onPress={() => onShowAuth('signup')}>
              <Text style={styles.signUpText}>Sign Up</Text>
            </Pressable>
          </View>
        )}
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  drawerContent: {
    flexGrow: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  logoAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5a2b',
  },
  logoText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 38,
    borderRadius: 20,
    backgroundColor: colors.surfaceBtn,
    borderWidth: 1,
    borderColor: colors.surfaceBtnBorder,
    marginBottom: spacing.lg,
  },
  newChatIcon: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '600',
  },
  newChatText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  list: {
    flex: 1,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    marginBottom: 4,
  },
  convItemActive: {
    backgroundColor: colors.surfaceBtn,
    borderWidth: 1,
    borderColor: colors.surfaceBorderHover,
  },
  convIcon: {
    fontSize: 14,
  },
  convTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.surfaceBtn,
    borderWidth: 1,
    borderColor: colors.surfaceBtnBorder,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  userEmail: {
    color: colors.textMuted,
    fontSize: 11,
  },
  signOut: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  authRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  signInBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceBtn,
    borderWidth: 1,
    borderColor: colors.surfaceBtnBorder,
  },
  signInText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  signUpBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  signUpText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
