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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing } from '../../theme/theme';
import Button from './Button';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium Tokens matching Cinematic UI
const COLORS = {
  primary: '#2D6A4F',
  danger: '#EF4444',
  success: '#10B981',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#475569',
  border: 'rgba(15, 23, 42, 0.08)',
};

/**
 * A premium, cross-platform confirmation modal.
 * Engineered to guarantee slide-out animations complete before unmounting.
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

  const [showModal, setShowModal] = React.useState(visible);

  // Animation Values
  const translateY = useSharedValue(SCREEN_HEIGHT); // Start fully off-screen down
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      setShowModal(true);
      // Entrance: Snappy Spring
      translateY.value = withSpring(0, { damping: 25, stiffness: 350, mass: 0.8 });
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else if (showModal) {
      // If closed externally (e.g. timeout), slide down gracefully
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(setShowModal)(false);
        }
      });
    }
  }, [visible]);

  // ──── Guaranteed Animation Interceptor ────
  // This forces the slide-down animation to play completely BEFORE telling 
  // the parent to unmount or clear the alert state.
  const handleAction = (callback) => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300, easing: Easing.in(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(setShowModal)(false);
        if (callback) {
          runOnJS(callback)();
        }
      }
    });
  };

  // Explicit Hardware Back Button Handler
  React.useEffect(() => {
    if (!showModal) return;

    const onBackPress = () => {
      if (onCancel) handleAction(onCancel);
      return true; // Prevent default navigation
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [showModal, onCancel]);

  // Web Browser Back Button Handler
  const modalId = React.useRef('alert_' + Math.random().toString(36).substr(2, 9)).current;

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !showModal || typeof window === 'undefined') return;

    window.history.pushState({ modalId }, '');

    const onPopState = (e) => {
      // Only close if our specific modal state was popped
      if (e.state?.modalId !== modalId) {
        if (onCancel) handleAction(onCancel);
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
      case 'destructive': return 'warning';
      case 'success': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case 'destructive': return COLORS.danger;
      case 'success': return COLORS.success;
      default: return COLORS.primary;
    }
  };

  const accentColor = getAccentColor();

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none"
      onRequestClose={() => handleAction(onCancel)}
    >
      <Animated.View style={[styles.overlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15, 23, 42, 0.6)' }, overlayStyle]}>
        <Animated.View
          style={[
            styles.container,
            Platform.OS === 'web' && { className: 'glass-panel' },
            {
              backgroundColor: theme.isDark ? 'rgba(30, 41, 59, 0.95)' : COLORS.bgWhite,
              borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : COLORS.border,
            },
            alertStyle,
          ]}
        >
          {/* Animated Icon Pulse */}
          <View style={styles.iconWrapper}>
            <View style={[styles.iconPulse, { backgroundColor: accentColor + '15' }]} />
            <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name={getIcon()} size={36} color={accentColor} />
            </View>
          </View>

          <Text style={[styles.title, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>{message}</Text>

          <View style={styles.footer}>
            {/* Primary Action */}
            <Button
              title={confirmText}
              onPress={() => handleAction(onConfirm)} // Intercepted
              variant={type === 'destructive' ? 'danger' : 'primary'}
              style={[
                styles.confirmBtn,
                type === 'destructive' && { borderColor: COLORS.danger, backgroundColor: COLORS.danger }
              ]}
              textStyle={type === 'destructive' && { color: '#FFFFFF' }}
            />

            {/* Cancel Action */}
            {!!cancelText && (
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : COLORS.border, backgroundColor: theme.isDark ? '#1E293B' : '#F8F9FA' }]}
                onPress={() => handleAction(onCancel)} // Intercepted
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: theme.isDark ? '#CBD5E1' : COLORS.textMain }]}>{cancelText}</Text>
              </TouchableOpacity>
            )}
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
    borderRadius: 32, // Premium cinematic radius
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  iconWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  message: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row', // Maintained direction to respect native RTL flow
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    height: 56, // Tall, premium hit target
    marginVertical: 0,
    borderRadius: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
  },
});