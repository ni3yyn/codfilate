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
  Pressable,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

  // Explicit Hardware Back Button Handler
  React.useEffect(() => {
    if (!visible) return;
    
    const onBackPress = () => {
      if (onClose) onClose();
      return true; // Prevent default (navigation)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [visible, onClose]);

  // Web Browser Back Button Handler
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof window === 'undefined') return;

    window.history.pushState({ customModalOpen: true }, '');

    const onPopState = () => {
      if (onClose) onClose();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (window.history.state?.customModalOpen) {
        window.history.back();
      }
    };
  }, [visible, onClose]);

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
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          )}
        </Pressable>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
