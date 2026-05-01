import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  BackHandler,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
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
  const screenHeight = Dimensions.get('window').height;

  const [showModal, setShowModal] = React.useState(visible);

  const translateY = useSharedValue(screenHeight);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      setShowModal(true);
      translateY.value = withSpring(0, { damping: 30, stiffness: 300, mass: 0.8 });
      opacity.value = withTiming(1, { duration: 200 });
    } else if (showModal) {
      translateY.value = withSpring(screenHeight, { damping: 30, stiffness: 300, mass: 0.8 });
      opacity.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) {
          runOnJS(setShowModal)(false);
        }
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
  const modalId = React.useRef('alert_' + Math.random().toString(36).substr(2, 9)).current;

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !showModal || typeof window === 'undefined') return;

    window.history.pushState({ modalId }, '');

    const onPopState = (e) => {
      // Only close if our specific modal state was popped
      if (e.state?.modalId !== modalId) {
        if (onCancel) onCancel();
      }
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (window.history.state?.modalId === modalId) {
        window.history.back();
      }
    };
  }, [showModal, onCancel]);

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const alertStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

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
      <Animated.View style={[styles.overlay, { backgroundColor: theme.colors.overlay }, overlayStyle]}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
            alertStyle,
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
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    width: Math.min(width - 40, 420),
    borderRadius: 32,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
      }
    })
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontSize: 22,
    fontFamily: 'Tajawal_700Bold',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
    opacity: 0.8,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    ...typography.button,
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    marginVertical: 0,
    borderRadius: 16,
  },
});
