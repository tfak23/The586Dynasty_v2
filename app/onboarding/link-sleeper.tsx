import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';

export default function LinkSleeperScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLink = async () => {
    if (!username.trim()) {
      setError('Please enter your Sleeper username');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // TODO: Call sleeper-link-account edge function
      // For now, navigate to select-league
      router.push('/onboarding/select-league' as never);
    } catch (err: any) {
      if (err.message?.includes('SLEEPER_USERNAME_TAKEN')) {
        setError('This Sleeper account is already linked to another user');
      } else if (err.message?.includes('SLEEPER_USER_NOT_FOUND')) {
        setError('Sleeper username not found. Please check and try again.');
      } else {
        setError(err.message || 'Failed to link account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="link" size={48} color={colors.primary} />
        <Text style={styles.title}>Link Sleeper Account</Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Each Sleeper account can only be linked to one app account
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Sleeper Username"
          placeholderTextColor={colors.textMuted}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLink}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Link Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>How to find your username:</Text>
          <Text style={styles.helpText}>1. Open the Sleeper app</Text>
          <Text style={styles.helpText}>2. Go to your profile</Text>
          <Text style={styles.helpText}>3. Your username is displayed under your name</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: { flex: 1, color: colors.info, fontSize: fontSize.sm },
  errorBox: {
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.md,
  },
  errorText: { color: colors.error, fontSize: fontSize.sm, textAlign: 'center' },
  input: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  helpBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    marginTop: spacing.xl,
  },
  helpTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs },
  helpText: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
});
