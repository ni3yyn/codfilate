import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal as RNModal, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography, borderRadius, shadows } from '../../theme/theme';

/**
 * Premium Modal Component
 * - Centered for Web/Desktop
 * - Support for Blur backdrop
 * - Clean, modern design
 */
export default function Modal({ 
  visible, 
  onClose, 
  title, 
  subtitle,
  children,
  maxWidth = 600
}) {
  const theme = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable 
          style={styles.backdrop} 
          onPress={onClose}
        >
          {theme.isDark ? (
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          )}
        </Pressable>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalWrapper, { maxWidth }]}
        >
          <View style={[
            styles.modalContainer, 
            { backgroundColor: theme.colors.surface }
          ]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleGroup}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                {subtitle && (
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    {subtitle}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={onClose} 
                style={[styles.closeBtn, { backgroundColor: theme.colors.surface2 }]}
              >
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Content Area */}
            <View style={styles.content}>
              {children}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalWrapper: {
    width: '100%',
    alignSelf: 'center',
  },
  modalContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      },
      default: shadows.lg
    })
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  titleGroup: {
    flex: 1,
    marginEnd: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'right',
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingTop: 0,
  },
});
