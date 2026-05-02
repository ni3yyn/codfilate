// --- START OF FILE App.js ---

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import * as Font from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
  Tajawal_900Black
} from '@expo-google-fonts/tajawal';
import * as SplashScreen from 'expo-splash-screen';
import { useRouter } from 'expo-router';

// --- PURE WEB CSS INJECTION FOR PREMIUM FX ---
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rnw-premium-overrides';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      html, body, #root { 
        background-color: #F8F9FA !important; 
        height: 100%; width: 100%; 
        overscroll-behavior-y: none; 
        overflow-x: hidden !important; 
        margin: 0; padding: 0; 
      }
      ::-webkit-scrollbar { width: 6px; background: #F8F9FA; display: none; }
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .glass-panel { backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
      .strike-through { text-decoration: line-through; color: #94A3B8; }
      .text-glow { text-shadow: 0px 0px 20px rgba(116, 198, 157, 0.4); }
    `;
    document.head.append(style);
  }
}

SplashScreen.preventAutoHideAsync();

// --- DESIGN TOKENS ---
const COLORS = {
  primary: '#2D6A4F',
  primaryHover: '#1B4332',
  primaryLight: '#E8F5E9',
  accentMint: '#74C69D',
  bgMain: '#F8F9FA',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#475569',
  textLight: '#94A3B8',
  border: 'rgba(15, 23, 42, 0.06)',
  danger: '#EF4444',
  gold: '#F59E0B'
};

// --- PSYCHOLOGICAL UX DATA (ALGERIAN MARKET FIT) ---
const ROLE_DATA = {
  merchant: {
    heroPill: "اشتراك واحد يحل كل مشاكلك",
    heroTitle: ["أضف منتجك فقط،", "نحن نتكفل بالباقي."],
    heroSub: "لا تضيع وقتك في البحث عن مسوقين أو إدارة شركات التوصيل. اشترك معنا، ارفع منتجاتك، وستقوم شبكة واسعة من المسوقين ببيعها فوراً. المرتجعات (الروتور)؟ نحن نتحملها. وفوق كل هذا، متجرك الإلكتروني مجاني للأبد.",
    epiphany: "«الخلاصة: أنت توفر المنتج وتدفع اشتراكاً بسيطاً.. ونحن نتكفل بالباقي. منصة، تسويق، وتوصيل، وحتى المرتجعات علينا. أنت تركز فقط على جلب السلعة.»",
    comparison: {
      oldWay: [
        "دفع مبالغ طائلة لتصميم متجر إلكتروني",
        "البحث عن مسوقين موثوقين ومتابعتهم",
        "التعامل مع شركات التوصيل ومشاكلها",
        "تحمل خسائر المنتجات المرتجعة بالكامل!"
      ],
      newWay: "باشتراكك معنا، تحصل على متجر احترافي يبقى معك للأبد. أنت تضيف المنتجات فقط! المسوقون يبيعون، نحن نوصل للزبون، ونحن من نتحمل المرتجعات. أرباحك الصافية تنزل في حسابك، نقطة."
    },
    showstopper: {
      tag: "هديتنا بعد الإشتراك",
      title: "متجرك الإلكتروني.. لك للأبد!",
      desc: "لن تدفع لمبرمج أبداً. باشتراكك كتاجر، نمنحك متجراً إلكترونياً احترافياً يحمل اسمك وشعارك، وهو ملكك مدى الحياة! حتى لو توقفت، المتجر يبقى لك. ضع الرابط في صفحاتك مباشرة.", icon: "storefront-outline"
    },
    features: [
      { icon: "shield-check-outline", title: "صفر قلق من المرتجعات", desc: "أكبر كابوس للتجار انتهى! نحن نتكفل بتوصيل الطلبات، وإذا تم إرجاع الطلب (الروتور)، نحن نتحمل التكلفة بالكامل، لتركز فقط على جلب منتجات جديدة." },
      { icon: "account-group-outline", title: "شبكة تسويقية جاهزة للعمل", desc: "لا تصرف ديناراً واحداً على الإعلانات. بمجرد وضعك للمنتج، يراه آلاف المسوقين المحترفين ويبدأون بالترويج له في كل المنصات لجلب المبيعات." },
      { icon: "cash-fast", title: "أرباحك في جيبك فوراً", desc: "لا توجد بيروقراطية ولا انتظار طويل. بمجرد استلام الزبون للطلب، تظهر أرباحك الصافية في لوحة التحكم، جاهزة للسحب في أي وقت." },
    ]
  },
  affiliate: {
    heroPill: "أسهل نظام تسويق بالعمولة في الجزائر",
    heroTitle: ["انسَ النسخ واللصق.", "سوّق بضغطة زر."],
    heroSub: "الطريقة القديمة ماتت. لا حاجة لحفظ صور المنتجات أو بناء صفحات بيع معقدة. تصفح المنتجات، ولّد صفحة بيع (Landing Page) مجانية بضغطة واحدة، وابدأ بجمع الأرباح فوراً.",
    epiphany: "«لحظة... يعني أختار المنتج، وبضغطة زر أحصل على صفحة بيع جاهزة مجاناً، وإذا سألني الزبون 'وين راهي الكوموند تاعي؟' أرسل له رابط التتبع وانسى الأمر؟»",
    comparison: {
      oldWay: [
        "حفظ مئات الصور يدوياً في هاتفك",
        "الرد على آلاف رسائل الزبائن المزعجة",
        "دفع اشتراكات شهرية باهظة لصفحات البيع (Landing Pages)",
        "إرهاق من تتبع الطلبات مع التوصيل"
      ],
      newWay: "ضغطة زر = صفحة بيع برابطك الخاص. وإذا سأل الزبون عن طلبه، ترسل له رابط التتبع الآلي وتتجاهله! قلنا لك: أنت فقط شارك وسوق، والباقي علينا."
    },
    showstopper: {
      tag: "ميزتك التنافسية للسيطرة على السوق 🚀",
      title: "مولد صفحات البيع المجاني",
      desc: "صممنا لك أداة سحرية ستغير طريقة عملك. اختر منتجاً يعجبك، اضغط على 'توليد صفحة'، وسيقوم نظامنا بإنشاء صفحة بيع احترافية (High-Converting) تحتوي على كل الصور والأوصاف، مدمجة برابطك الخاص. صفر مجهود تقني، 100% أرباح.",
      icon: "web"
    },
    features: [
      { icon: "magnify", title: "كتالوج منتجات لا ينضب", desc: "وفرنا لك مئات المنتجات المختارة بعناية، المضمونة الطلب، وذات هوامش الربح العالية. تُحدّث يومياً لتسبق الجميع وتختار ما يناسب حملاتك." },
      { icon: "radar", title: "وداعاً لأسئلة «أين طلبي؟»", desc: "لا تضيع ثانية في خدمة الزبائن! مع كل طلب، يتم توليد رابط تتبع ذكي. أرسله للزبون وانسَ الأمر تماماً. مهمتك فقط التسويق." },
      { icon: "bell-ring-outline", title: "أرباحك تظهر مباشرة في هاتفك", desc: "لا شيء يضاهي متعة سماع رنة المبيعة! نظام تتبع دقيق يرصد كل نقرة وحالة طلب بشفافية مطلقة مباشرة من لوحة تحكمك، لحظة بلحظة." },
    ]
  }
};

// --- CORE UI COMPONENTS ---
const ArText = ({ style, children, weight = '400', align = 'right', className, ...props }) => {
  let fontFamily = 'Tajawal_400Regular';
  if (weight === '500') fontFamily = 'Tajawal_500Medium';
  if (weight === '700') fontFamily = 'Tajawal_700Bold';
  if (weight === '800') fontFamily = 'Tajawal_800ExtraBold';
  if (weight === '900') fontFamily = 'Tajawal_900Black';

  return (
    <Text
      {...props}
      className={className}
      style={[{ textAlign: align, color: COLORS.textMain, writingDirection: 'rtl', fontFamily }, (weight === '900' || weight === '800') && { letterSpacing: -0.5 }, style]}
    >
      {children}
    </Text>
  );
};

// Cinematic Spring Reveal (Optimized for scroll: delay 0, triggers instantly on intersect)
const SpringReveal = ({ children, delay = 0, style, direction = 'up' }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const viewRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
      }, { threshold: 0.1 });
      if (viewRef.current) observer.observe(viewRef.current);
      return () => observer.disconnect();
    } else {
      setTimeout(() => setIsVisible(true), 150);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(animValue, { toValue: 1, friction: 8, tension: 35, useNativeDriver: true })
      ]).start();
    }
  }, [isVisible, delay]);

  const translateY = direction === 'up' ? animValue.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) : 0;
  const translateX = direction === 'right' ? animValue.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) : direction === 'left' ? animValue.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) : 0;
  const scale = direction === 'zoom' ? animValue.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) : 1;

  return (
    <Animated.View ref={viewRef} style={[style, { opacity: animValue, transform: [{ translateY }, { translateX }, { scale }] }]}>
      {children}
    </Animated.View>
  );
};

// Advanced Typewriter Effect (Now runs ambiently without blocking layout)
const TypewriterText = ({ text, delay = 60, onComplete, isMobile }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    const typingTimer = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(typingTimer);
        if (onComplete) setTimeout(onComplete, 300);
      }
    }, delay);

    const cursorTimer = setInterval(() => setShowCursor(c => !c), 500);

    return () => {
      clearInterval(typingTimer);
      clearInterval(cursorTimer);
    };
  }, [text, delay]);

  return (
    <View style={[styles.typewriterPill, { paddingVertical: isMobile ? 6 : 8, paddingHorizontal: isMobile ? 16 : 24 }]}>
      <ArText style={{ fontSize: isMobile ? 16 : 20, color: COLORS.primaryHover }} weight="800" align="center">
        {displayedText}
        <Text style={{ opacity: showCursor ? 1 : 0, color: COLORS.primary }}>|</Text>
      </ArText>
    </View>
  );
};

// High-Impact Editorial Button
const ImpactButton = ({ title, icon, onPress, primary = true, style, isMobile }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={{ width: isMobile ? '100%' : 'auto' }}>
      <Animated.View style={[styles.btnBase, primary ? styles.btnPrimary : styles.btnSecondary, style, { transform: [{ scale }], width: isMobile ? '100%' : 'auto' }]}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ArText style={{ color: primary ? COLORS.bgWhite : COLORS.textMain, fontSize: isMobile ? 16 : 18 }} weight="800" align="center">{title}</ArText>
          {icon && <MaterialIcons name={icon} size={isMobile ? 20 : 24} color={primary ? COLORS.bgWhite : COLORS.primary} />}
        </View>
      </Animated.View>
    </Pressable>
  );
};

// --- CINEMATIC BACKGROUND GEOMETRY ---
const CinematicBackground = ({ isDark = false }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 80000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ])).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinReverse = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <View style={[styles.bgSlash, { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : COLORS.primaryLight }]} />
      <Animated.View style={[styles.bgRing, { borderColor: isDark ? 'rgba(116, 198, 157, 0.08)' : 'rgba(45, 106, 79, 0.04)', transform: [{ rotate: spin }] }]} />
      <Animated.View style={[styles.bgHalfCircle, { backgroundColor: isDark ? 'rgba(116, 198, 157, 0.04)' : 'rgba(116, 198, 157, 0.08)', transform: [{ translateY }, { rotate: spinReverse }] }]} />
    </View>
  );
};

// --- COMPACT PRESTIGE CARD (Snappier transition) ---
const PrestigeRoleCard = ({ role, title, subtitle, icon, onExpandStart, onExpandComplete, isHidden, isMobile }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const expansionScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (!isHidden) Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    if (!isHidden) Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const handlePress = () => {
    onExpandStart(role);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      // Reduced expansion from 600ms to 350ms with Easing.out(Easing.cubic)
      Animated.timing(expansionScale, { toValue: 150, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start(() => {
      onExpandComplete(role);
    });
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }], width: '100%', minHeight: isMobile ? 180 : 220 }}>
      <Pressable onPress={handlePress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={isHidden} style={[styles.prestigeCard, Platform.OS === 'web' && { className: 'glass-panel' }]}>

        {/* Magic Expanding Circle (Transitions to bgMain) */}
        <Animated.View style={[
          styles.expandingCircle,
          { backgroundColor: COLORS.bgMain, transform: [{ scale: expansionScale }] }
        ]} pointerEvents="none" />

        {/* Huge Watermark Icon */}
        <MaterialCommunityIcons name={icon} size={isMobile ? 120 : 180} color={COLORS.primary} style={styles.watermarkIcon} pointerEvents="none" />

        {/* Card Content Layout (Matches Screenshot) */}
        <Animated.View style={{ opacity: contentOpacity, padding: isMobile ? 24 : 32, flex: 1, justifyContent: 'space-between' }} pointerEvents="none">

          {/* Top Left Icon */}
          <View style={{ alignSelf: 'flex-start' }}>
            <View style={[styles.cardIconWrapper, { width: isMobile ? 44 : 56, height: isMobile ? 44 : 56, borderRadius: isMobile ? 22 : 28 }]}>
              <MaterialCommunityIcons name={icon} size={isMobile ? 24 : 28} color={COLORS.primary} />
            </View>
          </View>

          {/* Texts (Right Aligned) */}
          <View style={{ marginTop: isMobile ? 12 : 16 }}>
            <ArText style={{ fontSize: isMobile ? 26 : 34, color: COLORS.textMain }} weight="900" align="right">{title}</ArText>
            <ArText style={{ fontSize: isMobile ? 14 : 16, color: COLORS.textMuted, marginTop: 6, lineHeight: isMobile ? 22 : 26 }} align="right">{subtitle}</ArText>
          </View>

          {/* Action Pill (Bottom Left) */}
          <View style={{ alignSelf: 'flex-start', marginTop: isMobile ? 16 : 24 }}>
            <View style={[styles.cardActionPill, { paddingVertical: isMobile ? 6 : 8, paddingHorizontal: isMobile ? 16 : 20 }]}>
              <ArText style={{ color: COLORS.primary, fontSize: isMobile ? 14 : 16 }} weight="900">اختر</ArText>
              <MaterialIcons name="arrow-back" size={isMobile ? 16 : 20} color={COLORS.primary} />
            </View>
          </View>

        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

// --- THE OPTIMIZED ORCHESTRATED WELCOME GATE ---
const PrestigeGate = ({ onSelect, isDesktop, isMobile }) => {
  // Animation Values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerInitialSlide = useRef(new Animated.Value(40)).current;
  const headerMainShift = useRef(new Animated.Value(isMobile ? 160 : 200)).current; // Push down to center initially

  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsScale = useRef(new Animated.Value(0.95)).current;
  const cardsTranslateY = useRef(new Animated.Value(30)).current;

  const [showTypewriter, setShowTypewriter] = useState(false);
  const [expandingRole, setExpandingRole] = useState(null);

  // 1. Snappy Initial Reveal (Faster timing, parallel start of typewriter)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(headerInitialSlide, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
    ]).start();

    // Start typewriter ambiently at 150ms, not waiting for header
    setTimeout(() => setShowTypewriter(true), 150);
  }, []);

  // 2. Trigger parallel shift + card pop-in early (at 200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        // Smoothly slide header up to its top position
        Animated.timing(headerMainShift, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.exp)
        }),
        // Pop cards in slightly after shift starts
        Animated.sequence([
          Animated.delay(100),
          Animated.parallel([
            Animated.timing(cardsOpacity, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
            Animated.timing(cardsTranslateY, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
            Animated.timing(cardsScale, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) })
          ])
        ])
      ]).start();
    }, 200);

    return () => clearTimeout(timer);
  }, []);


  const handleExpandStart = (role) => {
    setExpandingRole(role);
    Animated.timing(headerOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    Animated.timing(cardsOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bgWhite, justifyContent: 'center', alignItems: 'center' }]}>
      <CinematicBackground isDark={false} />

      <View style={{ flex: 1, width: '100%', maxWidth: 1000, paddingVertical: isMobile ? 40 : 60, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' }}>

        {/* Orchestrated Header */}
        <Animated.View style={{
          alignItems: 'center',
          opacity: headerOpacity,
          width: '100%',
          transform: [{ translateY: Animated.add(headerInitialSlide, headerMainShift) }]
        }}>
          <View style={[styles.logoPulse, { width: isMobile ? 60 : 72, height: isMobile ? 60 : 72, borderRadius: isMobile ? 30 : 36 }]}>
            <MaterialIcons name="local-fire-department" size={isMobile ? 32 : 40} color={COLORS.bgWhite} />
          </View>
          <ArText style={{ fontSize: isMobile ? 32 : 44, color: COLORS.textMain, marginTop: isMobile ? 16 : 20 }} weight="900">كودفيلات</ArText>
          <ArText style={{ fontSize: isMobile ? 14 : 18, color: COLORS.textMuted, marginTop: 4, marginBottom: isMobile ? 16 : 24 }} align="center">أحدث منصة تسويق بالعمولة في الجزائر</ArText>

          {/* Typewriter (Ambient) */}
          <View style={{ height: 40, justifyContent: 'center', alignItems: 'center' }}>
            {showTypewriter && (
              <TypewriterText
                text="حدد مجال عملك"
                delay={50}
                isMobile={isMobile}
              />
            )}
          </View>
        </Animated.View>

        {/* Pop-up Cards Container (Always in layout, but invisible initially) */}
        <Animated.View style={{
          width: '100%',
          flexDirection: isDesktop ? 'row-reverse' : 'column',
          gap: isMobile ? 16 : 24,
          marginTop: isMobile ? 30 : 40,
          opacity: cardsOpacity,
          transform: [{ translateY: cardsTranslateY }, { scale: cardsScale }]
        }}>
          <PrestigeRoleCard
            role="merchant"
            title="تاجر"
            subtitle="لدي منتجات أريد بيعها وتكبير مشروعي بدون تعقيدات."
            icon="storefront-outline"
            onExpandStart={handleExpandStart}
            onExpandComplete={onSelect}
            isHidden={expandingRole === 'affiliate'}
            isMobile={isMobile}
          />
          <PrestigeRoleCard
            role="affiliate"
            title="مسوق"
            subtitle="أريد روابط جاهزة لتسويق المنتجات والربح فوراً."
            icon="rocket-launch-outline"
            onExpandStart={handleExpandStart}
            onExpandComplete={onSelect}
            isHidden={expandingRole === 'merchant'}
            isMobile={isMobile}
          />
        </Animated.View>

      </View>
    </View>
  );
};

// --- EPIPHANY BLOCK (The "Aha!" Moment) ---
const EpiphanyBlock = ({ text, isMobile }) => {
  return (
    // Removed delay, triggers instantly on scroll
    <SpringReveal direction="up" style={styles.epiphanyWrapper}>
      <LinearGradient colors={['rgba(255,255,255,1)', 'rgba(248,249,250,0.9)']} style={[styles.epiphanyBox, { padding: isMobile ? 30 : 50 }]}>
        <View style={styles.epiphanyIcon}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={30} color={COLORS.gold} />
        </View>
        <ArText style={{ fontSize: isMobile ? 18 : 24, color: COLORS.textMain, lineHeight: isMobile ? 36 : 46, fontStyle: 'italic' }} weight="800" align="center">
          {text}
        </ArText>
        <ArText style={{ fontSize: isMobile ? 16 : 20, color: COLORS.accentMint, marginTop: 20 }} weight="900" align="center">نعم، بالضبط هكذا! 🔥</ArText>
      </LinearGradient>
    </SpringReveal>
  );
};

// --- PAIN VS GAIN MODULE ---
const PainVsGain = ({ data, isDesktop, isMobile }) => (
  <View style={[styles.comparisonWrapper, { paddingHorizontal: isMobile ? 16 : 40 }]}>
    <SpringReveal direction="up" style={{ width: '100%' }}>
      <ArText style={{ fontSize: isMobile ? 36 : 48, color: COLORS.textMain, marginBottom: isMobile ? 30 : 60 }} weight="900" align="center">الفارق <Text style={{ color: COLORS.primary }}>شاسع.</Text></ArText>

      <View style={{ flexDirection: isDesktop ? 'row-reverse' : 'column', gap: 24, width: '100%', alignItems: 'stretch' }}>

        {/* The Old Way */}
        <View style={[styles.compBox, styles.compBoxOld, { padding: isMobile ? 30 : 50 }]}>
          <View style={styles.compHeader}>
            <MaterialCommunityIcons name="close-circle-outline" size={28} color={COLORS.textLight} />
            <ArText style={{ fontSize: isMobile ? 22 : 28, color: COLORS.textMuted }} weight="900">الطريقة القديمة المنهكة</ArText>
          </View>
          <View style={{ gap: 16, marginTop: 24 }}>
            {data.oldWay.map((text, i) => (
              <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 }}>
                <MaterialIcons name="close" size={20} color={COLORS.danger} opacity={0.6} style={{ marginTop: 6 }} />
                <ArText className="strike-through" style={{ fontSize: isMobile ? 16 : 20, flex: 1, lineHeight: isMobile ? 28 : 32 }} align="right">{text}</ArText>
              </View>
            ))}
          </View>
        </View>

        {/* The New Way (Masterclass Dark Mode) */}
        <View style={[styles.compBox, styles.compBoxNew, { padding: isMobile ? 30 : 50 }]}>
          <CinematicBackground isDark={true} />
          <View style={[styles.compHeader, { borderColor: 'rgba(255,255,255,0.1)' }]}>
            <MaterialCommunityIcons name="check-decagram" size={32} color={COLORS.accentMint} />
            <ArText style={{ fontSize: isMobile ? 22 : 32, color: COLORS.bgWhite }} weight="900">الراحة مع كودفيلات</ArText>
          </View>
          <ArText style={{ fontSize: isMobile ? 18 : 24, color: 'rgba(255,255,255,0.95)', lineHeight: isMobile ? 34 : 42, marginTop: 24 }} align="right">
            {data.newWay}
          </ArText>
        </View>

      </View>
    </SpringReveal>
  </View>
);

// --- THE NEW "SPATIAL EDITORIAL" FEATURE BLOCK (No Cards) ---
const EditorialFeatureRow = ({ feat, index, isDesktop, isMobile }) => {
  const isEven = index % 2 === 0;

  return (
    <View style={[styles.editorialRow, { flexDirection: isDesktop ? (isEven ? 'row-reverse' : 'row') : 'column' }]}>

      {/* Ghost Watermark Anchor */}
      {!isMobile && (
        <Animated.View style={[styles.watermarkAnchor, isEven ? { left: isDesktop ? -50 : -20 } : { right: isDesktop ? -50 : -20 }]}>
          <MaterialCommunityIcons name={feat.icon} size={isDesktop ? 300 : 200} color={COLORS.primary} style={{ opacity: 0.03 }} />
        </Animated.View>
      )}

      {/* Content Col (Delay 0 for instant scroll reveal) */}
      <SpringReveal direction={isEven && !isMobile ? "right" : "left"} style={{ flex: 1, zIndex: 10, paddingVertical: isMobile ? 20 : 60, alignItems: isDesktop ? (isEven ? "flex-end" : "flex-start") : "center" }}>

        {/* Subtle Accent Mark */}
        {isDesktop && <View style={[styles.editorialAccent, !isEven && { alignSelf: 'flex-start' }]} />}

        <View style={{ flexDirection: isMobile ? 'column' : 'row-reverse', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <View style={[styles.editorialIconSolid, { width: isMobile ? 56 : 64, height: isMobile ? 56 : 64, borderRadius: isMobile ? 28 : 32 }]}>
            <MaterialCommunityIcons name={feat.icon} size={isMobile ? 28 : 32} color={COLORS.bgWhite} />
          </View>
          <ArText style={{ fontSize: isDesktop ? 42 : (isMobile ? 28 : 32), color: COLORS.textMain }} weight="900" align={isMobile ? "center" : "right"}>{feat.title}</ArText>
        </View>

        <ArText style={{ fontSize: isMobile ? 18 : 22, color: COLORS.textMuted, lineHeight: isMobile ? 32 : 42, maxWidth: 650 }} align={isMobile ? "center" : (isDesktop && !isEven ? "left" : "right")}>
          {feat.desc}
        </ArText>
      </SpringReveal>

    </View>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isMobile = width < 768;
  const [role, setRole] = useState(null);
  const scrollRef = useRef(null);
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
    Tajawal_900Black,
  });

  useEffect(() => { if (role && scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: true }); }, [role]);

  const onLayoutRootView = useCallback(async () => { if (fontsLoaded) await SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;

  if (!role) {
    return (
      <View style={styles.container} onLayout={onLayoutRootView}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgWhite} />
        <PrestigeGate onSelect={setRole} isDesktop={isDesktop} isMobile={isMobile} />
      </View>
    );
  }

  const content = ROLE_DATA[role];

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgMain} />

      {/* BACKGROUND GEOMETRY */}
      <CinematicBackground />

      {/* HEADER */}
      <View style={[styles.header, Platform.OS === 'web' && { className: 'glass-panel' }]}>
        <View style={[styles.headerContainer, { paddingHorizontal: isMobile ? 20 : 40 }]}>
          <View style={{ flexDirection: 'row-reverse', gap: isMobile ? 12 : 20, alignItems: 'center' }}>
            <ImpactButton title="حساب جديد" primary={true} style={{ paddingVertical: isMobile ? 8 : 12, paddingHorizontal: isMobile ? 16 : 28 }} isMobile={isMobile} onPress={() => router.push('/register')} />
            {!isMobile && (
              <Pressable onPress={() => router.push('/login')}>
                <ArText style={{ fontSize: 16, color: COLORS.textMuted }} weight="700">تسجيل الدخول</ArText>
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => setRole(null)} style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <MaterialIcons name="local-fire-department" size={isMobile ? 28 : 36} color={COLORS.accentMint} style={{ marginLeft: 6 }} />
            <ArText style={{ color: COLORS.primary, fontSize: isMobile ? 22 : 30 }} weight="900">كودفيلات</ArText>
          </Pressable>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

        {/* HERO SECTION (Ultra Tight Delays: 0, 100, 200, 300) */}
        <View style={[styles.heroSection, { paddingTop: isMobile ? 160 : 220, paddingBottom: isMobile ? 40 : 80 }]}>
          <View style={styles.heroContent}>
            <SpringReveal direction="up" delay={0}>
              <View style={[styles.pill, { paddingVertical: isMobile ? 8 : 12, paddingHorizontal: isMobile ? 20 : 30 }]}><ArText style={{ color: COLORS.primary, fontSize: isMobile ? 14 : 18, letterSpacing: 1 }} weight="800">{content.heroPill}</ArText></View>
            </SpringReveal>
            <SpringReveal direction="zoom" delay={100}>
              <ArText style={{ fontSize: isDesktop ? 96 : (isMobile ? 42 : 64), color: COLORS.textMain }} weight="900" align="center">
                {content.heroTitle[0]}
              </ArText>
              <ArText style={{ fontSize: isDesktop ? 96 : (isMobile ? 42 : 64), color: COLORS.primary, marginTop: isMobile ? 5 : 10 }} weight="900" align="center">
                {content.heroTitle[1]}
              </ArText>
            </SpringReveal>
            <SpringReveal direction="up" delay={200}>
              <ArText style={[styles.heroSub, { fontSize: isMobile ? 18 : 26, lineHeight: isMobile ? 32 : 44 }]} align="center">{content.heroSub}</ArText>
            </SpringReveal>
            {/* CTA: Delay 300ms (Down from 700!) */}
            <SpringReveal direction="up" delay={300} style={{ width: isMobile ? '100%' : 'auto' }}>
              <ImpactButton title={role === 'merchant' ? "اشترك الآن" : "ابدأ الآن مجاناً"} primary={true} icon="arrow-back" style={{ minWidth: isMobile ? '100%' : 320, paddingVertical: isMobile ? 18 : 24, marginBottom: isMobile ? 20 : 40 }} isMobile={isMobile} onPress={() => router.push('/register')} />
            </SpringReveal>
          </View>
        </View>

        {/* PAIN VS GAIN */}
        <PainVsGain data={content.comparison} isDesktop={isDesktop} isMobile={isMobile} />

        {/* THE "AHA!" EPIPHANY BLOCK */}
        <View style={{ marginBottom: isMobile ? 40 : 60, marginTop: isMobile ? 20 : 40 }}>
          <EpiphanyBlock text={content.epiphany} isMobile={isMobile} />
        </View>

        {/* SHOWSTOPPER (Cinematic Dark Feature Zone) */}
        <View style={[styles.showstopperWrapper, { paddingHorizontal: isMobile ? 16 : 40 }]}>
          <LinearGradient colors={[COLORS.primaryHover, '#0F291E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.showstopperBox, { paddingVertical: isMobile ? 60 : 120, paddingHorizontal: isMobile ? 24 : 40, borderRadius: isMobile ? 30 : 50 }]}>
            <CinematicBackground isDark={true} />
            <SpringReveal direction="zoom" delay={0} style={{ alignItems: 'center', width: '100%', maxWidth: 900, zIndex: 10 }}>
              <View style={[styles.showstopperTag, { paddingVertical: isMobile ? 8 : 10, paddingHorizontal: isMobile ? 16 : 24 }]}>
                <ArText style={{ color: COLORS.bgWhite, fontSize: isMobile ? 14 : 18, letterSpacing: 1 }} weight="900">{content.showstopper.tag}</ArText>
              </View>

              <View style={{ flexDirection: isDesktop ? 'row-reverse' : 'column', alignItems: 'center', gap: isMobile ? 20 : 30, marginBottom: isMobile ? 20 : 30 }}>
                <View style={[styles.showstopperIconPulse, { width: isMobile ? 70 : 100, height: isMobile ? 70 : 100, borderRadius: isMobile ? 35 : 50 }]}>
                  <MaterialCommunityIcons name={content.showstopper.icon} size={isMobile ? 36 : 60} color={COLORS.primaryHover} />
                </View>
                <ArText className="text-glow" style={{ fontSize: isDesktop ? 56 : (isMobile ? 32 : 44), color: COLORS.bgWhite, flexShrink: 1 }} weight="900" align="center">
                  {content.showstopper.title}
                </ArText>
              </View>

              <ArText style={{ fontSize: isMobile ? 16 : 22, color: 'rgba(255,255,255,0.85)', lineHeight: isMobile ? 30 : 42 }} align="center">
                {content.showstopper.desc}
              </ArText>
            </SpringReveal>
          </LinearGradient>
        </View>

        {/* OPEN SPATIAL FEATURES (Card-less Editorial Design) */}
        <View style={[styles.editorialSection, { paddingHorizontal: isMobile ? 20 : 40 }]}>
          <SpringReveal direction="up" style={{ marginBottom: isMobile ? 30 : 60 }}>
            <ArText style={{ fontSize: isMobile ? 36 : 56, color: COLORS.textMain, marginBottom: 16 }} weight="900" align="center">لماذا <Text style={{ color: COLORS.primary }}>كودفيلات؟</Text></ArText>
          </SpringReveal>

          <View style={{ width: '100%', gap: isDesktop ? 120 : (isMobile ? 40 : 80) }}>
            {content.features.map((feat, i) => (
              <EditorialFeatureRow key={i} feat={feat} index={i} isDesktop={isDesktop} isMobile={isMobile} />
            ))}
          </View>
        </View>

        {/* EXPLOSIVE CTA (Deep Contrast) */}
        <View style={[styles.ctaSection, { paddingVertical: isMobile ? 80 : 140 }]}>
          <CinematicBackground isDark={true} />
          <SpringReveal direction="up" style={{ zIndex: 10, alignItems: 'center', width: '100%', paddingHorizontal: isMobile ? 20 : 0 }}>
            <MaterialIcons name="local-fire-department" size={isMobile ? 60 : 80} color={COLORS.accentMint} style={{ marginBottom: 24 }} />
            <ArText className="text-glow" style={{ fontSize: isDesktop ? 72 : (isMobile ? 36 : 56), color: COLORS.bgWhite, marginBottom: 20 }} weight="900" align="center">وفر جهدك، ضاعف ربحك.</ArText>
            <ArText style={{ fontSize: isMobile ? 18 : 24, color: 'rgba(255,255,255,0.7)', marginBottom: 50, maxWidth: 600, lineHeight: isMobile ? 30 : 38 }} align="center">لا تتأخر، احجز مكانك الآن.</ArText>
            <ImpactButton title={role === 'merchant' ? "اشترك وابدأ رحلتك" : "أنشئ حسابك مجانا"} primary={false} style={{ paddingHorizontal: isMobile ? 20 : 70, paddingVertical: isMobile ? 18 : 26, backgroundColor: COLORS.bgWhite, borderWidth: 0 }} isMobile={isMobile} onPress={() => router.push('/register')} />
          </SpringReveal>
        </View>

        {/* FOOTER */}
        <View style={[styles.footer, { paddingVertical: isMobile ? 40 : 80 }]}>
          <MaterialIcons name="bolt" size={isMobile ? 36 : 50} color={COLORS.accentMint} />
          <ArText style={[styles.footerCopy, { fontSize: isMobile ? 14 : 18 }]}>© 2025 كودفيلات - Codfilate. جيل جديد من التجارة.</ArText>
        </View>

      </ScrollView>
    </View>
  );
}

// --- STYLESHEET ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain },

  // Cinematic Background
  bgSlash: { position: 'absolute', width: '200%', height: 1000, transform: [{ rotate: '-15deg' }, { translateY: -300 }, { translateX: -200 }] },
  bgRing: { position: 'absolute', width: 900, height: 900, borderRadius: 450, borderWidth: 2, top: '-10%', right: '-20%' },
  bgHalfCircle: { position: 'absolute', width: 600, height: 600, borderRadius: 300, bottom: '5%', left: '-10%' },

  // Spatial Gate Matches Screenshot exactly
  logoPulse: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primaryHover, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  typewriterPill: { backgroundColor: 'rgba(116, 198, 157, 0.1)', borderRadius: 50, borderWidth: 1, borderColor: 'rgba(116, 198, 157, 0.3)' },

  prestigeCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 30,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: COLORS.primaryHover,
    shadowOpacity: 0.05,
    shadowRadius: 25,
    elevation: 3
  },
  watermarkIcon: { position: 'absolute', bottom: -20, left: -20, opacity: 0.03, transform: [{ rotate: '-15deg' }] },
  cardIconWrapper: { backgroundColor: 'rgba(116, 198, 157, 0.15)', justifyContent: 'center', alignItems: 'center' },
  cardActionPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(116, 198, 157, 0.15)', borderRadius: 50 },

  expandingCircle: { position: 'absolute', width: 30, height: 30, borderRadius: 15, top: '50%', left: '50%', marginTop: -15, marginLeft: -15, zIndex: 0 },

  // Header
  header: { position: 'absolute', top: 0, width: '100%', height: 80, zIndex: 100, justifyContent: 'center', backgroundColor: 'rgba(248,249,250,0.85)', borderBottomWidth: 1, borderColor: COLORS.border },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1400, alignSelf: 'center', width: '100%' },

  // Buttons
  btnBase: { borderRadius: 100, justifyContent: 'center', alignItems: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 2, borderColor: COLORS.primary },

  // Hero
  heroSection: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, position: 'relative' },
  heroContent: { maxWidth: 1100, alignItems: 'center', zIndex: 10, width: '100%' },
  heroSub: { color: COLORS.textMuted, maxWidth: 900, marginVertical: 30 },
  pill: { backgroundColor: COLORS.bgWhite, borderRadius: 50, marginBottom: 30, borderWidth: 1, borderColor: COLORS.accentMint, shadowColor: COLORS.border, shadowOpacity: 1, shadowRadius: 20 },

  // Epiphany Block
  epiphanyWrapper: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 20, zIndex: 20 },
  epiphanyBox: { borderRadius: 40, borderWidth: 2, borderColor: COLORS.gold, shadowColor: COLORS.gold, shadowOpacity: 0.15, shadowRadius: 40, elevation: 15, alignItems: 'center', position: 'relative' },
  epiphanyIcon: { position: 'absolute', top: -28, backgroundColor: COLORS.bgWhite, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.gold },

  // Pain vs Gain
  comparisonWrapper: { width: '100%', maxWidth: 1300, alignSelf: 'center', paddingBottom: 60, paddingTop: 60 },
  compBox: { flex: 1, borderRadius: 40, overflow: 'hidden', position: 'relative', borderWidth: 1 },
  compBoxOld: { backgroundColor: COLORS.bgWhite, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 30 },
  compBoxNew: { backgroundColor: COLORS.primaryHover, borderColor: COLORS.primaryHover, shadowColor: COLORS.primaryHover, shadowOpacity: 0.4, shadowRadius: 50, elevation: 20 },
  compHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)', paddingBottom: 24 },

  // Showstopper
  showstopperWrapper: { width: '100%', maxWidth: 1400, alignSelf: 'center', marginTop: 40, marginBottom: 40 },
  showstopperBox: { width: '100%', alignItems: 'center', shadowColor: COLORS.primaryHover, shadowOpacity: 0.5, shadowRadius: 60, elevation: 30, position: 'relative', overflow: 'hidden' },
  showstopperTag: { backgroundColor: 'rgba(116, 198, 157, 0.15)', borderRadius: 40, marginBottom: 30, borderWidth: 1, borderColor: COLORS.accentMint },
  showstopperIconPulse: { backgroundColor: COLORS.accentMint, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.accentMint, shadowOpacity: 0.8, shadowRadius: 40 },

  // Spatial Editorial Features (Card-less)
  editorialSection: { paddingVertical: 60, width: '100%', maxWidth: 1300, alignSelf: 'center' },
  editorialRow: { width: '100%', position: 'relative', alignItems: 'center' },
  watermarkAnchor: { position: 'absolute', top: '5%', zIndex: 0 },
  editorialAccent: { width: 60, height: 6, backgroundColor: COLORS.accentMint, borderRadius: 3, marginBottom: 24, alignSelf: 'flex-end' },
  editorialIconSolid: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 15 },

  // CTA Card
  ctaSection: { width: '100%', backgroundColor: COLORS.primaryHover, alignItems: 'center', position: 'relative', overflow: 'hidden', marginTop: 40 },

  // Footer
  footer: { alignItems: 'center', backgroundColor: COLORS.bgMain },
  footerCopy: { marginTop: 16, color: COLORS.textMuted }
});

// --- END OF FILE App.js ---