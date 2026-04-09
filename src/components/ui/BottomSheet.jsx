import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { spacing, typography, borderRadius, shadows } from '../../theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Premium BottomSheet Component
 * - Pure React Native implementation (Zero Config)
 * - Support for Blur backdrop
 * - Internal ScrollView for long forms
 */
export default function BottomSheet({ 
  visible, 
  onClose, 
  title, 
  subtitle,
  children,
  maxHeight
}) {
  const theme = useTheme();
  const { isWide, height: windowHeight } = useResponsive();
  
  const finalMaxHeight = maxHeight || windowHeight * 0.85;
  const isCentered = Platform.OS === 'web' && isWide;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isCentered && styles.overlayCentered]}>
        {/* Backdrop - Click to close */}
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.backdrop} 
          onPress={onClose}
        >
          {theme.isDark ? (
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
          )}
        </TouchableOpacity>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            <ScrollView 
              showsVerticalScrollIndicator={Platform.OS === 'web'}
              contentContainerStyle={styles.content}
              style={styles.scrollView}
              bounces={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
      },
      default: shadows.md
    })
  },
  sheetContainerCentered: {
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
      }
    })
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
