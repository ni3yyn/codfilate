import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Animated } from 'react-native';
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
 * Universal premium header with Glassmorphism support.
 * @param {string} title - Main page title
 * @param {string} subtitle - Optional secondary text
 * @param {React.ReactNode} rightAction - Custom components for the left/right side (depending on RTL)
 * @param {boolean} showSearch - Whether to show the search icon
 * @param {Function} onSearchPress - Handler for search icon press
 * @param {boolean} showAvatar - Whether to show user avatar/profile info
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
  const slideAnim = React.useRef(new Animated.Value(8)).current;

  React.useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(8);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [title]);

  // Identity Role formatting
  const getRoleLabel = (role) => {
    switch (role) {
      case 'developer': return 'المطوّر';
      case 'admin': return 'مدير النظام';
      case 'merchant': return 'تاجر';
      case 'affiliate': return 'مسوق';
      case 'regional_manager': return 'مدير إقليمي';
      case 'delivery': return 'توصيل';
      default: return 'مستخدم';
    }
  };

  return (
    <LinearGradient 
      colors={[theme.primary, theme.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container, 
        { 
          borderBottomLeftRadius: borderRadius.xl,
          borderBottomRightRadius: borderRadius.xl,
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
            
            {/* Identity Group (Avatar + Name) */}
            {showAvatar ? (
              <View style={styles.identityGroup}>
                <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                   {profile?.avatar_url ? (
                     <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                   ) : (
                     <Ionicons name="person" size={18} color="#FFFFFF" />
                   )}
                </View>
                <View style={styles.identityText}>
                  <Text style={[styles.userName, { color: '#FFFFFF' }]} numberOfLines={1}>
                    {profile?.full_name || 'مستخدم جديد'}
                  </Text>
                  <Text style={[styles.userRole, { color: 'rgba(255,255,255,0.8)' }]}>
                    {getRoleLabel(profile?.role)}
                  </Text>
                </View>
              </View>
            ) : (
              <Animated.View style={[styles.titleOnly, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <Text style={[styles.mainTitle, { color: '#FFFFFF' }]}>{title}</Text>
                {subtitle && <Text style={[styles.mainSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>{subtitle}</Text>}
              </Animated.View>
            )}

            {/* Actions Group */}
            <View style={styles.actionsGroup}>
              {showSearch && (
                <TouchableOpacity 
                  onPress={onSearchPress}
                  style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                >
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <View style={{ zIndex: 2000 }}>
                <TouchableOpacity 
                  style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
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
                    <View style={[styles.notifBadge, { backgroundColor: theme.error }]} />
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

          {/* Contextual Title or Action Hint */}
          {((showAvatar && title) || actionHint) ? (
            <Animated.View style={[styles.pageTitleRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
               {title && <Text style={[styles.h1, { color: '#FFFFFF' }]}>{title}</Text>}
               {subtitle && <Text style={[styles.hSub, { color: 'rgba(255,255,255,0.7)' }]}>{subtitle}</Text>}
               
               {actionHint && (
                 <View style={styles.hintContainer}>
                    <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.hintText}>{actionHint}</Text>
                 </View>
               )}
            </Animated.View>
          ) : null}

          {children}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 8 },
      web: { position: 'sticky', top: 0, zIndex: 100 }
    }),
  },
  safeArea: {},
  inner: {
    paddingVertical: spacing.sm,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
    zIndex: 100, // Significantly higher than page content
  },
  identityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  identityText: {
    alignItems: 'flex-start',
  },
  userName: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  userRole: {
    ...typography.small,
    fontSize: 10,
    marginTop: -2,
    fontFamily: 'Tajawal_700Bold',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
    elevation: 4, // Added for Android
  },
  titleOnly: {
    alignItems: 'flex-start',
  },
  mainTitle: {
    ...typography.h3,
  },
  mainSubtitle: {
    ...typography.caption,
    fontSize: 12,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitleRow: {
    marginTop: spacing.xs,
    alignItems: 'flex-start',
    zIndex: 1,
  },
  h1: {
    ...typography.h3,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  hSub: {
    ...typography.caption,
    fontSize: 13,
    marginTop: -2,
    textAlign: 'right',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hintText: {
    ...typography.small,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Tajawal_700Bold',
  },
});
