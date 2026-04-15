import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  BackHandler,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing, borderRadius } from '../../theme/theme';
import Button from './Button';

const { width } = Dimensions.get('window');

/**
 * A premium, cross-platform confirmation modal.
 */
export default function CustomAlert({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  type = 'default', // 'default' | 'destructive' | 'success'
}) {
  const theme = useTheme();
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [slideAnim] = React.useState(new Animated.Value(20));

  const [showModal, setShowModal] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (showModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  // Explicit Hardware Back Button Handler
  React.useEffect(() => {
    if (!showModal) return;
    
    const onBackPress = () => {
      if (onCancel) onCancel();
      return true; // Prevent default navigation
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [visible, onCancel]);

  // Web Browser Back Button Handler
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !showModal || typeof window === 'undefined') return;

    window.history.pushState({ customModalOpen: true }, '');

    const onPopState = () => {
      if (onCancel) onCancel();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (window.history.state?.customModalOpen) {
        window.history.back();
      }
    };
  }, [showModal, onCancel]);

  if (!showModal) return null;

  const getIcon = () => {
    switch (type) {
      case 'destructive': return 'warning-outline';
      case 'success': return 'checkmark-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'destructive': return '#DC2626';
      case 'success': return theme.primary;
      default: return theme.primary;
    }
  };

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.card,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '15' }]}>
            <Ionicons name={getIcon()} size={32} color={getIconColor()} />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>

          <View style={styles.footer}>
            {!!cancelText && (
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.colors.border }]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <Button
              title={confirmText}
              onPress={onConfirm}
              variant={type === 'destructive' ? 'outline' : 'primary'}
              style={[
                styles.confirmBtn,
                type === 'destructive' && { borderColor: '#DC2626', backgroundColor: '#DC262610' }
              ]}
              textStyle={type === 'destructive' && { color: '#DC2626' }}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: Math.min(width - 40, 400),
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    ...typography.button,
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    marginVertical: 0,
  },
});
