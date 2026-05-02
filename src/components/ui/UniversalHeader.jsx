import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationsStore } from '../../stores/useNotificationsStore';
import DesktopNotificationsPopover from './DesktopNotificationsPopover';
import { typography, spacing, borderRadius } from '../../theme/theme';

/**
 * Premium Marquee Text Component
 * Automatically detects if text overflows the container and smoothly scrolls it (ping-pong style).
 */
const MarqueeText = ({ text, style }) => {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [textWidth, setTextWidth] = React.useState(0);
  const translateX = React.useRef(new Animated.Value(0)).current;
  const GAP = 30; // space between the two copies

  React.useEffect(() => {
    let animRef;
    if (textWidth > containerWidth && containerWidth > 0) {
      const distance = textWidth + GAP;
      const duration = (distance / 30) * 1000; // Dynamic speed based on length

      const runAnimation = () => {
        translateX.setValue(0);
        animRef = Animated.timing(translateX, {
          toValue: distance, // Pan Right for RTL overflow
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        });
        animRef.start(({ finished }) => {
          if (finished) runAnimation();
        });
      };

      const delayTimeout = setTimeout(() => {
        runAnimation();
      }, 1000);

      return () => {
        clearTimeout(delayTimeout);
        if (animRef) animRef.stop();
        translateX.setValue(0);
      };
    } else {
      translateX.setValue(0);
    }
  }, [textWidth, containerWidth, text]);

  const isOverflowing = textWidth > containerWidth && containerWidth > 0;

  return (
    <View
      style={{ width: '100%', overflow: 'hidden', flexDirection: 'row-reverse', justifyContent: isOverflowing ? 'flex-start' : 'center', alignItems: 'center', position: 'relative' }}
      onLayout={(e) => setContainerWidth(Math.round(e.nativeEvent.layout.width))}
    >
      {/* Hidden placeholder to force container height when absolute */}
      {isOverflowing && (
        <Text style={[style, { opacity: 0 }]} pointerEvents="none" numberOfLines={1}>
          {text}
        </Text>
      )}

      <Animated.View style={{ 
        flexDirection: 'row-reverse', 
        alignItems: 'center',
        ...(isOverflowing ? { position: 'absolute', right: 0 } : {}),
        transform: [{ translateX }] 
      }}>
        <Text
          onLayout={(e) => setTextWidth(Math.round(e.nativeEvent.layout.width))}
          style={[style, Platform.OS === 'web' && { whiteSpace: 'nowrap' }]}
          numberOfLines={isOverflowing ? 1 : undefined}
        >
          {text}
        </Text>

        {isOverflowing && (
          <>
            <View style={{ width: GAP }} />
            <Text
              style={[style, Platform.OS === 'web' && { whiteSpace: 'nowrap' }]}
              numberOfLines={1}
            >
              {text}
            </Text>
          </>
        )}
      </Animated.View>
    </View>
  );
};

/**
 * Universal premium header with Glassmorphism support.
 * Upgraded with centered titles, smart marquee scrolling, and cinematic spatial layout.
 * 
 * @param {string} title - Main page title (Absolutely centered, auto-scrolls if long)
 * @param {string} subtitle - Optional secondary text (Auto-scrolls if long)
 * @param {React.ReactNode} rightAction - Custom components for the left/right side
 * @param {boolean} showSearch - Whether to show the search icon
 * @param {Function} onSearchPress - Handler for search icon press
 * @param {boolean} showAvatar - Whether to show user avatar
 */
