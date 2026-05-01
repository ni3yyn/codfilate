import React, { useState, useEffect, useRef } from 'react';
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
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';
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
  const screenHeight = Dimensions.get('window').height;

  const [showModal, setShowModal] = useState(visible);
  
  const translateY = useSharedValue(screenHeight);
  const opacity = useSharedValue(0);

  useEffect(() => {
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
  useEffect(() => {
    if (!showModal) return;
    
    const onBackPress = () => {
      if (onClose) onClose();
      return true; // Prevent default (navigation)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [showModal, onClose]);

  const latestOnClose = useRef(onClose);
  useEffect(() => {
    latestOnClose.current = onClose;
  }, [onClose]);

  // Web Browser Back Button Handler
  const modalId = useRef('modal_' + Math.random().toString(36).substr(2, 9)).current;

  useEffect(() => {
    if (Platform.OS !== 'web' || !showModal || typeof window === 'undefined') return;

    window.history.pushState({ modalId }, '');

    const onPopState = (e) => {
      // Only close if our specific modal state was popped
      if (e.state?.modalId !== modalId) {
        if (latestOnClose.current) latestOnClose.current();
      }
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (window.history.state?.modalId === modalId) {
        window.history.back();
      }
    };
  }, [showModal]);

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const modalStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value, // Slight fade alongside slide for the modal box
    };
  });

  if (!showModal) return null;

  return (
    <RNModal
      visible={showModal}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
          <Pressable 
            style={styles.backdrop} 
            onPress={onClose}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }]} />
          </Pressable>
        </Animated.View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalWrapper, { maxWidth }]}
        >
          <Animated.View style={[
            styles.modalContainer, 
            { backgroundColor: theme.colors.surface },
            modalStyle
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
          </Animated.View>
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
    padding: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalWrapper: {
    width: '100%',
    alignSelf: 'center',
  },
  modalContainer: {
    borderRadius: 32, // Premium large radius
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      default: shadows.lg
    })
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  titleGroup: {
    flex: 1,
    marginEnd: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'right',
    fontSize: 24,
    fontFamily: 'Tajawal_700Bold',
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 4,
    opacity: 0.8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
  },
});
