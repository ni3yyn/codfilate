import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationsStore } from '../../stores/useNotificationsStore';
import { isSafeDeeplink } from '../../lib/roleRouter';
import { typography, spacing, borderRadius, shadows } from '../../theme/theme';

export default function DesktopNotificationsPopover({ isVisible, onClose }) {
  const theme = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { items, fetchNotifications, markRead, markAllRead } = useNotificationsStore();

  const [showPopover, setShowPopover] = useState(isVisible);
  const opacity = useSharedValue(0);
  // Start slightly higher to create a "dropdown" slide effect
  const translateY = useSharedValue(-10);

  useEffect(() => {
    if (isVisible && profile?.user_id) {
      fetchNotifications(profile.user_id);
    }
  }, [isVisible, profile?.user_id]);

  useEffect(() => {
    if (isVisible) {
      setShowPopover(true);
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 25, stiffness: 300, mass: 0.8 });
    } else if (showPopover) {
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withSpring(-10, { damping: 25, stiffness: 300, mass: 0.8 }, (finished) => {
        if (finished) runOnJS(setShowPopover)(false);
      });
    }
  }, [isVisible]);

  // Hook placed BEFORE conditional return to satisfy Rules of Hooks
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!showPopover) return null;

  const handleMarkAll = async () => {
    if (profile?.user_id) {
      await markAllRead(profile.user_id);
    }
  };

  const getIconForNotification = (title = '') => {
    if (title.includes('طلب') || title.includes('طلبية')) return { name: 'cube', color: '#0984E3' };
    if (title.includes('دفع') || title.includes('سحب') || title.includes('رصيد')) return { name: 'wallet', color: '#00B894' };
    if (title.includes('حساب') || title.includes('تسجيل')) return { name: 'person', color: '#6C5CE7' };
    if (title.includes('منتج') || title.includes('مخزون')) return { name: 'layers', color: '#FDCB6E' };
    if (title.includes('رفض') || title.includes('ملغاة')) return { name: 'close-circle', color: '#D63031' };
    return { name: 'notifications', color: theme.primary };
  };

  const unreadCount = items.filter((i) => !i.read_at).length;
  // Show only top 10 items in popover
  const displayItems = items.slice(0, 10);

  return (
    <Animated.View style={[
      styles.container, 
      { 
        backgroundColor: theme.colors.card, 
        borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' 
      },
      animatedStyle
    ]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>الإشعارات</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.actionsRow}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAll} style={{ marginEnd: spacing.md }}>
              <Text style={[styles.markAllText, { color: theme.primary }]}>تحديد كمقروء</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => {
            onClose();
            router.push('/notifications');
          }}>
            <Text style={[styles.markAllText, { color: theme.colors.textSecondary }]}>عرض الكل</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {displayItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={32} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>لا توجد إشعارات حالياً</Text>
          </View>
        ) : (
          displayItems.map((item) => {
            const isUnread = !item.read_at;
            const iconInfo = getIconForNotification(item.title);

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.item,
                  { 
                    borderBottomColor: theme.colors.divider,
                    backgroundColor: isUnread ? theme.colors.surface : 'transparent'
                  }
                ]}
                onPress={async () => {
                  if (isUnread) await markRead(item.id, profile?.user_id);
                  onClose();
                  if (item.deeplink && isSafeDeeplink(item.deeplink)) {
                    router.push(item.deeplink);
                  }
                }}
              >
                <View style={[styles.iconBox, { backgroundColor: iconInfo.color + '15' }]}>
                  <Ionicons name={iconInfo.name} size={18} color={iconInfo.color} />
                </View>
                <View style={styles.itemContent}>
                  <View style={styles.itemTitleRow}>
                    <Text 
                      style={[
                        styles.itemTitle, 
                        { color: theme.colors.text, fontFamily: isUnread ? 'Tajawal_700Bold' : 'Tajawal_500Medium' }
                      ]} 
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {isUnread && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                  </View>
                  <Text style={[styles.itemBody, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                  {item.data?.order_id && (
                    <Text style={[styles.orderIdText, { color: theme.colors.textTertiary }]}>#{item.data.order_id}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 55, 
    left: 0, 
    width: 320,
    maxHeight: 450,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 9999, // Absolute top
    ...Platform.select({
      web: { 
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
        cursor: 'default',
      },
      default: shadows.lg
    }),
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: typography.md,
  },
  badge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Tajawal_700Bold',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllText: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: typography.sm,
  },
  scrollArea: {
    flexGrow: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontFamily: 'Tajawal_500Medium',
    fontSize: typography.sm,
  },
  item: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: typography.sm,
    flex: 1,
    // Native text alignment handles Arabic well automatically
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginStart: spacing.sm,
  },
  itemBody: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: typography.xs,
  },
  orderIdText: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 10,
    marginTop: 4,
  }
});
