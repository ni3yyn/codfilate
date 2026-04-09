import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Platform, 
  View 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography, borderRadius, shadows, gradients } from '../../theme/theme';

/**
 * Smart FAB Component
 * - Mobile: Circular icon-only button
 * - Web: Pill-shaped button with Icon + Label
 */
export default function FAB({ 
  icon = 'add', 
  label = 'إضافة', 
  onPress, 
  variant = 'gradient',
  style,
  visible = true 
}) {
  const theme = useTheme();
  
  if (!visible) return null;

  const isWeb = Platform.OS === 'web';

  const renderContent = () => (
    <View style={[styles.content, isWeb && styles.contentWeb]}>
      <Ionicons name={icon} size={24} color="#FFFFFF" />
      {isWeb && (
        <Text style={styles.label}>{label}</Text>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        isWeb ? styles.containerWeb : styles.containerMobile,
        style
      ]}
    >
      {variant === 'gradient' ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient, 
            isWeb ? styles.pillRadius : styles.circleRadius,
            isWeb && styles.webShadow
          ]}
        >
          {renderContent()}
        </LinearGradient>
      ) : (
        <View style={[
          styles.solid, 
          { backgroundColor: theme.primary },
          isWeb ? styles.pillRadius : styles.circleRadius,
          isWeb && styles.webShadow
        ]}>
          {renderContent()}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    ...shadows.lg,
    zIndex: 999,
  },
  containerMobile: {
    width: 56,
    height: 56,
  },
  containerWeb: {
    height: 50,
    minWidth: 50,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        ':hover': {
          transform: 'scale(1.05)',
        }
      }
    })
  },
  webShadow: {
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }
    })
  },
  pillRadius: {
    borderRadius: 25,
  },
  circleRadius: {
    borderRadius: 28,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  solid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWeb: {
    paddingHorizontal: 4,
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: 'Tajawal_700Bold',
    fontSize: 14,
    marginTop: -2,
  }
});
