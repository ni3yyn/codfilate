import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import Modal from './Modal';
import BottomSheet from './BottomSheet';
import { spacing } from '../../theme/theme';

/**
 * High-Fidelity Responsive Modal
 * - Desktop/Wide: Uses centered Modal with internal ScrollView
 * - Mobile/Small: Uses BottomSheet with native slide-up
 */
export default function ResponsiveModal({ 
  visible, 
  onClose, 
  title, 
  subtitle, 
  children, 
  maxWidth = 600,
  maxHeight,
  scrollable = true,
  ...props 
}) {
  const { isWide } = useResponsive();

  if (isWide) {
    return (
      <Modal
        visible={visible}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        maxWidth={maxWidth}
        {...props}
      >
        {scrollable ? (
          <ScrollView 
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.desktopContent}
            bounces={false}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </Modal>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxHeight={maxHeight}
      scrollable={scrollable}
      {...props}
    >
      {children}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  desktopContent: {
    paddingBottom: spacing.md,
  }
});
