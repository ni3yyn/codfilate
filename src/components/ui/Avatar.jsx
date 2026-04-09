import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { gradients } from '../../theme/theme';
import { getInitials } from '../../lib/utils';

export default function Avatar({
  name,
  imageUrl,
  size = 40,
  style,
  showRing = false,
  ringColor,
  statusDot, // 'online' | 'offline' | null
}) {
  const theme = useTheme();
  const ringSize = size + 6;
  const dotSize = Math.max(10, size * 0.24);

  const content = imageUrl ? (
    <Image
      source={{ uri: imageUrl }}
      style={[
        styles.image,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    />
  ) : (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.primary + '20',
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            color: theme.primary,
            fontSize: size * 0.36,
            fontFamily: 'Tajawal_700Bold',
          },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );

  const wrappedContent = showRing ? (
    <LinearGradient
      colors={ringColor ? [ringColor, ringColor + '80'] : gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.ring,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
        },
      ]}
    >
      {content}
    </LinearGradient>
  ) : (
    content
  );

  return (
    <View style={[styles.container, style]}>
      {wrappedContent}
      {statusDot && (
        <View
          style={[
            styles.statusDotOuter,
            {
              width: dotSize + 3,
              height: dotSize + 3,
              borderRadius: (dotSize + 3) / 2,
              backgroundColor: theme.colors.card,
              bottom: 0,
              right: showRing ? 1 : -1,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor:
                  statusDot === 'online' ? '#00B894' : '#9CA3AF',
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  statusDotOuter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {},
});
