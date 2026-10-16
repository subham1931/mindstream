import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Model } from '../types';
import { colors, spacing } from '../theme';

type Props = {
  models: Model[];
  selectedModel: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

export default function ModelPicker({ models, selectedModel, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const label = models.find((m) => m.id === selectedModel)?.label || 'Select model';

  return (
    <>
      <Pressable
        style={[styles.trigger, disabled && styles.disabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text style={styles.triggerIcon}>⚡</Text>
        <Text style={styles.triggerLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Select model</Text>
            <ScrollView style={styles.menuScroll}>
              {models.map((model) => (
                <Pressable
                  key={model.id}
                  style={[styles.item, model.id === selectedModel && styles.itemActive]}
                  onPress={() => {
                    onSelect(model.id);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[styles.itemText, model.id === selectedModel && styles.itemTextActive]}
                  >
                    {model.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    flexShrink: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceBtn,
    borderWidth: 1,
    borderColor: colors.surfaceBtnBorder,
  },
  disabled: {
    opacity: 0.5,
  },
  triggerIcon: {
    fontSize: 12,
  },
  triggerLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: colors.surfaceBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '60%',
  },
  menuTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  menuScroll: {
    paddingHorizontal: spacing.md,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
  },
  itemActive: {
    backgroundColor: colors.surfaceBtn,
  },
  itemText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  itemTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
