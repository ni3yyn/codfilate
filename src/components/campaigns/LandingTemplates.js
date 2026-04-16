import {
    View, Text, StyleSheet, TouchableOpacity, Animated, Easing, useWindowDimensions, Platform, ScrollView, TextInput, ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { formatCurrency } from '../../lib/utils';
import { DELIVERY_TYPES_AR } from '../../lib/constants';
import { useRef, useEffect, useState } from 'react';

const AnimatedExpoImage = Animated.createAnimatedComponent(Image);


// ==========================================
// ADVANCED ANIMATION & LAYOUT WRAPPERS
// ==========================================
const FadeInUp = ({ children, delay = 0, style, distance = 40 }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            delay,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic)
        }).start();
    }, []);
    return (
        <Animated.View style={[style, {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }]
        }]}>
            {children}
        </Animated.View>
    );
};

const FloatingElement = ({ children, delay = 0, duration = 4000, distance = 15, style }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        setTimeout(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: 1, duration: duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
                ])
            ).start();
        }, delay);
    }, []);
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });
    return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
};

const RotatingElement = ({ children, duration = 15000, reverse = false, style }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.timing(anim, { toValue: 1, duration: duration, easing: Easing.linear, useNativeDriver: true })
        ).start();
    }, []);
    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', reverse ? '-360deg' : '360deg'] });
    return <Animated.View style={[style, { transform: [{ rotate }] }]}>{children}</Animated.View>;
};

const Pulse = ({ children, style, minScale = 1, maxScale = 1.05, duration = 1500 }) => {
    const anim = useRef(new Animated.Value(minScale)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: maxScale, duration, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(anim, { toValue: minScale, duration, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        ).start();
    }, []);
    return <Animated.View style={[style, { transform: [{ scale: anim }] }]}>{children}</Animated.View>;
};

// ==========================================
// GEOMETRIC & DECORATIVE SHAPES
// ==========================================
const OutlinedHalfCircle = ({ color, size, style, position }) => (
    <View style={[{ width: size, height: size / 2, borderTopLeftRadius: size, borderTopRightRadius: size, borderWidth: 2, borderBottomWidth: 0, borderColor: color, position: 'absolute', opacity: 0.3 }, position, style]} />
);

const AbstractBlob = ({ color, size, style, position }) => (
    <RotatingElement duration={20000} style={[{ width: size, height: size * 0.9, borderRadius: size / 2, backgroundColor: color, position: 'absolute', opacity: 0.15, transform: [{ scaleX: 1.1 }, { skewY: '15deg' }] }, position, style]} />
);

const DottedGrid = ({ color, rows = 3, cols = 6, spacing = 20, style, position }) => (
    <View style={[{ flexDirection: 'row', position: 'absolute', opacity: 0.4 }, position, style]}>
        {Array.from({ length: cols }).map((_, c) => (
            <View key={c} style={{ marginLeft: c === 0 ? 0 : spacing }}>
                {Array.from({ length: rows }).map((_, r) => (
                    <View key={r} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginBottom: spacing }} />
                ))}
            </View>
        ))}
    </View>
);

const DiagonalStripes = ({ color, width = 200, height = 200, style, position }) => (
    <View style={[{ width, height, position: 'absolute', opacity: 0.1, overflow: 'hidden' }, position, style]}>
        {Array.from({ length: 15 }).map((_, i) => (
            <View key={i} style={{ width: '150%', height: 4, backgroundColor: color, marginBottom: 12, transform: [{ rotate: '-45deg' }, { translateX: -50 }, { translateY: i * 5 }] }} />
        ))}
    </View>
);

// ==========================================
// ENHANCED CAROUSEL WITH THUMBNAILS & GESTURES
// ==========================================
export const EnhancedImageCarousel = ({
    images,
    height = 400,
    borderRadius = 20,
    style,
    showThumbnails = true,
    autoplay = false,
    autoplayInterval = 4000,
    showArrows = true,
    showCounter = true
}) => {
    const { width } = useWindowDimensions();
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const autoplayTimer = useRef(null);

    if (!images || images.length === 0) return null;

    // Single image - simple display
    if (images.length === 1) {
        return (
            <View style={[{ width: '100%', height, borderRadius, overflow: 'hidden' }, style]}>
                <Image source={{ uri: images[0] }} style={styles.imgFill} contentFit="cover" transition={200} />
            </View>
        );
    }

    // Autoplay logic
    useEffect(() => {
        if (autoplay && images.length > 1) {
            autoplayTimer.current = setInterval(() => {
                const nextIndex = (currentIndex + 1) % images.length;
                flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                setCurrentIndex(nextIndex);
            }, autoplayInterval);
        }
        return () => {
            if (autoplayTimer.current) clearInterval(autoplayTimer.current);
        };
    }, [autoplay, currentIndex, images.length, autoplayInterval]);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
            useNativeDriver: false,
            listener: (event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                const index = Math.round(offsetX / width);
                if (index !== currentIndex) {
                    setCurrentIndex(index);
                }
            }
        }
    );

    const scrollToIndex = (index) => {
        flatListRef.current?.scrollToIndex({ index, animated: true });
        setCurrentIndex(index);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePrev = () => {
        const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
        scrollToIndex(prevIndex);
    };

    const handleNext = () => {
        const nextIndex = (currentIndex + 1) % images.length;
        scrollToIndex(nextIndex);
    };

    return (
        <View style={[{ width: '100%' }, style]}>
            {/* Main Carousel */}
            <View style={{ width: '100%', height, borderRadius, overflow: 'hidden', position: 'relative' }}>
                <Animated.FlatList
                    ref={flatListRef}
                    data={images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    keyExtractor={(_, i) => i.toString()}
                    renderItem={({ item }) => (
                        <View style={{ width, height }}>
                            <Image source={{ uri: item }} style={styles.imgFill} contentFit="cover" transition={200} />
                        </View>
                    )}
                    getItemLayout={(_, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                />

                {/* Image Counter Badge */}
                {showCounter && (
                    <View style={styles.counterBadge}>
                        <Text style={styles.counterText}>
                            {currentIndex + 1} / {images.length}
                        </Text>
                    </View>
                )}

                {/* Gradient Overlays for better arrow visibility */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.15, y: 0 }}
                    style={[styles.gradientOverlay, { left: 0 }]}
                    pointerEvents="none"
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                    start={{ x: 0.85, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradientOverlay, { right: 0 }]}
                    pointerEvents="none"
                />
            </View>

            {/* Pagination Dots */}
            <View style={styles.paginationContainer}>
                <View style={styles.paginationDotsRow}>
                    {images.map((_, i) => {
                        const widthAnim = scrollX.interpolate({
                            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                            outputRange: [8, 28, 8],
                            extrapolate: 'clamp'
                        });
                        const opacity = scrollX.interpolate({
                            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                            outputRange: [0.4, 1, 0.4],
                            extrapolate: 'clamp'
                        });
                        const backgroundColor = scrollX.interpolate({
                            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                            outputRange: ['#FFFFFF80', '#FFFFFF', '#FFFFFF80'],
                            extrapolate: 'clamp'
                        });

                        return (
                            <TouchableOpacity key={i} onPress={() => scrollToIndex(i)} activeOpacity={0.7}>
                                <Animated.View
                                    style={[
                                        styles.carouselDot,
                                        {
                                            width: widthAnim,
                                            opacity,
                                            backgroundColor,
                                        }
                                    ]}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Thumbnail Strip (Optional) */}
            {showThumbnails && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.thumbnailContainer}
                    style={{ marginTop: 12 }}
                >
                    {images.map((img, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => scrollToIndex(i)}
                            activeOpacity={0.8}
                            style={[
                                styles.thumbnailWrapper,
                                currentIndex === i && styles.thumbnailActive
                            ]}
                        >
                            <Image
                                source={{ uri: img }}
                                style={styles.thumbnail}
                                contentFit="cover"
                                transition={200}
                            />
                            {currentIndex === i && (
                                <View style={styles.thumbnailOverlay}>
                                    <View style={styles.thumbnailActiveIndicator} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* Navigation Arrows */}
            {showArrows && images.length > 1 && (
                <>
                    <TouchableOpacity
                        style={[styles.navArrow, styles.leftArrow]}
                        onPress={handlePrev}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.navArrow, styles.rightArrow]}
                        onPress={handleNext}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-forward" size={22} color="#FFF" />
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
};

// Simple Image Gallery (Fallback/Alternative)
export const SimpleImageGallery = ({ images, height = 400, borderRadius = 20, style }) => {
    const { width } = useWindowDimensions();
    const [activeIndex, setActiveIndex] = useState(0);

    if (!images || images.length === 0) return null;

    if (images.length === 1) {
        return (
            <View style={[{ width: '100%', height, borderRadius, overflow: 'hidden' }, style]}>
                <Image source={{ uri: images[0] }} style={styles.imgFill} contentFit="cover" transition={200} />
            </View>
        );
    }

    return (
        <View style={[{ width: '100%', height }, style]}>
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                    const offset = e.nativeEvent.contentOffset.x;
                    setActiveIndex(Math.round(offset / width));
                }}
                scrollEventThrottle={16}
            >
                {images.map((img, i) => (
                    <View key={i} style={{ width, height }}>
                        <Image source={{ uri: img }} style={[styles.imgFill, { borderRadius }]} contentFit="cover" transition={200} />
                    </View>
                ))}
            </ScrollView>

            {/* Dots Indicator */}
            <View style={styles.simpleDotsContainer}>
                {images.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.simpleDot,
                            {
                                backgroundColor: i === activeIndex ? '#FFF' : '#FFFFFF60',
                                width: i === activeIndex ? 24 : 8
                            }
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

// Modern Image Gallery (Uses Enhanced Carousel)
export const ModernImageGallery = ({ images, height = 400, borderRadius = 20, style }) => {
    return (
        <EnhancedImageCarousel
            images={images}
            height={height}
            borderRadius={borderRadius}
            style={style}
            showThumbnails={true}
            autoplay={false}
            showArrows={true}
            showCounter={true}
        />
    );
};

// ==========================================
// ADVANCED SHIMMER BUTTON
// ==========================================
export const ShimmerButton = ({ onPress, title, style, textStyle, colors, icon, shadowColor }) => {
    const { width } = useWindowDimensions();
    const shimmerAnim = useRef(new Animated.Value(-1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmerAnim, { toValue: 2, duration: 2500, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: false })
        ).start();
    }, []);

    const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

    const translateX = shimmerAnim.interpolate({ inputRange: [-1, 2], outputRange: [-width, width * 2] });

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%', alignItems: 'center' }}>
            <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1} style={{ width: '100%' }}>
                <View style={[styles.shimmerContainer, style, { shadowColor: shadowColor || colors[0] }]}>
                    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                    <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, width: '40%' }} />
                    </Animated.View>
                    <View style={styles.shimmerContent}>
                        <Text style={[styles.shimmerText, textStyle]}>{title}</Text>
                        {icon && <Ionicons name={icon} size={24} color={textStyle?.color || '#FFF'} />}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ==========================================
// UNIFIED CHECKOUT FORM (Perfectly Integrated)
// ==========================================
export const FORM_THEMES = {
    artisan: { bg: ['#FFFFFF', '#FDFBF7'], text: '#2f2f2d', sub: '#5c5b59', border: '#e6d9c8', input: '#F5F2EC', primary: '#a63400', button: ['#a63400', '#ff7948'], radius: 20 },
    supreme: { bg: ['#FFFFFF', '#FFFFFF'], text: '#111827', sub: '#6B7280', border: '#E5E7EB', input: '#F9FAFB', primary: '#000000', button: ['#000000', '#374151'], radius: 16 },
    cyber: { bg: ['#0f0f19', '#05050a'], text: '#FFFFFF', sub: '#9CA3AF', border: '#00e6cc', input: '#1a1a2b', primary: '#00E6CC', button: ['#00E6CC', '#007BFF'], radius: 12 },
    elegance: { bg: ['#ffffff', '#faf7f2'], text: '#1F2937', sub: '#6B7280', border: '#d4af37', input: '#fdfbf7', primary: '#D4AF37', button: ['#D4AF37', '#FBBF24'], radius: 0 },
    beast: { bg: ['#111827', '#050505'], text: '#FFFFFF', sub: '#9CA3AF', border: '#ff3b30', input: '#1a1a2b', primary: '#FFD60A', button: ['#FF3B30', '#FF4500'], radius: 16 },
    trend: { bg: ['#FAFAFA', '#FFFFFF'], text: '#000000', sub: '#666666', border: '#000000', input: '#FFFFFF', primary: '#000000', button: ['#000000', '#222222'], radius: 0 },
    aura: { bg: ['#fff5f5', '#FFFFFF'], text: '#4A3B3B', sub: '#8A7B7B', border: '#ffb6c1', input: '#ffffff', primary: '#D88A8A', button: ['#D88A8A', '#F2B5B5'], radius: 30 },
    kicks: { bg: ['#0F0F11', '#1A1A1E'], text: '#FFFFFF', sub: '#A0A0A5', border: '#29292D', input: '#141417', primary: '#2D5CFF', button: ['#2D5CFF', '#0033E6'], radius: 12 },
    homefix: { bg: ['#FFFFFF', '#F0F4F8'], text: '#102A43', sub: '#486581', border: '#D9E2EC', input: '#FFFFFF', primary: '#0F609B', button: ['#0F609B', '#186FAF'], radius: 16 },
    candy: { bg: ['#FFF0F5', '#FFE4E1'], text: '#800080', sub: '#BA55D3', border: '#FFB6C1', input: '#FFFFFF', primary: '#FF69B4', button: ['#FF69B4', '#FF1493'], radius: 40 },
    active: { bg: ['#121212', '#1E1E1E'], text: '#FFFFFF', sub: '#888888', border: '#333333', input: '#000000', primary: '#CCFF00', button: ['#CCFF00', '#99CC00'], radius: 8 },
    crave: { bg: ['#FFF8F0', '#FFFFFF'], text: '#5C2C06', sub: '#A86A32', border: '#e65100', input: '#FFFFFF', primary: '#E65100', button: ['#E65100', '#FF8F00'], radius: 24 },
    lumber: { bg: ['#F5F5F0', '#EAEADF'], text: '#3E362E', sub: '#736B60', border: '#6b5e51', input: '#FFFFFF', primary: '#5C6B52', button: ['#5C6B52', '#869D7A'], radius: 8 },
    nexus: { bg: ['#0a192f', '#020c1b'], text: '#CCD6F6', sub: '#8892B0', border: '#64ffda', input: '#112240', primary: '#64FFDA', button: ['#64FFDA', '#00BFFF'], radius: 12 },
};

// ==========================================
// MODERN 2026 CHECKOUT FORM (Transparent Inputs with Animated Bottom Border)
// ==========================================

// Custom Input Component with Animated Bottom Border
const ModernInput = ({ label, placeholder, value, onChangeText, keyboardType, multiline, themeColors, isLast, error }) => {
    const [isFocused, setIsFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;
    const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(borderAnim, {
            toValue: isFocused ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
        }).start();

        Animated.timing(labelAnim, {
            toValue: (isFocused || value) ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isFocused, value]);

    const borderBottomWidth = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2]
    });

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [error ? '#FF3B30' : themeColors.border, error ? '#FF3B30' : themeColors.primary]
    });

    const labelTop = labelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, -10]
    });

    const labelFontSize = labelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [16, 12]
    });

    const labelColor = labelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [error ? '#FF3B30' : themeColors.sub, error ? '#FF3B30' : themeColors.primary]
    });

    const AnimatedTextInput = useRef(Animated.createAnimatedComponent(TextInput)).current;

    return (
        <View style={{ marginBottom: isLast ? 0 : 24, position: 'relative' }}>
            <Animated.Text
                style={[{
                    position: 'absolute',
                    top: labelTop,
                    right: 4,
                    fontSize: labelFontSize,
                    color: labelColor,
                    fontFamily: 'Tajawal_500Medium',
                    zIndex: 1,
                    backgroundColor: 'transparent',
                    paddingHorizontal: 4,
                    textAlign: 'right',
                    writingDirection: 'rtl'
                }]}
            >
                {label}
            </Animated.Text>
            <AnimatedTextInput
                style={[{
                    borderBottomWidth: borderBottomWidth,
                    borderBottomColor: borderColor,
                    paddingVertical: 16,
                    paddingHorizontal: 4,
                    fontSize: 16,
                    fontFamily: 'Tajawal_500Medium',
                    color: themeColors.text,
                    backgroundColor: 'transparent',
                    textAlign: 'right',
                    writingDirection: 'rtl'
                }, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder={isFocused ? placeholder : ''}
                placeholderTextColor={themeColors.sub + '80'}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                multiline={multiline}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            />
        </View>
    );
};

// Custom Picker with Animated Border
const ModernPicker = ({ label, value, onPress, themeColors, selectedValue, error }) => {
    const [isFocused, setIsFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(borderAnim, {
            toValue: isFocused ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
    }, [isFocused]);

    const borderBottomWidth = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2]
    });

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [error ? '#FF3B30' : themeColors.border, error ? '#FF3B30' : themeColors.primary]
    });

    return (
        <View style={{ marginBottom: 24, position: 'relative' }}>
            <Animated.Text
                style={[{
                    position: 'absolute',
                    top: -10,
                    right: 4,
                    fontSize: 12,
                    color: error ? '#FF3B30' : (isFocused ? themeColors.primary : themeColors.sub),
                    fontFamily: 'Tajawal_500Medium',
                    zIndex: 1,
                    backgroundColor: 'transparent',
                    paddingHorizontal: 4,
                    textAlign: 'right',
                    writingDirection: 'rtl'
                }]}
            >
                {label}
            </Animated.Text>
            <TouchableOpacity
                onPress={() => {
                    setIsFocused(true);
                    onPress();
                }}
                onBlur={() => setIsFocused(false)}
            >
                <Animated.View style={[{
                    borderBottomWidth,
                    borderBottomColor: borderColor,
                    paddingVertical: 16,
                    paddingHorizontal: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }]}>
                    <Ionicons name="chevron-down" size={20} color={themeColors.sub} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[{
                            fontSize: 16,
                            fontFamily: 'Tajawal_500Medium',
                            color: selectedValue ? themeColors.text : themeColors.sub,
                            textAlign: 'right',
                            writingDirection: 'rtl'
                        }]}>
                            {selectedValue || "اختر الولاية"}
                        </Text>
                        <Ionicons name="location-outline" size={20} color={error ? '#FF3B30' : (isFocused ? themeColors.primary : themeColors.sub)} />
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