export default function UniversalHeader({
  title,
  subtitle,
  rightAction,
  showSearch = false,
  onSearchPress,
  showAvatar = true,
  actionHint, // Text string like "أضف منتج من الزر بالأسفل"
  children
}) {
  const theme = useTheme();
  const router = useRouter();
  const { isWide, maxContentWidth, contentPadding } = useResponsive();
  const profile = useAuthStore(s => s.profile);
  const unreadCount = useNotificationsStore(s => s.unreadCount);
  const subscribeToNotifications = useNotificationsStore(s => s.subscribeToNotifications);
  const fetchNotifications = useNotificationsStore(s => s.fetchNotifications);

  React.useEffect(() => {
    if (profile?.user_id) {
      console.log('[Realtime] Subscribing for user:', profile.user_id);

      const showBrowserNotification = (notif) => {
        if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(notif.title || 'تنبيه جديد', {
            body: notif.message,
            icon: '/favicon.png', // Fallback to favicon
          });
        }
      };

      const unsubscribe = subscribeToNotifications(profile.user_id, (payload) => {
        console.log('[Realtime] New notification received:', payload);
        if (payload.new) {
          showBrowserNotification(payload.new);
        }
        fetchNotifications(); // Refresh the list
      });
      return () => unsubscribe();
    }
  }, [profile?.user_id]);

  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  // Shake animation for unread notifications
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (unreadCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
          Animated.delay(1500), // Pause between shakes
        ])
      ).start();
    } else {
      shakeAnim.setValue(0);
    }
  }, [unreadCount]);

  // Entrance animation for title
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(6)).current; // Reduced travel distance for snappier feel

  React.useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(6);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 60,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [title]);

  // Extract first name for a cleaner "Welcome" message
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'مستخدم';

  return (
    <LinearGradient
      colors={[theme.primary, theme.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          borderBottomLeftRadius: 24, // Premium soft radius
          borderBottomRightRadius: 24,
          shadowColor: theme.primaryDark,
        }
      ]}
    >
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={[
          styles.inner,
          isWide && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' },
          { paddingHorizontal: isWide ? contentPadding : spacing.md }
        ]}>
          <View style={styles.contentRow}>

            {/* ABSOLUTE CENTERED TITLE with Smart Marquee Scrolling */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.absoluteCenter,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}
              pointerEvents="none"
            >
              {title && <MarqueeText text={title} style={styles.centerTitle} />}
              {subtitle && <MarqueeText text={subtitle} style={styles.centerSubtitle} />}
            </Animated.View>

            {/* LEFT SIDE: Identity Group (Avatar + Conditional Welcome Text) */}
            <View style={styles.identityGroup}>
              {showAvatar && (
                <>
                  <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                    ) : (
                      <Ionicons name="person" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  {/* Only show welcome text on tablet/desktop to save space on mobile */}
                  {isWide && (
                    <Text style={styles.welcomeText} numberOfLines={1}>
                      مرحباً، {firstName}
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* RIGHT SIDE: Actions Group */}
            <View style={styles.actionsGroup}>
              {showSearch && (
                <TouchableOpacity
                  onPress={onSearchPress}
                  style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                >
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <View style={{ zIndex: 2000 }}>
                <TouchableOpacity
                  style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (isWide) {
                      setIsNotificationsOpen(!isNotificationsOpen);
                    } else {
                      router.push('/notifications');
                    }
                  }}
                >
                  <Animated.View style={{
                    transform: [{
                      rotate: shakeAnim.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ['-15deg', '15deg']
                      })
                    }]
                  }}>
                    <Ionicons
                      name={unreadCount > 0 ? "notifications" : "notifications-outline"}
                      size={20}
                      color="#FFFFFF"
                    />
                  </Animated.View>
                  {unreadCount > 0 && (
                    <View style={[styles.notifBadge, { backgroundColor: '#EF4444' }]} />
                  )}
                </TouchableOpacity>
                {isWide && (
                  <DesktopNotificationsPopover
                    isVisible={isNotificationsOpen}
                    onClose={() => setIsNotificationsOpen(false)}
                  />
                )}
              </View>
              {rightAction}
            </View>

          </View>

          {/* Optional Action Hint underneath (only shows if passed) */}
          {actionHint && (
            <Animated.View style={[styles.hintContainer, { opacity: fadeAnim }]}>
              <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.hintText}>{actionHint}</Text>
            </Animated.View>
          )}

          {children}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 6, // Reduced height for leaner header
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { position: 'sticky', top: 0, zIndex: 100 }
    }),
  },
  safeArea: {},
  inner: {
    paddingVertical: 8, // Tighter padding for height reduction
  },
  contentRow: {
    flexDirection: 'row', // Maintained direction as requested
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40, // Reduced from 44 to 40
    zIndex: 100,
    position: 'relative', // Allows the absolute title to anchor correctly
  },

  // Absolute Centered Title Logic
  absoluteCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Below the Left/Right actions so it doesn't block taps
    paddingHorizontal: 80, // Forces constraints so it won't touch side icons
    top: 6, // Pushes title to the bottom a little bit
  },
  centerTitle: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 28,
    paddingTop: 6,
    paddingBottom: 0,
  },
  centerSubtitle: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 18,
    paddingTop: 4,
    paddingBottom: 10,
  },
  // Identity Group (Left Side)
  identityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10, // Ensure it's clickable above the absolute title
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  welcomeText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Actions Group (Right Side)
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10, // Ensure it's clickable above the absolute title
  },
  actionIcon: {
    width: 36, // Slightly smaller for height reduction
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
    elevation: 4,
  },

  // Contextual Action Hint
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', // Centered for balance
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hintText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
  },
});