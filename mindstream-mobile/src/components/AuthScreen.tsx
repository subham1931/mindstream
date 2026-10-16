import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  defaultSignUp?: boolean;
};

export default function AuthScreen({ visible, onClose, defaultSignUp = false }: Props) {
  const { signIn, signUp, signInWithOAuth } = useAuth();
  const [isSignUp, setIsSignUp] = useState(defaultSignUp);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    if (visible) setIsSignUp(defaultSignUp);
  }, [visible, defaultSignUp]);

  const handleOAuth = async () => {
    setError('');
    setOauthLoading(true);
    try {
      await signInWithOAuth('google');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google';
      if (message !== 'Sign in cancelled') {
        setError(message);
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setIsSignUp(false);
        setConfirmPassword('');
        setFullName('');
      } else {
        await signIn(email, password);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>{isSignUp ? 'Create account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Sign up to save your conversations' : 'Sign in to MindStream'}
          </Text>

          <Pressable
            style={[styles.oauthBtn, oauthLoading && styles.oauthBtnDisabled]}
            onPress={handleOAuth}
            disabled={loading || oauthLoading}
          >
            {oauthLoading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <AntDesign name="google" size={18} color="#4285F4" />
                <Text style={styles.oauthText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {isSignUp ? (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {isSignUp ? (
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={loading || oauthLoading}>
            {loading ? (
              <ActivityIndicator color="#2a2018" />
            ) : (
              <Text style={styles.submitText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
          >
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scroll: {
    padding: spacing.xl,
    paddingTop: 56,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: spacing.sm,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 22,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surfaceBtn,
    borderWidth: 1,
    borderColor: colors.surfaceBtnBorder,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: spacing.lg,
  },
  oauthBtnDisabled: {
    opacity: 0.7,
  },
  oauthText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  input: {
    backgroundColor: colors.surfaceBtn,
    borderWidth: 1,
    borderColor: colors.surfaceBtnBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md,
  },
  success: {
    color: colors.accent,
    marginBottom: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.accentPeach,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  submitText: {
    color: '#2a2018',
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
  },
});
