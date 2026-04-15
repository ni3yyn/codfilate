import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions,
  Animated,
  Easing,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { spacing, typography, borderRadius, shadows } from '../../theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Premium BottomSheet Component
 * - Pure React Native implementation
 * - Modern Animation: Fade overlay + Sliding sheet
 * - Opt-in internal ScrollView (defaults to true)
 */
export default function BottomSheet({ 
  visible, 
  onClose, 
  title, 
  subtitle,
  children,
  maxHeight,
  scrollable = true,
  sheetStyle,
  titleStyle,
  closeBtnStyle,
  closeIconColor,
}) {
  const theme = useTheme();
  const { isWide, height: windowHeight } = useResponsive();
  
  const [showModal, setShowModal] = useState(visible);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible, fadeAnim, slideAnim]);

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
  useEffect(() => {
    if (Platform.OS !== 'web' || !showModal || typeof window === 'undefined') return;

    window.history.pushState({ customModalOpen: true }, '');

    const onPopState = () => {
      if (latestOnClose.current) latestOnClose.current();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (window.history.state?.customModalOpen) {
        window.history.back();
      }
    };
  }, [showModal]);

  const finalMaxHeight = maxHeight || windowHeight * 0.85;
  const isCentered = Platform.OS === 'web' && isWide;

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isCentered && styles.overlayCentered]}>
        
        {/* Backdrop Overlay - Click to close */}
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.backdrop} 
          onPress={onClose}
        >
          <Animated.View style={[
            StyleSheet.absoluteFill, 
            { 
              backgroundColor: '#000', 
              opacity: Animated.multiply(fadeAnim, theme.isDark ? 0.65 : 0.45) 
            }
          ]} />
        </TouchableOpacity>

        {/* Sliding Sheet */}
        <Animated.View style={[
          styles.animWrapper,
          { transform: [{ translateY: isCentered ? 0 : slideAnim }] }
        ]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={[
              styles.sheetWrapper, 
              { maxHeight: finalMaxHeight },
              isCentered && styles.sheetWrapperCentered
            ]}
          >
            <View style={[
              styles.sheetContainer, 
              { backgroundColor: theme.colors.surface },
              sheetStyle,
              isCentered && styles.sheetContainerCentered
            ]}>
              
              {/* Grabber Handle - Only on Mobile */}
              {!isCentered && (
                <View style={styles.handleContainer}>
                  <View style={[styles.handle, { backgroundColor: theme.colors.textTertiary + '40' }]} />
                </View>
              )}

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleGroup}>
                  <Text style={[styles.title, { color: theme.colors.text }, titleStyle]}>{title}</Text>
                  {subtitle && (
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                      {subtitle}
                    </Text>
                  )}
                </View>
                <TouchableOpacity 
                  onPress={onClose} 
                  style={[styles.closeBtn, { backgroundColor: theme.colors.surface2 }, closeBtnStyle]}
                >
                  <Ionicons name="close" size={20} color={closeIconColor || theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Content Area */}
              {scrollable ? (
                <ScrollView 
                  showsVerticalScrollIndicator={Platform.OS === 'web'}
                  contentContainerStyle={styles.content}
                  style={styles.scrollView}
                  bounces={false}
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={styles.contentNoScroll}>
                  {children}
                </View>
              )}

            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  animWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  sheetWrapper: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 600, 
  },
  sheetWrapperCentered: {
    maxWidth: 800,
    width: '90%',
  },
  sheetContainer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
    overflow: 'hidden',
    flexShrink: 1,
    ...Platform.select({
      default: shadows.md
    })
  },
  sheetContainerCentered: {
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleGroup: {
    flex: 1,
    marginEnd: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'right',
  },
  scrollView: {
    flexShrink: 1,
    flexGrow: 0,
  },
  contentNoScroll: {
    flexShrink: 1,
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