// Delivery Type Selector
const ModernDeliverySelector = ({ deliveryType, setDeliveryType, themeColors }) => {
    const [activeType, setActiveType] = useState(deliveryType);

    const handlePress = (type) => {
        setActiveType(type);
        setDeliveryType(type);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
        <View style={{ marginBottom: 24 }}>
            <Text style={[{
                fontSize: 12,
                fontFamily: 'Tajawal_500Medium',
                color: themeColors.sub,
                marginBottom: 12,
                textAlign: 'right',
                writingDirection: 'rtl'
            }]}>
                طريقة التوصيل
            </Text>
            <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
                {[
                    { id: 'home', label: 'توصيل للمنزل', icon: 'home-outline' },
                    { id: 'office', label: 'استلام من مكتب', icon: 'business-outline' }
                ].map((type) => {
                    const isActive = activeType === type.id;
                    return (
                        <TouchableOpacity
                            key={type.id}
                            onPress={() => handlePress(type.id)}
                            style={[{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: isActive ? themeColors.primary : themeColors.border,
                                backgroundColor: isActive ? themeColors.primary + '10' : 'transparent',
                            }]}
                        >
                            <Ionicons
                                name={type.icon}
                                size={20}
                                color={isActive ? themeColors.primary : themeColors.sub}
                            />
                            <Text style={[{
                                fontSize: 14,
                                fontFamily: 'Tajawal_600SemiBold',
                                color: isActive ? themeColors.primary : themeColors.sub,
                            }]}>
                                {type.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// Animated Total Card
const AnimatedTotalCard = ({ total, deliveryFee, campaign, themeColors, selectedWilaya }) => {
    return (
        <View style={[{
            marginTop: 24,
            marginBottom: 32,
            padding: 24,
            borderRadius: 20,
            backgroundColor: themeColors.input,
            borderWidth: 1,
            borderColor: themeColors.border,
        }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontFamily: 'Tajawal_700Bold', color: themeColors.text, writingDirection: 'rtl' }}>{formatCurrency(campaign?.sale_price || 0)}</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Tajawal_500Medium', color: themeColors.sub, writingDirection: 'rtl' }}>سعر المنتج</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontFamily: 'Tajawal_700Bold', color: themeColors.text, writingDirection: 'rtl' }}>
                    {selectedWilaya ? formatCurrency(deliveryFee) : 'حسب الولاية'}
                </Text>
                <Text style={{ fontSize: 14, fontFamily: 'Tajawal_500Medium', color: themeColors.sub, writingDirection: 'rtl' }}>رسوم التوصيل</Text>
            </View>
            <View style={{ height: 1, backgroundColor: themeColors.border, marginVertical: 8, opacity: 0.5 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 22, fontFamily: 'Tajawal_800ExtraBold', color: themeColors.primary, writingDirection: 'rtl' }}>
                    {selectedWilaya ? formatCurrency(total) : formatCurrency(campaign?.sale_price || 0)}
                </Text>
                <Text style={{ fontSize: 16, fontFamily: 'Tajawal_700Bold', color: themeColors.sub, writingDirection: 'rtl' }}>المبلغ الإجمالي</Text>
            </View>
        </View>
    );
};

// Enhanced Submit Button with Ripple Effect
const AnimatedSubmitButton = ({ onPress, title, loading, themeColors }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            friction: 5,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
        }).start();
    };

    useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(opacityAnim, {
                        toValue: 0.5,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            opacityAnim.setValue(1);
        }
    }, [loading]);

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
                disabled={loading}
                style={[{
                    backgroundColor: themeColors.primary,
                    borderRadius: 16,
                    paddingVertical: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 12,
                    shadowColor: themeColors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                }]}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" />
                        <Text style={{ fontSize: 18, fontFamily: 'Tajawal_800ExtraBold', color: '#FFF' }}>{title}</Text>
                    </>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

// Modern Header with Animation
const ModernFormHeader = ({ themeColors }) => {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 8,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={[{
            alignItems: 'center',
            marginBottom: 40,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
        }]}>
            <View style={[{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: themeColors.primary + '15',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
            }]}>
                <Ionicons name="bag-check-outline" size={40} color={themeColors.primary} />
            </View>
            <Text style={[{
                fontSize: 28,
                fontFamily: 'Tajawal_800ExtraBold',
                color: themeColors.text,
                marginBottom: 8,
                textAlign: 'center',
            }]}>
                أكمل طلبك
            </Text>
            <Text style={[{
                fontSize: 14,
                fontFamily: 'Tajawal_500Medium',
                color: themeColors.sub,
                textAlign: 'center',
            }]}>
                الدفع عند الاستلام • توصيل سريع لجميع الولايات
            </Text>
        </Animated.View>
    );
};

// ==========================================
// UPDATED UniversalCheckoutForm
// ==========================================
export const UniversalCheckoutForm = ({ theme, form, setForm, selectedWilaya, setWilayaModal, deliveryType, setDeliveryType, submit, submitting, total, campaign, deliveryFee, styleMode = 'artisan', isPreview = false }) => {
    const activeTheme = FORM_THEMES[styleMode] || FORM_THEMES.artisan;

    const themeColors = {
        text: activeTheme.text,
        sub: activeTheme.sub,
        border: activeTheme.border,
        primary: activeTheme.primary,
        input: activeTheme.input,
        button: activeTheme.button,
    };

    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!form.name || form.name.length < 3) newErrors.name = true;
        if (!form.phone || form.phone.length < 10) newErrors.phone = true;
        if (!selectedWilaya) newErrors.wilaya = true;
        if (!form.commune || form.commune.length < 3) newErrors.commune = true;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (isPreview) return;
        if (!validate()) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        submit();
    };

    return (
        <View style={[styles.formWrapper, { marginBottom: 40 }]}>
            <ModernFormHeader themeColors={themeColors} />

            <View style={{ paddingHorizontal: 4 }}>
                <ModernInput
                    label="الاسم الكامل"
                    placeholder="أدخل اسمك الثلاثي"
                    value={form.name}
                    onChangeText={(t) => {
                        setForm({ ...form, name: t });
                        if (errors.name) setErrors({ ...errors, name: false });
                    }}
                    themeColors={themeColors}
                    error={errors.name}
                />

                <ModernInput
                    label="رقم الهاتف"
                    placeholder="05XXXXXXXX"
                    value={form.phone}
                    onChangeText={(t) => {
                        setForm({ ...form, phone: t });
                        if (errors.phone) setErrors({ ...errors, phone: false });
                    }}
                    keyboardType="phone-pad"
                    themeColors={themeColors}
                    error={errors.phone}
                />

                <ModernPicker
                    label="الولاية"
                    value={selectedWilaya ? `${selectedWilaya.code} - ${selectedWilaya.name}` : null}
                    selectedValue={selectedWilaya ? `${selectedWilaya.code} - ${selectedWilaya.name}` : null}
                    onPress={() => {
                        setWilayaModal(true);
                        if (errors.wilaya) setErrors({ ...errors, wilaya: false });
                    }}
                    themeColors={themeColors}
                    error={errors.wilaya}
                />

                <ModernInput
                    label="البلدية"
                    placeholder="أدخل اسم البلدية"
                    value={form.commune}
                    onChangeText={(t) => {
                        setForm({ ...form, commune: t });
                        if (errors.commune) setErrors({ ...errors, commune: false });
                    }}
                    themeColors={themeColors}
                    error={errors.commune}
                />

                <ModernInput
                    label="العنوان التفصيلي"
                    placeholder="رقم المنزل، الحي، الشارع..."
                    value={form.address}
                    onChangeText={(t) => setForm({ ...form, address: t })}
                    multiline
                    themeColors={themeColors}
                />

                <ModernDeliverySelector
                    deliveryType={deliveryType}
                    setDeliveryType={setDeliveryType}
                    themeColors={themeColors}
                />

                <ModernInput
                    label="ملاحظات (اختياري)"
                    placeholder="أي تفاصيل أخرى لطلبك..."
                    value={form.notes}
                    onChangeText={(t) => setForm({ ...form, notes: t })}
                    multiline
                    themeColors={themeColors}
                    isLast
                />

                <AnimatedTotalCard
                    total={total}
                    deliveryFee={deliveryFee}
                    campaign={campaign}
                    themeColors={themeColors}
                    selectedWilaya={selectedWilaya}
                />

                <AnimatedSubmitButton
                    onPress={handleSubmit}
                    title={submitting ? "جاري المعالجة..." : "تأكيد الطلب"}
                    loading={submitting}
                    themeColors={themeColors}
                />

                <Text style={[{
                    textAlign: 'center',
                    fontSize: 12,
                    fontFamily: 'Tajawal_500Medium',
                    color: themeColors.sub,
                    marginTop: 16,
                }]}>
                    بالضغط على تأكيد الطلب أنت توافق على {''}
                    <Text style={{ color: themeColors.primary }}>شروط الخدمة</Text> و {''}
                    <Text style={{ color: themeColors.primary }}>سياسة الخصوصية</Text>
                </Text>
            </View>
        </View>
    );
};

// ==========================================
// TESTIMONIALS DATA & HELPERS
// ==========================================
const TESTIMONIALS = [
    { name: 'أمين م.', role: 'مشتري مؤكد', text: 'الجودة فاقت كل توقعاتي. المنتج مطابق تماماً للوصف والصور. أنصح به بشدة.' },
    { name: 'سارة ي.', role: 'مشتري مؤكد', text: 'خدمة التوصيل كانت سريعة جداً. التغليف ممتاز والمنتج رائع. شكراً لكم.' },
    { name: 'خالد ب.', role: 'مشتري مؤكد', text: 'تجربة تسوق ممتازة، خدمة عملاء راقية ومنتج ذو جودة عالية. سأقوم بالشراء مرة أخرى.' }
];

const resolveFeatures = (customFeatures, defaultFeatures) => {
    return defaultFeatures.map((def, i) => ({
        ...def,
        title: customFeatures?.[i]?.title || def.title,
        desc: customFeatures?.[i]?.desc || def.desc
    }));
};

// ==========================================
// TEMPLATE 1: ARTISAN (Crafts/General)
// ==========================================
export const ArtisanTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const parallaxY = scrollY.interpolate({ inputRange: [0, 1000], outputRange: [0, -100] });

    const features = resolveFeatures(config.features, [
        { icon: 'star', color: '#a63400', bg: 'rgba(166,52,0,0.1)', title: 'جودة استثنائية', desc: 'مصنعة من أجود المواد لضمان المتانة والراحة.' },
        { icon: 'shield-checkmark', color: '#00656f', bg: 'rgba(0,101,111,0.1)', title: 'ضمان الرضا', desc: 'نضمن لك استرجاع أو استبدال المنتج بسهولة.' },
        { icon: 'flash', color: '#7b5400', bg: 'rgba(123,84,0,0.1)', title: 'توصيل سريع', desc: 'شحن آمن وسريع لجميع الولايات مع الدفع عند الاستلام.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#f9f6f3' }}>
            <AbstractBlob color="#a63400" size={500} position={{ top: -100, right: -150 }} />
            <OutlinedHalfCircle color="#00656f" size={300} position={{ bottom: 200, left: -50, transform: [{ rotate: '90deg' }] }} />
            <DottedGrid color="#7b5400" rows={4} cols={8} position={{ top: 300, left: 40 }} />

            <Animated.ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={[styles.maxContainer, { zIndex: 10 }]}>
                    <View style={[styles.heroBlock, isMobile ? { flexDirection: 'column-reverse', marginTop: 40 } : { flexDirection: 'row-reverse', marginTop: 100, alignItems: 'center' }]}>
                        <View style={[styles.heroTextContent, isMobile && { alignItems: 'center', marginTop: 30 }]}>
                            <FadeInUp delay={100}><View style={[styles.badge, { backgroundColor: '#ff7948' }]}><Text style={styles.badgeText}>عرض محدود</Text></View></FadeInUp>
                            <FadeInUp delay={200}><Text style={[styles.headline, { color: '#2f2f2d' }, isMobile && { textAlign: 'center', fontSize: 44 }]}>{config.headline || "أناقة تعيد تعريف المعايير."}</Text></FadeInUp>
                            <FadeInUp delay={300}><Text style={[styles.subheadline, { color: '#5c5b59' }, isMobile && { textAlign: 'center' }]}>{config.subheadline || "مزيج يجمع بين الروح العصرية والأصالة التراثية."}</Text></FadeInUp>
                            <FadeInUp delay={400} style={[styles.heroButtonsRow, isMobile && { justifyContent: 'center' }]}>
                                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#a63400', shadowColor: '#a63400' }]} onPress={scrollToForm}><Text style={styles.primaryBtnText}>{config.btnText || "اطلب الآن"}</Text><Ionicons name="cart" size={20} color="#FFF" /></TouchableOpacity>
                                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#a63400' }]} onPress={scrollToFeatures}><Text style={[styles.secondaryBtnText, { color: '#a63400' }]}>اكتشف المزيد</Text></TouchableOpacity>
                            </FadeInUp>
                        </View>
                        <FadeInUp delay={200} style={[styles.heroImgWrap, isMobile && { width: '100%' }]}>
                            <Animated.View style={{ transform: [{ translateY: parallaxY }] }}>
                                {images.length > 1 ? (
                                    <EnhancedImageCarousel images={images} height={isMobile ? 350 : 500} borderRadius={50} style={{ transform: [{ rotate: '3deg' }] }} />
                                ) : (
                                    <FloatingElement delay={0} duration={5000} distance={20}>
                                        <View style={[styles.heroImgInner, { borderRadius: 50, transform: [{ rotate: '3deg' }] }]}>
                                            <Image source={{ uri: images[0] }} style={styles.imgFill} contentFit="cover" transition={200} />
                                        </View>
                                    </FloatingElement>
                                )}
                                <View style={[styles.blob, { backgroundColor: '#00656f', bottom: -30, left: -30, width: 250, height: 250 }]} />
                            </Animated.View>
                        </FadeInUp>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: 'transparent' }]}>
                        <Text style={[styles.sectionTitle, { color: '#2f2f2d', marginBottom: 20 }]}>مميزات المنتج</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={200 + (i * 100)} distance={30} style={[styles.featureCard, { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 30, elevation: 10 }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: f.bg }]}><Ionicons name={f.icon} size={30} color={f.color} /></View>
                                    <Text style={[styles.featureTitle, { color: '#2f2f2d' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#5c5b59' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.testimonialsSection, { backgroundColor: '#2f2f2d', borderRadius: 40, marginHorizontal: isMobile ? 16 : 0, paddingVertical: 60, marginTop: 40 }]}>
                        <Text style={[styles.sectionTitle, { color: '#f9f6f3' }]}>آراء عملائنا</Text>
                        <View style={[styles.divider, { backgroundColor: '#a63400' }]} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testimonialsScroll}>
                            {TESTIMONIALS.map((t, i) => (
                                <View key={i} style={[styles.testimonialCard, { backgroundColor: '#3a3a38', width: isMobile ? width * 0.75 : 380, marginLeft: 24 }]}>
                                    <MaterialCommunityIcons name="format-quote-open" size={40} color="#ff7948" style={{ position: 'absolute', top: -20, right: 30, opacity: 0.8 }} />
                                    <Text style={[styles.testimonialText, { color: '#f9f6f3' }]}>"{t.text}"</Text>
                                    <View style={styles.testimonialAuthorRow}>
                                        <View style={[styles.avatar, { backgroundColor: '#eae8e4' }]}><Ionicons name="person" size={20} color="#9e9d9a" /></View>
                                        <View><Text style={[styles.authorName, { color: '#f9f6f3' }]}>{t.name}</Text><Text style={[styles.authorRole, { color: '#9e9d9a' }]}>{t.role}</Text></View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 80, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="artisan" /></View>
                </View>
            </Animated.ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 2: SUPREME (Minimal/Clean)
// ==========================================
export const SupremeTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const scaleImg = scrollY.interpolate({ inputRange: [0, 500], outputRange: [1, 1.1], extrapolate: 'clamp' });

    const features = resolveFeatures(config.features, [
        { icon: 'layers', color: '#111827', bg: '#F3F4F6', title: 'خامات فائقة', desc: 'دقة لا متناهية في اختيار أفضل المواد.' },
        { icon: 'shield-checkmark', color: '#111827', bg: '#F3F4F6', title: 'موثوقية تامة', desc: 'ضمان كامل على جميع المنتجات.' },
        { icon: 'rocket', color: '#111827', bg: '#F3F4F6', title: 'سرعة التنفيذ', desc: 'يصلك طلبك في وقت قياسي.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View style={{ position: 'absolute', top: 150, left: -200, width: 600, height: 600, borderRadius: 300, borderWidth: 1, borderColor: '#F3F4F6' }} />
            <View style={{ position: 'absolute', top: 50, right: -100, width: 400, height: 400, borderRadius: 200, borderWidth: 1, borderColor: '#F3F4F6' }} />

            <Animated.ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={[styles.heroBlock, { flexDirection: 'column', marginTop: 80, alignItems: 'center' }]}>
                        <FadeInUp delay={100}><Text style={[styles.headline, { color: '#111827', textAlign: 'center', fontSize: isMobile ? 48 : 72, letterSpacing: -2 }]}>{config.headline || "الابتكار كما لم تعهده."}</Text></FadeInUp>
                        <FadeInUp delay={200}><Text style={[styles.subheadline, { color: '#6B7280', textAlign: 'center', maxWidth: 700, fontSize: isMobile ? 18 : 22 }]}>{config.subheadline || "تصميم ثوري يجمع بين الأداء والجماليات."}</Text></FadeInUp>
                        <FadeInUp delay={300} style={[styles.heroButtonsRow, { justifyContent: 'center', marginTop: 20 }]}>
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#000000', borderRadius: 100, paddingHorizontal: 40 }]} onPress={scrollToForm}><Text style={[styles.primaryBtnText, { color: '#FFF' }]}>{config.btnText || "شراء الآن"}</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#E5E7EB', borderRadius: 100, paddingHorizontal: 40 }]} onPress={scrollToFeatures}><Text style={[styles.secondaryBtnText, { color: '#374151' }]}>المواصفات</Text></TouchableOpacity>
                        </FadeInUp>
                        <FadeInUp delay={400} style={{ width: '100%', maxWidth: 900, aspectRatio: 16 / 9, marginTop: 60, borderRadius: 40, overflow: 'hidden', backgroundColor: '#F9FAFB', elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 40 }}>
                            {images.length > 1 ? (
                                <EnhancedImageCarousel images={images} height="100%" borderRadius={0} showThumbnails={false} />
                            ) : (
                                <AnimatedExpoImage source={{ uri: images[0] }} style={[styles.imgFill, { transform: [{ scale: scaleImg }] }]} contentFit="cover" transition={200} />
                            )}
                        </FadeInUp>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: '#FFFFFF', marginTop: 60 }]}>
                        <Text style={[styles.sectionTitle, { color: '#111827', marginBottom: 20 }]}>المميزات</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={i * 150} distance={20} style={[styles.featureCard, { backgroundColor: '#F9FAFB', borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6' }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: f.bg }]}><Ionicons name={f.icon} size={28} color={f.color} /></View>
                                    <Text style={[styles.featureTitle, { color: '#111827' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#6B7280' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.testimonialsSection, { backgroundColor: '#FFFFFF', alignItems: 'center' }]}>
                        <Text style={[styles.sectionTitle, { color: '#111827' }]}>مراجعات العملاء</Text>
                        <View style={[styles.divider, { backgroundColor: '#000' }]} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testimonialsScroll}>
                            {TESTIMONIALS.map((t, i) => (
                                <View key={i} style={[styles.testimonialCard, { backgroundColor: '#FFF', width: isMobile ? width * 0.8 : 400, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 24, marginHorizontal: 12 }]}>
                                    <Text style={[styles.testimonialText, { color: '#374151', fontSize: 20, lineHeight: 32 }]}>"{t.text}"</Text>
                                    <View style={styles.testimonialAuthorRow}>
                                        <View style={[styles.avatar, { backgroundColor: '#F3F4F6' }]}><Ionicons name="person" size={20} color="#9CA3AF" /></View>
                                        <View><Text style={[styles.authorName, { color: '#111827' }]}>{t.name}</Text></View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 80, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="supreme" /></View>
                </View>
            </Animated.ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 3: CYBER (Dark/Gamer Tech)
// ==========================================
export const CyberTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const features = resolveFeatures(config.features, [
        { icon: 'hardware-chip', color: '#00E6CC', title: 'أداء خارق', desc: 'مصمم لتحمل أقسى الظروف.' },
        { icon: 'shield-half', color: '#00E6CC', title: 'حماية متقدمة', desc: 'تشفير وضمان كامل لكل قطعة.' },
        { icon: 'flash', color: '#00E6CC', title: 'استجابة فورية', desc: 'توصيل سريع كسرعة الضوء.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#09090E' }}>
            <View style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]}>
                {Array.from({ length: 20 }).map((_, i) => <View key={`h-${i}`} style={{ height: 1, backgroundColor: '#00E6CC', width: '100%', position: 'absolute', top: i * 50 }} />)}
                {Array.from({ length: 10 }).map((_, i) => <View key={`v-${i}`} style={{ width: 1, backgroundColor: '#00E6CC', height: '100%', position: 'absolute', left: i * 100 }} />)}
            </View>
            <Image source={{ uri: campaign.products?.image_url }} style={StyleSheet.absoluteFillObject} blurRadius={100} opacity={0.15} contentFit="cover" transition={200} />

            <Animated.ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={[styles.heroBlock, { flexDirection: 'column', marginTop: 80, alignItems: 'center' }]}>
                        <FadeInUp delay={100}><Text style={{ color: '#00E6CC', fontFamily: 'Courier', fontSize: 16, letterSpacing: 6, marginBottom: 16, backgroundColor: 'rgba(0,230,204,0.1)', paddingHorizontal: 20, paddingVertical: 5, borderRadius: 4 }}>/// SYSTEM_OVERRIDE</Text></FadeInUp>
                        <FadeInUp delay={200}><Text style={[styles.headline, { color: '#FFF', textAlign: 'center', fontSize: isMobile ? 44 : 64, textShadowColor: '#FF0055', textShadowRadius: 15 }]}>{config.headline || "تجاوز الواقع المألوف."}</Text></FadeInUp>
                        <FadeInUp delay={300}><Text style={[styles.subheadline, { color: '#9CA3AF', textAlign: 'center', maxWidth: 600, fontSize: 18 }]}>{config.subheadline || "مستوى جديد من التكنولوجيا والأداء."}</Text></FadeInUp>
                        <FadeInUp delay={400} style={[styles.heroButtonsRow, { justifyContent: 'center', marginTop: 30 }]}>
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#00E6CC', borderRadius: 8, paddingHorizontal: 40, shadowColor: '#00E6CC', shadowOpacity: 0.6, shadowRadius: 20, elevation: 15 }]} onPress={scrollToForm}><Text style={[styles.primaryBtnText, { color: '#000', fontFamily: 'Courier' }]}>{config.btnText || "INITIALIZE_ORDER"}</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#FF0055', borderWidth: 2, borderRadius: 8, paddingHorizontal: 40 }]} onPress={scrollToFeatures}><Text style={[styles.secondaryBtnText, { color: '#FF0055', fontFamily: 'Courier' }]}>DATA_LOGS</Text></TouchableOpacity>
                        </FadeInUp>
                        <FloatingElement delay={500} duration={3000} distance={10} style={{ width: '100%', maxWidth: 700, aspectRatio: 16 / 10, marginTop: 60, zIndex: 10 }}>
                            <View style={{ flex: 1, borderRadius: 20, borderWidth: 2, borderColor: '#00E6CC', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.5)', shadowColor: '#00E6CC', shadowOpacity: 0.5, shadowRadius: 30, elevation: 20 }}>
                                {images.length > 1 ? (
                                    <EnhancedImageCarousel images={images} height="100%" borderRadius={0} showThumbnails={false} showArrows={true} />
                                ) : (
                                    <Image source={{ uri: images[0] }} style={[styles.imgFill, { opacity: 0.9 }]} contentFit="cover" transition={200} />
                                )}
                                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,230,204,0.1)' }]} />
                            </View>
                        </FloatingElement>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: 'transparent', marginTop: 40 }]}>
                        <Text style={[styles.sectionTitle, { color: '#00E6CC', fontFamily: 'Courier', textAlign: 'center', marginBottom: 20 }]}>[ SYSTEM_SPECS ]</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={i * 150} distance={40} style={[styles.featureCard, { backgroundColor: 'rgba(15,15,25,0.8)', borderColor: 'rgba(0,230,204,0.3)', borderWidth: 1, borderRadius: 16, borderTopWidth: 4, borderTopColor: '#00E6CC' }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: 'rgba(0,230,204,0.1)' }]}><Ionicons name={f.icon} size={30} color={f.color} /></View>
                                    <Text style={[styles.featureTitle, { color: '#FFF', fontFamily: 'Courier' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#9CA3AF' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.testimonialsSection, { backgroundColor: 'rgba(15,15,25,0.9)', borderRadius: 20, marginHorizontal: 16, paddingVertical: 60, borderWidth: 1, borderColor: '#FF0055' }]}>
                        <Text style={[styles.sectionTitle, { color: '#00E6CC', fontFamily: 'Courier', letterSpacing: 2 }]}>[ USERS_FEEDBACK ]</Text>
                        <View style={[styles.divider, { backgroundColor: '#FF0055' }]} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testimonialsScroll}>
                            {TESTIMONIALS.map((t, i) => (
                                <View key={i} style={[styles.testimonialCard, { backgroundColor: 'rgba(5,5,10,0.9)', width: isMobile ? width * 0.8 : 380, borderLeftWidth: 4, borderColor: '#FF0055', marginLeft: 20 }]}>
                                    <Text style={[styles.testimonialText, { color: '#FFF', fontFamily: 'Courier' }]}>"{t.text}"</Text>
                                    <View style={styles.testimonialAuthorRow}>
                                        <View style={[styles.avatar, { backgroundColor: '#000', borderWidth: 1, borderColor: '#00E6CC' }]}><Ionicons name="person" size={20} color="#00E6CC" /></View>
                                        <View><Text style={[styles.authorName, { color: '#00E6CC', fontFamily: 'Courier' }]}>{t.name}</Text></View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 80, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="cyber" /></View>
                </View>
            </Animated.ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 4: ELEGANCE (Cosmetics/Luxury)
// ==========================================
export const EleganceTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const parallaxTranslate = scrollY.interpolate({ inputRange: [0, 800], outputRange: [0, -80] });

    const features = resolveFeatures(config.features, [
        { icon: 'leaf', color: '#D4AF37', title: 'مكونات طبيعية', desc: 'نقاء الطبيعة في كل قطرة.' },
        { icon: 'sparkles', color: '#D4AF37', title: 'نتائج ساحرة', desc: 'تأثير يلاحظه الجميع فوراً.' },
        { icon: 'gift', color: '#D4AF37', title: 'تغليف فاخر', desc: 'هدية مثالية لك ولمن تحب.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#FAF7F2' }}>
            <RotatingElement duration={30000} style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: 250, borderWidth: 2, borderColor: 'rgba(212,175,55,0.1)', borderStyle: 'dashed' }} />
            <RotatingElement duration={40000} reverse style={{ position: 'absolute', top: 200, left: -150, width: 400, height: 400, borderRadius: 200, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' }} />

            <Animated.ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={[styles.heroBlock, isMobile ? { flexDirection: 'column', marginTop: 60 } : { flexDirection: 'row-reverse', marginTop: 100, alignItems: 'center' }]}>
                        <View style={[styles.heroTextContent, isMobile && { alignItems: 'center', marginTop: 30 }]}>
                            <FadeInUp delay={100}><Text style={[styles.headline, { color: '#1F2937', fontWeight: '300', letterSpacing: 1 }, isMobile && { textAlign: 'center', fontSize: 44 }]}>{config.headline || "إشراقة تأسر الحواس."}</Text></FadeInUp>
                            <FadeInUp delay={200}><View style={{ width: 60, height: 1, backgroundColor: '#D4AF37', marginVertical: 24 }} /></FadeInUp>
                            <FadeInUp delay={300}><Text style={[styles.subheadline, { color: '#6B7280', fontSize: 18, lineHeight: 32 }, isMobile && { textAlign: 'center' }]}>{config.subheadline || "تركيبة عضوية فاخرة تمنحك النتائج من أول استخدام."}</Text></FadeInUp>
                            <FadeInUp delay={400} style={[styles.heroButtonsRow, isMobile && { justifyContent: 'center' }]}>
                                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#D4AF37', borderRadius: 0, paddingHorizontal: 40, paddingVertical: 20 }]} onPress={scrollToForm}><Text style={[styles.primaryBtnText, { color: '#FFF', fontWeight: '400', letterSpacing: 1 }]}>{config.btnText || "اكتشف السر"}</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#D4AF37', borderRadius: 0, paddingHorizontal: 40, paddingVertical: 20 }]} onPress={scrollToFeatures}><Text style={[styles.secondaryBtnText, { color: '#D4AF37', fontWeight: '400' }]}>اقرأ المزيد</Text></TouchableOpacity>
                            </FadeInUp>
                        </View>
                        <FadeInUp delay={200} style={[styles.heroImgWrap, isMobile && { width: '100%' }]}>
                            <Animated.View style={{ transform: [{ translateY: parallaxTranslate }] }}>
                                <View style={{ width: isMobile ? 300 : 450, height: isMobile ? 400 : 600, borderRadius: 200, borderTopLeftRadius: 0, overflow: 'hidden', elevation: 15, shadowColor: '#D4AF37', shadowOpacity: 0.2, shadowRadius: 40 }}>
                                    {images.length > 1 ? (
                                        <EnhancedImageCarousel images={images} height="100%" borderRadius={0} showThumbnails={false} />
                                    ) : (
                                        <Image source={{ uri: images[0] }} style={styles.imgFill} contentFit="cover" transition={200} />
                                    )}
                                </View>
                            </Animated.View>
                        </FadeInUp>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: 'transparent', marginTop: 40 }]}>
                        <Text style={[styles.sectionTitle, { color: '#1F2937', textAlign: 'center', marginBottom: 20 }]}>لماذا تختارنا؟</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={200 + (i * 100)} distance={30} style={[styles.featureCard, { backgroundColor: '#FFF', borderRadius: 0, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', alignItems: 'center' }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: '#FAF7F2', borderRadius: 32 }]}><Ionicons name={f.icon} size={30} color={f.color} /></View>
                                    <Text style={[styles.featureTitle, { color: '#1F2937', textAlign: 'center' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#6B7280', textAlign: 'center' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.testimonialsSection, { backgroundColor: '#FFF', marginVertical: 60 }]}>
                        <Text style={[styles.sectionTitle, { color: '#1F2937', fontWeight: '300' }]}>تجارب حقيقية</Text>
                        <View style={[styles.divider, { backgroundColor: '#D4AF37', height: 1, width: 100 }]} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testimonialsScroll}>
                            {TESTIMONIALS.map((t, i) => (
                                <View key={i} style={[styles.testimonialCard, { backgroundColor: '#FAF7F2', width: isMobile ? width * 0.8 : 400, borderRadius: 0, borderWidth: 1, borderColor: 'rgba(212,175,55,0.1)', marginLeft: 20 }]}>
                                    <Text style={[styles.testimonialText, { color: '#374151', fontSize: 18, lineHeight: 32 }]}>"{t.text}"</Text>
                                    <View style={styles.testimonialAuthorRow}>
                                        <View style={[styles.avatar, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D4AF37' }]}><Ionicons name="person" size={20} color="#D4AF37" /></View>
                                        <View><Text style={[styles.authorName, { color: '#1F2937', fontWeight: '400' }]}>{t.name}</Text></View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 40, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="elegance" /></View>
                </View>
            </Animated.ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 5: BEAST (High FOMO)
// ==========================================
export const BeastTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const parallaxScale = scrollY.interpolate({ inputRange: [-200, 0, 500], outputRange: [1.2, 1, 0.9], extrapolate: 'clamp' });

    const features = resolveFeatures(config.features, [
        { icon: 'flame', color: '#FFD60A', title: 'الأكثر مبيعاً', desc: 'المنتج رقم 1 في السوق حالياً.' },
        { icon: 'cash', color: '#00E676', title: 'دفع عند الاستلام', desc: 'لا تدفع أي شيء حتى يصلك المنتج.' },
        { icon: 'car', color: '#FF3B30', title: 'توصيل لـ 58 ولاية', desc: 'شحن سريع ومضمون لأي مكان.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
            <View style={{ position: 'absolute', top: 200, left: -50, width: '120%', height: 40, backgroundColor: '#FFD60A', transform: [{ rotate: '-5deg' }], opacity: 0.1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#000', fontWeight: 'bold', letterSpacing: 10 }}>WARNING WARNING WARNING WARNING</Text></View>

            <Animated.ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={{ backgroundColor: '#FFD60A', padding: 12, alignItems: 'center', zIndex: 20 }}><Text style={{ color: '#000', fontFamily: 'Tajawal_800ExtraBold', fontSize: 16 }}>⚠️ تحذير: المخزون على وشك النفاذ! ⚠️</Text></View>

                <View style={styles.maxContainer}>
                    <View style={[styles.heroBlock, { flexDirection: 'column', alignItems: 'center', marginTop: 40 }]}>
                        <FadeInUp delay={100}><Text style={[styles.headline, { color: '#FFF', textAlign: 'center', fontSize: isMobile ? 54 : 80, textShadowColor: '#FF3B30', textShadowRadius: 20, textTransform: 'uppercase' }]}>{config.headline || "فرصة لا تعوض!"}</Text></FadeInUp>
                        <FadeInUp delay={200}><Text style={[styles.subheadline, { color: '#9CA3AF', textAlign: 'center', fontSize: 22, maxWidth: 600 }]}>{config.subheadline || "استغل العرض قبل انتهاء الكمية الحالية."}</Text></FadeInUp>
                        <Pulse style={{ width: '100%', maxWidth: 500 }}>
                            <View style={{ backgroundColor: '#111827', borderColor: '#FF3B30', borderWidth: 3, padding: 25, borderRadius: 20, alignItems: 'center', marginVertical: 30, shadowColor: '#FF3B30', shadowOpacity: 0.4, shadowRadius: 30, elevation: 20 }}>
                                <Text style={{ color: '#FFD60A', fontFamily: 'Tajawal_700Bold', marginBottom: 10, fontSize: 18 }}>العرض ينتهي قريباً:</Text>
                                <Text style={{ fontSize: 50, fontFamily: 'Courier', color: '#FFF', fontWeight: 'bold', letterSpacing: 6 }}>14:59</Text>
                            </View>
                        </Pulse>
                        <FadeInUp delay={300} style={{ width: '100%', maxWidth: 800, aspectRatio: 16 / 9, borderRadius: 20, overflow: 'hidden', position: 'relative', borderWidth: 2, borderColor: '#333' }}>
                            {images.length > 1 ? (
                                <EnhancedImageCarousel images={images} height="100%" borderRadius={0} showThumbnails={false} showArrows={true} />
                            ) : (
                                <AnimatedExpoImage source={{ uri: images[0] }} style={[styles.imgFill, { transform: [{ scale: parallaxScale }] }]} contentFit="cover" transition={200} />
                            )}
                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />
                        </FadeInUp>
                        <FadeInUp delay={400} style={[styles.heroButtonsRow, { justifyContent: 'center', width: '100%', maxWidth: 600, marginTop: -40, zIndex: 10 }]}>
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#FF3B30', flex: 1, elevation: 10, paddingVertical: 22, borderRadius: 16 }]} onPress={scrollToForm}><Text style={[styles.primaryBtnText, { color: '#FFF', fontSize: 20 }]}>{config.btnText || "اطلب قبل النفاذ"}</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#FFD60A', flex: 1, backgroundColor: '#000', borderRadius: 16, paddingVertical: 22 }]} onPress={scrollToFeatures}><Text style={[styles.secondaryBtnText, { color: '#FFD60A', fontSize: 20 }]}>تفاصيل أكثر</Text></TouchableOpacity>
                        </FadeInUp>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: 'transparent', marginTop: 60 }]}>
                        <Text style={[styles.sectionTitle, { color: '#FFD60A', textAlign: 'center', marginBottom: 20 }]}>لماذا تشتري منا؟</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={i * 150} distance={40} style={[styles.featureCard, { backgroundColor: '#111827', borderRadius: 16, borderLeftWidth: 6, borderColor: f.color, padding: 35 }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Ionicons name={f.icon} size={36} color={f.color} /></View>
                                    <Text style={[styles.featureTitle, { color: '#FFF', fontSize: 24 }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#9CA3AF', fontSize: 16 }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.testimonialsSection, { backgroundColor: '#111827', marginVertical: 60, paddingVertical: 80, borderRadius: 20, marginHorizontal: 16 }]}>
                        <Text style={[styles.sectionTitle, { color: '#FFF', textTransform: 'uppercase' }]}>قالوا عنا</Text>
                        <View style={[styles.divider, { backgroundColor: '#FF3B30', width: 120 }]} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testimonialsScroll}>
                            {TESTIMONIALS.map((t, i) => (
                                <View key={i} style={[styles.testimonialCard, { backgroundColor: '#000', width: isMobile ? width * 0.85 : 420, borderRadius: 16, borderWidth: 1, borderColor: '#333', marginLeft: 20 }]}>
                                    <Text style={[styles.testimonialText, { color: '#FFF', fontSize: 18, lineHeight: 30 }]}>"{t.text}"</Text>
                                    <View style={styles.testimonialAuthorRow}>
                                        <View style={[styles.avatar, { backgroundColor: '#1F2937' }]}><Ionicons name="person" size={24} color="#FFD60A" /></View>
                                        <View><Text style={[styles.authorName, { color: '#FFF', fontSize: 18 }]}>{t.name}</Text></View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 40, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="beast" /></View>
                </View>
            </Animated.ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 6: TREND (Clothes/Fashion)
// ==========================================
export const TrendTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const features = resolveFeatures(config.features, [
        { title: 'تصميم عصري', desc: 'أحدث القصات العالمية التي تواكب الموضة.' },
        { title: 'قماش فاخر', desc: 'خامات مريحة وجودة عالية تدوم طويلاً.' },
        { title: 'ألوان جذابة', desc: 'تشكيلة متنوعة تناسب جميع الأذواق والمناسبات.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <Animated.ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={[styles.maxContainer, { paddingHorizontal: 0 }]}>
                    <View style={{ height: isMobile ? 500 : 700, width: '100%', position: 'relative' }}>
                        {images.length > 1 ? (
                            <EnhancedImageCarousel images={images} height="100%" borderRadius={0} showThumbnails={false} />
                        ) : (
                            <Image source={{ uri: images[0] }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
                        )}
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
                        <View style={{ position: 'absolute', bottom: 60, left: 30, right: 30 }}>
                            <FadeInUp delay={100}><Text style={{ color: '#FFF', fontSize: 14, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 10 }}>New Collection</Text></FadeInUp>
                            <FadeInUp delay={200}><Text style={{ color: '#FFF', fontSize: isMobile ? 48 : 72, fontFamily: 'Tajawal_800ExtraBold', lineHeight: isMobile ? 55 : 80 }}>{config.headline || "أحدث صيحات الموضة"}</Text></FadeInUp>
                            <FadeInUp delay={300}><TouchableOpacity onPress={scrollToForm} style={{ backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 30, paddingVertical: 15, marginTop: 20 }}><Text style={{ color: '#000', fontFamily: 'Tajawal_800ExtraBold', fontSize: 16 }}>تسوق الآن</Text></TouchableOpacity></FadeInUp>
                        </View>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={{ padding: 40, backgroundColor: '#FFF' }}>
                        <Text style={{ fontSize: 32, fontFamily: 'Tajawal_800ExtraBold', textAlign: 'center', marginBottom: 40 }}>التفاصيل تصنع الفارق</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <View key={i} style={{ flex: 1, alignItems: 'center', padding: 20, borderBottomWidth: i < 2 ? (isMobile ? 1 : 0) : 0, borderRightWidth: i < 2 && !isMobile ? 1 : 0, borderColor: '#EEE' }}>
                                    <Text style={{ fontSize: 24, fontFamily: 'Tajawal_800ExtraBold', color: '#000', marginBottom: 10 }}>{f.title}</Text>
                                    <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>{f.desc}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.testimonialsSection, { backgroundColor: '#FAFAFA', paddingVertical: 60 }]}>
                        <Text style={[styles.sectionTitle, { color: '#000' }]}>آراء العملاء</Text>
                        <View style={[styles.divider, { backgroundColor: '#000', width: 80 }]} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testimonialsScroll}>
                            {TESTIMONIALS.map((t, i) => (
                                <View key={i} style={[styles.testimonialCard, { backgroundColor: '#FFF', width: isMobile ? width * 0.8 : 380, borderWidth: 1, borderColor: '#E5E5E5', marginLeft: 20, shadowOpacity: 0.05 }]}>
                                    <Text style={[styles.testimonialText, { color: '#333', fontSize: 16, lineHeight: 28 }]}>"{t.text}"</Text>
                                    <View style={styles.testimonialAuthorRow}>
                                        <View style={[styles.avatar, { backgroundColor: '#F5F5F5' }]}><Ionicons name="person" size={20} color="#999" /></View>
                                        <View><Text style={[styles.authorName, { color: '#000' }]}>{t.name}</Text></View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 60, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="trend" /></View>
                </View>
            </Animated.ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 7: AURA (Dresses/Bridal)
// ==========================================
export const AuraTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const features = resolveFeatures(config.features, [
        { icon: 'rose', title: 'تصميم فريد', desc: 'فستان مصمم خصيصاً لإبراز أنوثتك.' },
        { icon: 'diamond', title: 'تفاصيل راقية', desc: 'تطريزات دقيقة وأقمشة فاخرة.' },
        { icon: 'heart', title: 'مقاسات دقيقة', desc: 'متوفر بجميع المقاسات مع إمكانية التعديل.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: 'rgba(255,245,245,0.9)' }}>
            <AbstractBlob color="#FFB6C1" size={400} position={{ top: 50, right: -100 }} />
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={{ alignItems: 'center', paddingVertical: 80, paddingHorizontal: 20 }}>
                        <FadeInUp delay={100}><Text style={{ color: '#D88A8A', fontSize: 20, fontStyle: 'italic', marginBottom: 20 }}>~ تألقي في مناسباتك ~</Text></FadeInUp>
                        <FadeInUp delay={200}><Text style={{ fontSize: isMobile ? 42 : 60, color: '#4A3B3B', fontFamily: 'Tajawal_800ExtraBold', textAlign: 'center', lineHeight: isMobile ? 50 : 70 }}>{config.headline || "فستان الأحلام أصبح حقيقة"}</Text></FadeInUp>
                        <FadeInUp delay={300} style={{ width: isMobile ? '90%' : 500, height: isMobile ? 500 : 700, borderRadius: 300, overflow: 'hidden', marginTop: 40, borderWidth: 5, borderColor: '#FFF', elevation: 15 }}>
                            {images.length > 1 ? (
                                <EnhancedImageCarousel images={images} height="100%" borderRadius={0} showThumbnails={false} />
                            ) : (
                                <Image source={{ uri: images[0] }} style={styles.imgFill} contentFit="cover" transition={200} />
                            )}
                        </FadeInUp>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: 'transparent', paddingVertical: 40 }]}>
                        <Text style={[styles.sectionTitle, { color: '#4A3B3B', textAlign: 'center', marginBottom: 20 }]}>لماذا يختاروننا؟</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={200 + (i * 100)} distance={30} style={[styles.featureCard, { backgroundColor: '#FFF', borderRadius: 20, shadowOpacity: 0.1, alignItems: 'center' }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: '#FFE4E1', borderRadius: 40 }]}><Ionicons name={f.icon} size={30} color="#D88A8A" /></View>
                                    <Text style={[styles.featureTitle, { color: '#4A3B3B', textAlign: 'center' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#8A7B7B', textAlign: 'center' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.testimonialsSection, { backgroundColor: '#FFE4E1', marginVertical: 20, paddingVertical: 60, borderRadius: 30, marginHorizontal: 16 }]}>
                        <Text style={[styles.sectionTitle, { color: '#4A3B3B' }]}>آراء العرائس</Text>
                        <View style={[styles.divider, { backgroundColor: '#D88A8A', width: 80 }]} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testimonialsScroll}>
                            {TESTIMONIALS.map((t, i) => (
                                <View key={i} style={[styles.testimonialCard, { backgroundColor: '#FFF', width: isMobile ? width * 0.8 : 380, borderRadius: 20, marginLeft: 20 }]}>
                                    <Text style={[styles.testimonialText, { color: '#4A3B3B', fontSize: 16 }]}>"{t.text}"</Text>
                                    <View style={styles.testimonialAuthorRow}>
                                        <View style={[styles.avatar, { backgroundColor: '#FFE4E1' }]}><Ionicons name="person" size={20} color="#D88A8A" /></View>
                                        <View><Text style={[styles.authorName, { color: '#4A3B3B' }]}>{t.name}</Text></View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 20, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="aura" /></View>
                </View>
            </ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 8: KICKS (Shoes/Sneakers)
// ==========================================
export const KicksTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const features = resolveFeatures(config.features, [
        { icon: 'footsteps', title: 'راحة فائقة', desc: 'نعل داخلي مبطّن بتقنية الذاكرة.' },
        { icon: 'flash', title: 'متانة عالية', desc: 'مصنوعة من خامات مقاومة للتآكل.' },
        { icon: 'shield', title: 'ضمان الجودة', desc: 'ضمان لمدة سنة ضد عيوب التصنيع.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#0F0F11' }}>
            <DiagonalStripes color="#2D5CFF" width={500} height={500} position={{ top: -100, right: -200 }} />
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={{ padding: 40, flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', marginTop: 50 }}>
                        <View style={{ flex: 1, zIndex: 10 }}>
                            <FadeInUp delay={100}><Text style={{ color: '#2D5CFF', fontSize: 80, fontFamily: 'Tajawal_800ExtraBold', textTransform: 'uppercase', opacity: 0.2, position: 'absolute', top: -40, left: -20 }}>SNKRS</Text></FadeInUp>
                            <FadeInUp delay={200}><Text style={{ fontSize: isMobile ? 50 : 70, color: '#FFF', fontFamily: 'Tajawal_800ExtraBold', lineHeight: isMobile ? 60 : 80 }}>{config.headline || "خطوة نحو المستقبل"}</Text></FadeInUp>
                            <FadeInUp delay={300}><Text style={{ color: '#A0A0A5', fontSize: 18, marginTop: 20 }}>{config.subheadline || "راحة تامة بتصميم جريء يخطف الأنظار."}</Text></FadeInUp>
                            <FadeInUp delay={350} style={{ flexDirection: 'row', gap: 15, marginTop: 30 }}>
                                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#2D5CFF', borderRadius: 30 }]} onPress={scrollToForm}><Text style={styles.primaryBtnText}>اشتري الآن</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#2D5CFF', borderRadius: 30 }]} onPress={scrollToFeatures}><Text style={[styles.secondaryBtnText, { color: '#2D5CFF' }]}>المزيد</Text></TouchableOpacity>
                            </FadeInUp>
                        </View>
                        <FloatingElement delay={400} duration={2500} distance={30} style={{ flex: 1, width: '100%', height: 400, marginTop: isMobile ? 40 : 0 }}>
                            {images.length > 1 ? (
                                <EnhancedImageCarousel images={images} height="100%" borderRadius={20} showThumbnails={false} />
                            ) : (
                                <Image source={{ uri: images[0] }} style={[styles.imgFill, { transform: [{ rotate: '-15deg' }, { scale: 1.2 }] }]} contentFit="contain" transition={200} />
                            )}
                        </FloatingElement>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: 'transparent', paddingVertical: 40 }]}>
                        <Text style={[styles.sectionTitle, { color: '#FFF', textAlign: 'center', marginBottom: 20 }]}>الميزات</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={200 + (i * 100)} distance={30} style={[styles.featureCard, { backgroundColor: '#1A1A1E', borderRadius: 16, borderWidth: 1, borderColor: '#29292D' }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: 'rgba(45,92,255,0.1)', borderRadius: 16 }]}><Ionicons name={f.icon} size={30} color="#2D5CFF" /></View>
                                    <Text style={[styles.featureTitle, { color: '#FFF' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#A0A0A5' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 60, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="kicks" /></View>
                </View>
            </ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 9: HOMEFIX (House Utilities)
// ==========================================
export const HomeFixTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const features = resolveFeatures(config.features, [
        { icon: 'construct', title: 'متين وعملي', desc: 'مصمم ليتحمل الاستخدام اليومي.' },
        { icon: 'water', title: 'سهل التنظيف', desc: 'سطح مقاوم للبقع وسهل الصيانة.' },
        { icon: 'shield', title: 'ضمان طويل', desc: 'ضمان شامل لمدة عامين.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
            <DottedGrid color="#0F609B" rows={6} cols={10} position={{ top: 50, left: 50 }} />
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={{ backgroundColor: '#FFF', margin: 20, borderRadius: 20, overflow: 'hidden', elevation: 10, shadowColor: '#0F609B', shadowOpacity: 0.1, shadowRadius: 20 }}>
                        <View style={{ flexDirection: isMobile ? 'column-reverse' : 'row' }}>
                            <View style={{ flex: 1, padding: 40, justifyContent: 'center' }}>
                                <Text style={{ color: '#0F609B', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>✓ عملي ✓ متين ✓ موثوق</Text>
                                <Text style={{ fontSize: isMobile ? 36 : 48, color: '#102A43', fontFamily: 'Tajawal_800ExtraBold', marginBottom: 20 }}>{config.headline || "حلول ذكية لمنزلك"}</Text>
                                <Text style={{ color: '#486581', fontSize: 18, lineHeight: 28 }}>{config.subheadline || "اجعل حياتك اليومية أسهل مع أدواتنا المنزلية عالية الجودة."}</Text>
                                <View style={{ flexDirection: 'row', gap: 15, marginTop: 30 }}>
                                    <TouchableOpacity onPress={scrollToForm} style={{ backgroundColor: '#0F609B', padding: 15, borderRadius: 10, alignSelf: 'flex-start' }}><Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>اطلب الآن</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={scrollToFeatures} style={{ borderWidth: 1, borderColor: '#0F609B', padding: 15, borderRadius: 10, alignSelf: 'flex-start' }}><Text style={{ color: '#0F609B', fontWeight: 'bold', fontSize: 16 }}>الميزات</Text></TouchableOpacity>
                                </View>
                            </View>
                            <View style={{ flex: 1, minHeight: 350 }}>
                                {images.length > 1 ? (
                                    <EnhancedImageCarousel images={images} height="100%" borderRadius={0} showThumbnails={false} />
                                ) : (
                                    <Image source={{ uri: images[0] }} style={styles.imgFill} contentFit="cover" transition={200} />
                                )}
                            </View>
                        </View>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: 'transparent', paddingVertical: 40 }]}>
                        <Text style={[styles.sectionTitle, { color: '#102A43', textAlign: 'center', marginBottom: 20 }]}>لماذا تختار منتجاتنا؟</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={200 + (i * 100)} distance={30} style={[styles.featureCard, { backgroundColor: '#FFF', borderRadius: 16 }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: '#E8F0F8', borderRadius: 16 }]}><Ionicons name={f.icon} size={30} color="#0F609B" /></View>
                                    <Text style={[styles.featureTitle, { color: '#102A43' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#486581' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 40, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="homefix" /></View>
                </View>
            </ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 10: CANDY (Girly Pink)
// ==========================================
export const CandyTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const features = resolveFeatures(config.features, [
        { icon: 'sparkles', title: 'آمن للبشرة', desc: 'مكونات لطيفة وغير مهيجة.' },
        { icon: 'leaf', title: 'طبيعي 100%', desc: 'خالي من المواد الكيميائية الضارة.' },
        { icon: 'heart', title: 'نتائج مضمونة', desc: 'فعالية مثبتة من آلاف العملاء.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#FFF0F5' }}>
            <AbstractBlob color="#FFB6C1" size={300} position={{ top: 20, left: 20 }} />
            <AbstractBlob color="#FF69B4" size={200} position={{ bottom: 200, right: 20 }} />
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={{ padding: 30, alignItems: 'center', marginTop: 40 }}>
                        <Pulse><View style={{ backgroundColor: '#FF69B4', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, marginBottom: 20 }}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>💖 جديد وحصري 💖</Text></View></Pulse>
                        <Text style={{ fontSize: isMobile ? 42 : 56, color: '#800080', fontFamily: 'Tajawal_800ExtraBold', textAlign: 'center' }}>{config.headline || "لمسة من السحر لجمالك"}</Text>
                        <Text style={{ color: '#BA55D3', fontSize: 18, textAlign: 'center', marginTop: 15 }}>{config.subheadline || "منتجك المفضل لبشرة نضرة ومشرقة."}</Text>
                        <View style={{ width: '100%', maxWidth: 500, aspectRatio: 1, backgroundColor: '#FFF', borderRadius: 250, marginTop: 40, padding: 20, shadowColor: '#FF69B4', shadowOpacity: 0.3, shadowRadius: 30, elevation: 15, overflow: 'hidden' }}>
                            {images.length > 1 ? (
                                <EnhancedImageCarousel images={images} height="100%" borderRadius={250} showThumbnails={false} />
                            ) : (
                                <Image source={{ uri: images[0] }} style={[styles.imgFill, { borderRadius: 230 }]} contentFit="cover" transition={200} />
                            )}
                        </View>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: 'transparent', paddingVertical: 40 }]}>
                        <Text style={[styles.sectionTitle, { color: '#800080', textAlign: 'center', marginBottom: 20 }]}>مميزات المنتج</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={200 + (i * 100)} distance={30} style={[styles.featureCard, { backgroundColor: '#FFF', borderRadius: 30 }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: '#FFE4E1', borderRadius: 30 }]}><Ionicons name={f.icon} size={30} color="#FF69B4" /></View>
                                    <Text style={[styles.featureTitle, { color: '#800080' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#BA55D3' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.testimonialsSection, { backgroundColor: '#FFE4E1', marginVertical: 20, paddingVertical: 60, borderRadius: 40, marginHorizontal: 16 }]}>
                        <Text style={[styles.sectionTitle, { color: '#800080' }]}>قالوا عنا 💕</Text>
                        <View style={[styles.divider, { backgroundColor: '#FF69B4', width: 80 }]} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testimonialsScroll}>
                            {TESTIMONIALS.map((t, i) => (
                                <View key={i} style={[styles.testimonialCard, { backgroundColor: '#FFF', width: isMobile ? width * 0.8 : 380, borderRadius: 30, marginLeft: 20 }]}>
                                    <Text style={[styles.testimonialText, { color: '#800080', fontSize: 16 }]}>"{t.text}"</Text>
                                    <View style={styles.testimonialAuthorRow}>
                                        <View style={[styles.avatar, { backgroundColor: '#FFE4E1' }]}><Ionicons name="person" size={20} color="#FF69B4" /></View>
                                        <View><Text style={[styles.authorName, { color: '#800080' }]}>{t.name}</Text></View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 40, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="candy" /></View>
                </View>
            </ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 11: ACTIVE (Sports)
// ==========================================
export const ActiveTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const features = resolveFeatures(config.features, [
        { icon: 'barbell', title: 'أداء عالي', desc: 'مصمم لتحسين أدائك الرياضي.' },
        { icon: 'heart', title: 'صحة وسلامة', desc: 'مواد آمنة على صحتك.' },
        { icon: 'flash', title: 'نتائج سريعة', desc: 'احصل على نتائج ملحوظة بسرعة.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#121212' }}>
            <DiagonalStripes color="#CCFF00" width={800} height={800} position={{ top: -200, right: -300 }} />
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={{ padding: 40, marginTop: 50 }}>
                        <Text style={{ color: '#CCFF00', fontSize: isMobile ? 60 : 100, fontFamily: 'Tajawal_800ExtraBold', fontStyle: 'italic', textTransform: 'uppercase', lineHeight: isMobile ? 70 : 110 }}>NO</Text>
                        <Text style={{ color: '#FFF', fontSize: isMobile ? 60 : 100, fontFamily: 'Tajawal_800ExtraBold', fontStyle: 'italic', textTransform: 'uppercase', lineHeight: isMobile ? 70 : 110 }}>EXCUSES.</Text>
                        <Text style={{ color: '#888', fontSize: 20, marginTop: 20, maxWidth: 400 }}>{config.subheadline || "ارفع مستوى أدائك مع معداتنا الرياضية المصممة للمحترفين."}</Text>
                        <View style={{ flexDirection: 'row', gap: 15, marginTop: 30 }}>
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#CCFF00', borderRadius: 8, paddingHorizontal: 30 }]} onPress={scrollToForm}><Text style={[styles.primaryBtnText, { color: '#000' }]}>اشتري الآن</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#CCFF00', borderRadius: 8, paddingHorizontal: 30 }]} onPress={scrollToFeatures}><Text style={[styles.secondaryBtnText, { color: '#CCFF00' }]}>الميزات</Text></TouchableOpacity>
                        </View>
                        <View style={{ width: '100%', height: 400, marginTop: 40, borderLeftWidth: 10, borderColor: '#CCFF00' }}>
                            {images.length > 1 ? (
                                <EnhancedImageCarousel images={images} height="100%" borderRadius={0} showThumbnails={false} />
                            ) : (
                                <Image source={{ uri: images[0] }} style={styles.imgFill} contentFit="cover" transition={200} />
                            )}
                        </View>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: '#1E1E1E', marginVertical: 20, borderRadius: 20, marginHorizontal: 16 }]}>
                        <Text style={[styles.sectionTitle, { color: '#CCFF00', textAlign: 'center', marginBottom: 20 }]}>لماذا نحن؟</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={200 + (i * 100)} distance={30} style={[styles.featureCard, { backgroundColor: '#121212', borderRadius: 12 }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: 'rgba(204,255,0,0.1)', borderRadius: 12 }]}><Ionicons name={f.icon} size={30} color="#CCFF00" /></View>
                                    <Text style={[styles.featureTitle, { color: '#FFF' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#888' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 40, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="active" /></View>
                </View>
            </ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 12: CRAVE (Food/Supplements)
// ==========================================
export const CraveTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const features = resolveFeatures(config.features, [
        { icon: 'restaurant', title: 'طعم لا ينسى', desc: 'نكهات غنية وجودة عالية.' },
        { icon: 'leaf', title: 'مكونات طبيعية', desc: 'طازجة وخالية من المواد الحافظة.' },
        { icon: 'time', title: 'تحضير سريع', desc: 'جاهز في دقائق معدودة.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#FFF8F0' }}>
            <OutlinedHalfCircle color="#E65100" size={400} position={{ top: -100, left: -100 }} />
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={{ padding: 40, alignItems: 'center', marginTop: 40 }}>
                        <Text style={{ fontSize: isMobile ? 48 : 64, color: '#E65100', fontFamily: 'Tajawal_800ExtraBold', textAlign: 'center' }}>{config.headline || "مذاق لا يُقاوم"}</Text>
                        <Text style={{ color: '#A86A32', fontSize: 22, marginTop: 15, textAlign: 'center' }}>{config.subheadline || "مكونات طازجة وجودة مضمونة في كل طلب."}</Text>
                        <Pulse duration={2500}>
                            <View style={{ width: isMobile ? 300 : 450, height: isMobile ? 300 : 450, borderRadius: 250, backgroundColor: '#FFD180', marginTop: 50, justifyContent: 'center', alignItems: 'center', shadowColor: '#E65100', shadowOpacity: 0.3, shadowRadius: 30, elevation: 20, overflow: 'hidden' }}>
                                {images.length > 1 ? (
                                    <EnhancedImageCarousel images={images} height="100%" borderRadius={250} showThumbnails={false} />
                                ) : (
                                    <Image source={{ uri: images[0] }} style={{ width: '90%', height: '90%', borderRadius: 250 }} contentFit="cover" transition={200} />
                                )}
                            </View>
                        </Pulse>
                        <View style={{ flexDirection: 'row', gap: 15, marginTop: 30 }}>
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#E65100', borderRadius: 30 }]} onPress={scrollToForm}><Text style={styles.primaryBtnText}>اطلب الآن</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#E65100', borderRadius: 30 }]} onPress={scrollToFeatures}><Text style={[styles.secondaryBtnText, { color: '#E65100' }]}>المزيد</Text></TouchableOpacity>
                        </View>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: 'transparent', paddingVertical: 40 }]}>
                        <Text style={[styles.sectionTitle, { color: '#E65100', textAlign: 'center', marginBottom: 20 }]}>لماذا تختارنا؟</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={200 + (i * 100)} distance={30} style={[styles.featureCard, { backgroundColor: '#FFF', borderRadius: 20 }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: '#FFF0E0', borderRadius: 20 }]}><Ionicons name={f.icon} size={30} color="#E65100" /></View>
                                    <Text style={[styles.featureTitle, { color: '#5C2C06' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#A86A32' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 40, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="crave" /></View>
                </View>
            </ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 13: LUMBER (Furniture/Home)
// ==========================================
export const LumberTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const features = resolveFeatures(config.features, [
        { icon: 'bed', title: 'تصميم أنيق', desc: 'يناسب جميع الأذواق والديكورات.' },
        { icon: 'cube', title: 'خامات ممتازة', desc: 'خشب طبيعي عالي الجودة.' },
        { icon: 'construct', title: 'سهل التركيب', desc: 'تعليمات واضحة وأدوات مرفقة.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F5F0' }}>
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={{ padding: 40, flexDirection: isMobile ? 'column' : 'row', marginTop: 40 }}>
                        <View style={{ flex: 1, justifyContent: 'center', paddingRight: isMobile ? 0 : 40, zIndex: 10 }}>
                            <Text style={{ color: '#5C6B52', fontSize: 16, letterSpacing: 2, marginBottom: 10 }}>MODERN LIVING</Text>
                            <Text style={{ fontSize: isMobile ? 42 : 56, color: '#3E362E', fontFamily: 'Tajawal_800ExtraBold', lineHeight: isMobile ? 55 : 70 }}>{config.headline || "أثاث يعكس شخصيتك"}</Text>
                            <Text style={{ color: '#736B60', fontSize: 18, marginTop: 20, lineHeight: 30 }}>{config.subheadline || "تصاميم بسيطة وعملية تناسب مساحتك وتمنحها الدفء."}</Text>
                            <View style={{ flexDirection: 'row', gap: 15, marginTop: 30 }}>
                                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#5C6B52', borderRadius: 8 }]} onPress={scrollToForm}><Text style={styles.primaryBtnText}>تسوق الآن</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#5C6B52', borderRadius: 8 }]} onPress={scrollToFeatures}><Text style={[styles.secondaryBtnText, { color: '#5C6B52' }]}>الميزات</Text></TouchableOpacity>
                            </View>
                        </View>
                        <View style={{ flex: 1, marginTop: isMobile ? 40 : 0 }}>
                            <View style={{ width: '100%', aspectRatio: 4 / 5, backgroundColor: '#EAEADF', padding: 20 }}>
                                {images.length > 1 ? (
                                    <EnhancedImageCarousel images={images} height="100%" borderRadius={0} showThumbnails={false} />
                                ) : (
                                    <Image source={{ uri: images[0] }} style={styles.imgFill} contentFit="cover" transition={200} />
                                )}
                            </View>
                        </View>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: '#EAEADF', marginVertical: 20, borderRadius: 16, marginHorizontal: 16 }]}>
                        <Text style={[styles.sectionTitle, { color: '#3E362E', textAlign: 'center', marginBottom: 20 }]}>المميزات</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={200 + (i * 100)} distance={30} style={[styles.featureCard, { backgroundColor: '#FFF', borderRadius: 12 }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: '#F5F5F0', borderRadius: 12 }]}><Ionicons name={f.icon} size={30} color="#5C6B52" /></View>
                                    <Text style={[styles.featureTitle, { color: '#3E362E' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#736B60' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 40, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="lumber" /></View>
                </View>
            </ScrollView>
        </View>
    );
};

// ==========================================
// TEMPLATE 14: NEXUS (PCs & Mobiles)
// ==========================================
export const NexusTemplate = (props) => {
    const { campaign, config } = props;
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollRef = useRef(null);
    const [featuresY, setFeaturesY] = useState(0);
    const [formY, setFormY] = useState(0);

    const scrollToFeatures = () => scrollRef.current?.scrollTo({ y: featuresY, animated: true });
    const scrollToForm = () => scrollRef.current?.scrollTo({ y: formY, animated: true });

    const features = resolveFeatures(config.features, [
        { icon: 'hardware-chip', title: 'معالج قوي', desc: 'أحدث المعالجات لأداء فائق.' },
        { icon: 'battery-full', title: 'بطارية تدوم طويلاً', desc: 'استخدام طويل بشحنة واحدة.' },
        { icon: 'eye', title: 'شاشة مذهلة', desc: 'جودة عرض استثنائية.' }
    ]);

    const images = config.images?.length ? config.images : [campaign.products?.image_url].filter(Boolean);

    return (
        <View style={{ flex: 1, backgroundColor: '#0A192F' }}>
            <DottedGrid color="#64FFDA" rows={10} cols={10} position={{ top: 100, right: 100 }} />
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.maxContainer}>
                    <View style={{ padding: 40, alignItems: 'center', marginTop: 60 }}>
                        <Text style={{ color: '#64FFDA', fontSize: 18, fontFamily: 'Courier', marginBottom: 20 }}>&lt;NextGen_Device /&gt;</Text>
                        <Text style={{ fontSize: isMobile ? 46 : 64, color: '#CCD6F6', fontFamily: 'Tajawal_800ExtraBold', textAlign: 'center' }}>{config.headline || "قوة بين يديك"}</Text>
                        <Text style={{ color: '#8892B0', fontSize: 18, marginTop: 15, textAlign: 'center' }}>{config.subheadline || "أداء استثنائي وتصميم لا يُقاوم."}</Text>
                        <View style={{ width: '100%', maxWidth: 700, aspectRatio: 16 / 9, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(100,255,218,0.2)', marginTop: 50, padding: 20, shadowColor: '#64FFDA', shadowOpacity: 0.2, shadowRadius: 40, elevation: 20, overflow: 'hidden' }}>
                            {images.length > 1 ? (
                                <EnhancedImageCarousel images={images} height="100%" borderRadius={0} showThumbnails={false} showArrows={true} />
                            ) : (
                                <Image source={{ uri: images[0] }} style={styles.imgFill} contentFit="contain" transition={200} />
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 15, marginTop: 30 }}>
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#64FFDA', borderRadius: 8 }]} onPress={scrollToForm}><Text style={[styles.primaryBtnText, { color: '#0A192F' }]}>اطلب الآن</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#64FFDA', borderRadius: 8 }]} onPress={scrollToFeatures}><Text style={[styles.secondaryBtnText, { color: '#64FFDA' }]}>المواصفات</Text></TouchableOpacity>
                        </View>
                    </View>

                    <View onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)} style={[styles.featuresSection, { backgroundColor: 'rgba(10,25,47,0.5)', marginVertical: 20, borderRadius: 16, marginHorizontal: 16 }]}>
                        <Text style={[styles.sectionTitle, { color: '#64FFDA', textAlign: 'center', marginBottom: 20 }]}>المواصفات</Text>
                        <View style={[styles.featuresGrid, isMobile && { flexDirection: 'column' }]}>
                            {features.map((f, i) => (
                                <FadeInUp key={i} delay={200 + (i * 100)} distance={30} style={[styles.featureCard, { backgroundColor: 'rgba(10,25,47,0.8)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(100,255,218,0.2)' }]}>
                                    <View style={[styles.featureIconBox, { backgroundColor: 'rgba(100,255,218,0.1)', borderRadius: 12 }]}><Ionicons name={f.icon} size={30} color="#64FFDA" /></View>
                                    <Text style={[styles.featureTitle, { color: '#CCD6F6' }]}>{f.title}</Text>
                                    <Text style={[styles.featureDesc, { color: '#8892B0' }]}>{f.desc}</Text>
                                </FadeInUp>
                            ))}
                        </View>
                    </View>
                    <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)} style={{ paddingTop: 60, paddingHorizontal: 16 }}><UniversalCheckoutForm {...props} styleMode="nexus" /></View>
                </View>
            </ScrollView>
        </View>
    );
};

// ==========================================
// SHARED STYLES 
// ==========================================
const styles = StyleSheet.create({
    maxContainer: {
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
    },
    shimmerContainer: { padding: 18, alignItems: 'center', justifyContent: 'center', elevation: 12, overflow: 'hidden' },
    shimmerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    shimmerText: { fontSize: 18, fontFamily: 'Tajawal_800ExtraBold' },

    // FORM STYLES
    formWrapper: { width: '100%', maxWidth: 750, alignSelf: 'center', marginBottom: 60, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 40, elevation: 25 },
    formGradient: { padding: 40, borderWidth: 1, overflow: 'hidden' },
    formHeader: { alignItems: 'center', marginBottom: 40 },
    formIconWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    formTitle: { fontSize: 36, fontFamily: 'Tajawal_800ExtraBold', marginBottom: 10, textAlign: 'center' },
    formSubtitle: { fontSize: 16, fontFamily: 'Tajawal_500Medium', textAlign: 'center' },
    inputsGrid: { gap: 20 },
    input: { paddingVertical: 20, paddingHorizontal: 24, fontSize: 16, fontFamily: 'Tajawal_700Bold', borderWidth: 1 },
    label: { fontSize: 14, fontFamily: 'Tajawal_800ExtraBold', paddingHorizontal: 8 },
    picker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderWidth: 1 },
    pickerInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    pickerText: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
    deliveryRow: { flexDirection: "row", gap: 16 },
    deliveryChip: { flex: 1, paddingVertical: 18, borderWidth: 1, alignItems: "center", flexDirection: 'row', justifyContent: 'center', gap: 12 },
    deliveryChipText: { fontSize: 15, fontFamily: 'Tajawal_800ExtraBold' },
    totalBox: { marginTop: 40, padding: 30, borderWidth: 1, gap: 20 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalSubLabel: { fontSize: 16, fontFamily: 'Tajawal_500Medium' },
    totalSubValue: { fontSize: 18, fontFamily: 'Tajawal_700Bold' },
    totalDivider: { height: 1, opacity: 0.3 },
    totalLabel: { fontSize: 20, fontFamily: 'Tajawal_800ExtraBold' },
    totalValue: { fontSize: 36, fontFamily: 'Tajawal_800ExtraBold' },

    // LAYOUT STYLES
    heroBlock: { paddingHorizontal: 24, justifyContent: 'space-between', gap: 40, paddingBottom: 60 },
    heroTextContent: { flex: 1, zIndex: 10 },
    badge: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 24 },
    badgeText: { color: '#000', fontSize: 13, fontFamily: 'Tajawal_800ExtraBold' },
    headline: { fontSize: 52, fontFamily: 'Tajawal_800ExtraBold', lineHeight: 68, marginBottom: 24, textAlign: 'right' },
    subheadline: { fontSize: 20, fontFamily: 'Tajawal_500Medium', lineHeight: 32, marginBottom: 36, textAlign: 'right' },

    heroButtonsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 10 },
    primaryBtn: { paddingHorizontal: 36, paddingVertical: 20, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, flexDirection: 'row', gap: 12 },
    primaryBtnText: { color: '#FFF', fontSize: 18, fontFamily: 'Tajawal_800ExtraBold' },
    secondaryBtn: { paddingHorizontal: 36, paddingVertical: 20, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    secondaryBtnText: { fontSize: 18, fontFamily: 'Tajawal_800ExtraBold' },

    heroImgWrap: { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center' },
    heroImgInner: { width: '90%', aspectRatio: 0.85, overflow: 'hidden', zIndex: 2, elevation: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 40 },
    imgFill: { width: '100%', height: '100%' },
    blob: { position: 'absolute', width: 200, height: 200, borderRadius: 100, opacity: 0.15, zIndex: 1 },

    featuresSection: { paddingVertical: 80, paddingHorizontal: 24 },
    featuresGrid: { flexDirection: 'row', gap: 30, justifyContent: 'center' },
    featureCard: { flex: 1, padding: 40, borderRadius: 30, shadowOpacity: 0.05, shadowRadius: 20, elevation: 3 },
    featureIconBox: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    featureTitle: { fontSize: 24, fontFamily: 'Tajawal_800ExtraBold', marginBottom: 16, textAlign: 'right' },
    featureDesc: { fontSize: 16, fontFamily: 'Tajawal_500Medium', lineHeight: 28, textAlign: 'right' },

    testimonialsSection: { paddingVertical: 80 },
    sectionTitle: { fontSize: 42, fontFamily: 'Tajawal_800ExtraBold', textAlign: 'center' },
    divider: { width: 100, height: 4, borderRadius: 2, marginTop: 20, alignSelf: 'center', marginBottom: 60 },
    testimonialsScroll: { paddingHorizontal: 24, gap: 24, paddingBottom: 30 },
    testimonialCard: { padding: 45, borderRadius: 30, position: 'relative', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 30, elevation: 8 },
    testimonialText: { fontSize: 20, fontFamily: 'Tajawal_500Medium', lineHeight: 34, marginBottom: 30, fontStyle: 'italic', textAlign: 'right', marginTop: 10 },
    testimonialAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    authorName: { fontSize: 18, fontFamily: 'Tajawal_800ExtraBold', marginBottom: 6 },
    authorRole: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },

    // GALLERY STYLES
    paginationDots: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        zIndex: 10,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFF',
    },

    // ENHANCED CAROUSEL STYLES
    counterBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        zIndex: 10,
    },
    counterText: {
        color: '#FFF',
        fontSize: 13,
        fontFamily: 'Tajawal_700Bold',
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 80,
        zIndex: 5,
    },
    paginationContainer: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    paginationDotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    carouselDot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFF',
    },
    thumbnailContainer: {
        paddingHorizontal: 4,
        gap: 8,
    },
    thumbnailWrapper: {
        width: 60,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    thumbnailActive: {
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    thumbnailOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'flex-end',
    },
    thumbnailActiveIndicator: {
        height: 3,
        backgroundColor: '#FFF',
        width: '100%',
    },
    navArrow: {
        position: 'absolute',
        top: '50%',
        transform: [{ translateY: -20 }],
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 15,
    },
    leftArrow: {
        left: 12,
    },
    rightArrow: {
        right: 12,
    },
    simpleDotsContainer: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    simpleDot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFF',
    },
});