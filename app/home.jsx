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
  Tajawal_800ExtraBold
} from '@expo-google-fonts/tajawal';
import * as SplashScreen from 'expo-splash-screen';

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
      ::-webkit-scrollbar { width: 6px; background: #F8F9FA; }
      ::-webkit-scrollbar-thumb { background: #74C69D; border-radius: 10px; }
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

// --- CORE UI COMPONENTS ---
const ArText = ({ style, children, weight = '400', align = 'right', className, ...props }) => {
  let fontFamily = 'Tajawal_400Regular';
  if (weight === '500') fontFamily = 'Tajawal_500Medium';
  if (weight === '700') fontFamily = 'Tajawal_700Bold';
  if (weight === '900' || weight === '800') fontFamily = 'Tajawal_800ExtraBold';

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

// Cinematic Spring Reveal
const SpringReveal = ({ children, delay = 0, style, direction = 'up' }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const viewRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
      }, { threshold: 0.15 });
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

  const translateY = direction === 'up' ? animValue.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) : 0;
  const translateX = direction === 'right' ? animValue.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) : direction === 'left' ? animValue.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) : 0;
  const scale = direction === 'zoom' ? animValue.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) : 1;

  return (
    <Animated.View ref={viewRef} style={[style, { opacity: animValue, transform: [{ translateY }, { translateX }, { scale }] }]}>
      {children}
    </Animated.View>
  );
};

// High-Impact Editorial Button
const ImpactButton = ({ title, icon, onPress, primary = true, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.btnBase, primary ? styles.btnPrimary : styles.btnSecondary, style, { transform: [{ scale }] }]}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ArText style={{ color: primary ? COLORS.bgWhite : COLORS.textMain, fontSize: 18 }} weight="800" align="center">{title}</ArText>
          {icon && <MaterialIcons name={icon} size={24} color={primary ? COLORS.bgWhite : COLORS.primary} />}
        </View>
      </Animated.View>
    </Pressable>
  );
};

// --- CINEMATIC BACKGROUND GEOMETRY ---
const CinematicBackground = ({ isDark = false }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ])).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinReverse = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <View style={[styles.bgSlash, { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : COLORS.primaryLight }]} />
      <Animated.View style={[styles.bgRing, { borderColor: isDark ? 'rgba(116, 198, 157, 0.1)' : 'rgba(45, 106, 79, 0.05)', transform: [{ rotate: spin }] }]} />
      <Animated.View style={[styles.bgHalfCircle, { backgroundColor: isDark ? 'rgba(116, 198, 157, 0.05)' : 'rgba(116, 198, 157, 0.1)', transform: [{ translateY }, { rotate: spinReverse }, { scale: pulseAnim }] }]} />
    </View>
  );
};

// --- PSYCHOLOGICAL UX DATA ---
const ROLE_DATA = {
  merchant: {
    gateSubtitle: "لدي منتجات. جاهز للاشتراك وبناء إمبراطوريتي بدون وجع رأس.",
    heroPill: "اشتراك واحد يحل كل مشاكلك",
    heroTitle: ["أضف منتجك فقط،", "نحن نتكفل بالباقي."],
    heroSub: "لا تضيع حياتك في البحث عن مسوقين أو إدارة شركات التوصيل. اشترك معنا، ارفع منتجاتك، وسيقوم جيش من المسوقين ببيعها فوراً. المرتجعات؟ نحن نتحملها. وفوق كل هذا، متجرك الإلكتروني مجاني للأبد.",
    epiphany: "«لحظة... يعني أدفع اشتراكاً بسيطاً، فأحصل على مسوقين يبيعون لي، وشركة توصل طلباتي، ولا أتحمل همّ المرتجعات أبداً... وفوق هذا متجر إلكتروني باسمي للأبد مجاناً؟»",
    ticker: ["لا تقلق من المرتجعات 100%", "•", "متجر مجاني مدى الحياة مع الاشتراك", "•", "تسويق تلقائي عبر جيش المسوقين", "•", "سيولة نقدية فورية", "•"],
    comparison: {
      oldWay: [
        "دفع آلاف الدنانير لتصميم متجر إلكتروني",
        "البحث عن مسوقين موثوقين ومتابعتهم يومياً",
        "التعامل مع شركات التوصيل ومشاكلها",
        "تحمل خسائر المنتجات المرتجعة بالكامل!"
      ],
      newWay: "باشتراكك معنا، تحصل على متجر احترافي يبقى معك للأبد. أنت تضيف المنتجات فقط! المسوقون يبيعون، نحن نوصل للعميل، ونحن من نتحمل المرتجعات. أرباحك الصافية تنزل في حسابك، نقطة."
    },
    showstopper: {
      tag: "الهدية التي لا تقدر بثمن 🎁",
      title: "متجرك الإلكتروني.. لك للأبد!",
      desc: "لن تدفع لمبرمج أبداً. باشتراكك كتاجر، نمنحك متجراً إلكترونياً احترافياً يحمل اسمك وشعارك، وهو ملكك مدى الحياة! حتى لو توقفت، المتجر يبقى لك. استخدمه لعرض منتجاتك للعملاء أو لجيش المسوقين المتواجد في المنصة.",
      icon: "storefront-outline"
    },
    features: [
      { icon: "shield-check-outline", title: "صفر قلق من المرتجعات", desc: "أكبر كابوس للتجار انتهى! نحن نتكفل بتوصيل الطلبات، وإذا تم إرجاع الطلب، نحن نتحمل التكلفة بالكامل، لتركز فقط على جلب منتجات جديدة." },
      { icon: "account-group-outline", title: "جيش تسويقي تحت أمرك", desc: "لا تصرف ديناراً واحداً على الإعلانات. بمجرد وضعك للمنتج، يراه آلاف المسوقين المحترفين ويبدأون بالترويج له في كل المنصات لجلب المبيعات." },
    ]
  },
  affiliate: {
    gateSubtitle: "لا أريد تعقيدات. أريد روابط جاهزة لأحصد العمولات.",
    heroPill: "أسهل نظام أفلييت في الجزائر",
    heroTitle: ["انسَ النسخ واللصق.", "سوّق بضغطة زر."],
    heroSub: "الطريقة القديمة ماتت. لا حاجة لحفظ صور المنتجات أو بناء صفحات هبوط معقدة. تصفح المنتجات، ولّد صفحة هبوط مجانية بضغطة واحدة، وابدأ بجمع الأرباح فوراً.",
    epiphany: "«لحظة... يعني أختار المنتج، وبضغطة زر أحصل على صفحة هبوط احترافية مجانية بالكامل، وكل ما علي فعله هو إطلاق الإعلان وجمع الأرباح؟»",
    ticker: ["مولد صفحات هبوط مجاني 100%", "•", "قوالب احترافية جاهزة للتحويل", "•", "إشعارات فورية بالمبيعات", "•", "تتبع دقيق وشفاف", "•"],
    comparison: {
      oldWay: [
        "حفظ مئات الصور يدوياً في هاتفك",
        "نسخ ولصق وصف كل منتج للعملاء",
        "دفع اشتراكات شهرية باهظة لبرامج صفحات الهبوط",
        "تتبع المبيعات والعمولات يدوياً وبصعوبة"
      ],
      newWay: "ضغطة زر واحدة = صفحة هبوط احترافية ومجهزة بالكامل برابطك الخاص! جاهزة للإطلاق في إعلاناتك خلال 3 ثوانٍ فقط، وبدون دفع أي سنت من جيبك."
    },
    showstopper: {
      tag: "سلاحك السري لتدمير المنافسة 🚀",
      title: "مولد صفحات الهبوط المجاني",
      desc: "صممنا لك أداة سحرية ستغير طريقة عملك. اختر منتجاً يعجبك، اضغط على 'توليد صفحة'، وسيقوم نظامنا بإنشاء صفحة هبوط احترافية (High-Converting) تحتوي على كل الصور والأوصاف، مدمجة برابطك الخاص. صفر مجهود تقني، 100% أرباح.",
      icon: "web"
    },
    features: [
      { icon: "magnify", title: "كتالوج منتجات لا ينضب", desc: "وفرنا لك مئات المنتجات المختارة بعناية، المضمونة الطلب، وذات هوامش الربح العالية. تُحدّث يومياً لتسبق الجميع وتختار ما يناسب حملاتك." },
      { icon: "bell-ring-outline", title: "نبض الأرباح في هاتفك", desc: "لا شيء يضاهي متعة سماع رنة المبيعة! نظام تتبع دقيق يرصد كل نقرة وحالة طلب بشفافية مطلقة مباشرة من لوحة تحكمك، لحظة بلحظة." },
    ]
  }
};

// --- THE DESIRE GATE (Dark Cinematic Entry) ---
const PrestigeGate = ({ onSelect }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const handleSelect = (role) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true }).start(() => onSelect(role));
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.primaryHover, zIndex: 1000, opacity: fadeAnim }]}>
      <CinematicBackground isDark={true} />
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row-reverse' : 'column' }}>

        {/* Merchant Prompt */}
        <Pressable onPress={() => handleSelect('merchant')} style={({ pressed }) => [styles.gateSide, { backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent' }]}>
          <SpringReveal direction="up" delay={200} style={{ alignItems: 'center' }}>
            <View style={[styles.gateIconWrapper, { borderColor: COLORS.accentMint, borderWidth: 1 }]}>
              <MaterialCommunityIcons name="storefront-outline" size={80} color={COLORS.accentMint} />
            </View>
            <ArText style={{ fontSize: isDesktop ? 72 : 56, color: COLORS.bgWhite, marginTop: 32 }} weight="900">تاجر</ArText>
            <ArText style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)', marginTop: 16, maxWidth: 380, lineHeight: 34 }} align="center">{ROLE_DATA.merchant.gateSubtitle}</ArText>
          </SpringReveal>
        </Pressable>

        {/* Divider */}
        {isDesktop ? <View style={styles.gateDividerV} /> : <View style={styles.gateDividerH} />}

        {/* Affiliate Prompt */}
        <Pressable onPress={() => handleSelect('affiliate')} style={({ pressed }) => [styles.gateSide, { backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent' }]}>
          <SpringReveal direction="up" delay={400} style={{ alignItems: 'center' }}>
            <View style={[styles.gateIconWrapper, { borderColor: COLORS.bgWhite, borderWidth: 1 }]}>
              <MaterialCommunityIcons name="rocket-launch-outline" size={80} color={COLORS.bgWhite} />
            </View>
            <ArText style={{ fontSize: isDesktop ? 72 : 56, color: COLORS.bgWhite, marginTop: 32 }} weight="900">مسوق</ArText>
            <ArText style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)', marginTop: 16, maxWidth: 380, lineHeight: 34 }} align="center">{ROLE_DATA.affiliate.gateSubtitle}</ArText>
          </SpringReveal>
        </Pressable>

      </View>

      <View style={styles.gateCenterPrompt} pointerEvents="none">
        <SpringReveal direction="zoom" delay={600}>
          <View style={[styles.gateCenterPill, { className: 'glass-panel' }]}>
            <ArText style={{ fontSize: 24, color: COLORS.bgWhite, letterSpacing: 1 }} weight="900">حدد مسارك للنجاح</ArText>
          </View>
        </SpringReveal>
      </View>
    </Animated.View>
  );
};

// --- EPIPHANY BLOCK (The "Aha!" Moment) ---
const EpiphanyBlock = ({ text }) => {
  return (
    <SpringReveal direction="up" delay={800} style={styles.epiphanyWrapper}>
      <LinearGradient colors={['rgba(255,255,255,1)', 'rgba(248,249,250,0.9)']} style={styles.epiphanyBox}>
        <View style={styles.epiphanyIcon}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={36} color={COLORS.gold} />
        </View>
        <ArText style={{ fontSize: 22, color: COLORS.textMain, lineHeight: 40, fontStyle: 'italic' }} weight="800" align="center">
          {text}
        </ArText>
        <ArText style={{ fontSize: 18, color: COLORS.accentMint, marginTop: 16 }} weight="900" align="center">نعم، بالضبط هكذا! 🔥</ArText>
      </LinearGradient>
    </SpringReveal>
  );
};

// --- PAIN VS GAIN MODULE ---
const PainVsGain = ({ data, isDesktop }) => (
  <View style={styles.comparisonWrapper}>
    <SpringReveal direction="up" style={{ width: '100%' }}>
      <ArText style={{ fontSize: 48, color: COLORS.textMain, marginBottom: 60 }} weight="900" align="center">الفارق <Text style={{ color: COLORS.primary }}>شاسع.</Text></ArText>

      <View style={{ flexDirection: isDesktop ? 'row-reverse' : 'column', gap: 30, width: '100%', alignItems: 'stretch' }}>

        {/* The Old Way */}
        <View style={[styles.compBox, styles.compBoxOld]}>
          <View style={styles.compHeader}>
            <MaterialCommunityIcons name="close-circle-outline" size={32} color={COLORS.textLight} />
            <ArText style={{ fontSize: 28, color: COLORS.textMuted }} weight="900">الطريقة القديمة المنهكة</ArText>
          </View>
          <View style={{ gap: 20, marginTop: 30 }}>
            {data.oldWay.map((text, i) => (
              <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 16 }}>
                <MaterialIcons name="close" size={24} color={COLORS.danger} opacity={0.5} />
                <ArText className="strike-through" style={{ fontSize: 20, flex: 1 }} align="right">{text}</ArText>
              </View>
            ))}
          </View>
        </View>

        {/* The New Way (Masterclass Dark Mode) */}
        <View style={[styles.compBox, styles.compBoxNew]}>
          <CinematicBackground isDark={true} />
          <View style={[styles.compHeader, { borderColor: 'rgba(255,255,255,0.1)' }]}>
            <MaterialCommunityIcons name="check-decagram" size={36} color={COLORS.accentMint} />
            <ArText style={{ fontSize: 32, color: COLORS.bgWhite }} weight="900">الراحة مع كودفيلات</ArText>
          </View>
          <ArText style={{ fontSize: 24, color: 'rgba(255,255,255,0.95)', lineHeight: 42, marginTop: 30 }} align="right">
            {data.newWay}
          </ArText>
        </View>

      </View>
    </SpringReveal>
  </View>
);

// --- THE NEW "SPATIAL EDITORIAL" FEATURE BLOCK (No Cards) ---
const EditorialFeatureRow = ({ feat, index, isDesktop }) => {
  const isEven = index % 2 === 0;

  return (
    <View style={[styles.editorialRow, { flexDirection: isDesktop ? (isEven ? 'row-reverse' : 'row') : 'column' }]}>

      {/* Massive Ghost Watermark Anchor */}
      <Animated.View style={[styles.watermarkAnchor, isEven ? { left: isDesktop ? -50 : -20 } : { right: isDesktop ? -50 : -20 }]}>
        <MaterialCommunityIcons name={feat.icon} size={isDesktop ? 300 : 200} color={COLORS.primary} style={{ opacity: 0.04 }} />
      </Animated.View>

      {/* Content Col */}
      <SpringReveal direction={isEven ? "right" : "left"} delay={200} style={{ flex: 1, zIndex: 10, paddingVertical: isDesktop ? 60 : 40, alignItems: isDesktop ? (isEven ? "flex-end" : "flex-start") : "flex-end" }}>

        {/* Subtle Accent Mark */}
        <View style={[styles.editorialAccent, isDesktop && !isEven && { alignSelf: 'flex-start' }]} />

        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <View style={styles.editorialIconSolid}>
            <MaterialCommunityIcons name={feat.icon} size={32} color={COLORS.bgWhite} />
          </View>
          <ArText style={{ fontSize: isDesktop ? 42 : 32, color: COLORS.textMain }} weight="900" align="right">{feat.title}</ArText>
        </View>

        <ArText style={{ fontSize: 22, color: COLORS.textMuted, lineHeight: 42, maxWidth: 650 }} align={isDesktop ? (isEven ? "right" : "left") : "right"}>
          {feat.desc}
        </ArText>
      </SpringReveal>

    </View>
  );
};

// --- INFINITE TICKER ---
const EndlessTicker = ({ items }) => {
  const moveAnim = useRef(new Animated.Value(0)).current;
  const repeated = [...items, ...items, ...items, ...items];
  useEffect(() => {
    moveAnim.setValue(0);
    Animated.loop(Animated.timing(moveAnim, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })).start();
  }, [items]);

  return (
    <View style={styles.tickerContainer}>
      <Animated.View style={[styles.tickerTrack, { transform: [{ translateX: moveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -1500] }) }] }]}>
        {repeated.map((word, i) => (
          <ArText key={i} style={[styles.tickerText, word === "•" && { color: COLORS.accentMint }]} weight="900">{word}</ArText>
        ))}
      </Animated.View>
    </View>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const [role, setRole] = useState(null);
  const scrollRef = useRef(null);

  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });

  useEffect(() => { if (role && scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: true }); }, [role]);

  const onLayoutRootView = useCallback(async () => { if (fontsLoaded) await SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;

  if (!role) {
    return (
      <View style={styles.container} onLayout={onLayoutRootView}>
        <StatusBar barStyle="light-content" />
        <PrestigeGate onSelect={setRole} />
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
        <View style={styles.headerContainer}>
          <View style={{ flexDirection: 'row-reverse', gap: 20, alignItems: 'center' }}>
            <ImpactButton title="حساب جديد" primary={true} style={{ paddingVertical: 12, paddingHorizontal: 28 }} />
            <Pressable onPress={() => setRole(null)}>
              <ArText style={{ fontSize: 18, color: COLORS.textMuted }} weight="700">تغيير الحساب</ArText>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <MaterialIcons name="local-fire-department" size={36} color={COLORS.accentMint} style={{ marginLeft: 10 }} />
            <ArText style={{ color: COLORS.primary, fontSize: 30 }} weight="900">كودفيلات</ArText>
          </View>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <SpringReveal direction="up" delay={100}>
              <View style={styles.pill}><ArText style={{ color: COLORS.primary, fontSize: 18, letterSpacing: 1 }} weight="800">{content.heroPill}</ArText></View>
            </SpringReveal>
            <SpringReveal direction="zoom" delay={300}>
              <ArText style={[styles.heroHeading, { fontSize: isDesktop ? 96 : 56 }]} weight="900" align="center">
                {content.heroTitle[0]}
              </ArText>
              <ArText style={[styles.heroHeading, { fontSize: isDesktop ? 96 : 56, color: COLORS.primary, marginTop: -10 }]} weight="900" align="center">
                {content.heroTitle[1]}
              </ArText>
            </SpringReveal>
            <SpringReveal direction="up" delay={500}>
              <ArText style={styles.heroSub} align="center">{content.heroSub}</ArText>
            </SpringReveal>
            <SpringReveal direction="up" delay={700}>
              <ImpactButton title={role === 'merchant' ? "اشترك الآن وابدأ الإمبراطورية" : "ابدأ الآن مجاناً"} primary={true} icon="arrow-back" style={{ minWidth: 320, paddingVertical: 24, marginBottom: 40 }} />
            </SpringReveal>

            {/* The "Aha!" Epiphany Block */}
            <EpiphanyBlock text={content.epiphany} />

          </View>
        </View>

        {/* PAIN VS GAIN */}
        <PainVsGain data={content.comparison} isDesktop={isDesktop} />

        {/* FULL BLEED TICKER */}
        <EndlessTicker items={content.ticker} />

        {/* SHOWSTOPPER (Cinematic Dark Feature Zone) */}
        <View style={styles.showstopperWrapper}>
          <LinearGradient colors={[COLORS.primaryHover, '#0F291E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.showstopperBox}>
            <CinematicBackground isDark={true} />
            <SpringReveal direction="zoom" delay={200} style={{ alignItems: 'center', width: '100%', maxWidth: 900, zIndex: 10 }}>
              <View style={styles.showstopperTag}>
                <ArText style={{ color: COLORS.bgWhite, fontSize: 18, letterSpacing: 1 }} weight="900">{content.showstopper.tag}</ArText>
              </View>

              <View style={{ flexDirection: isDesktop ? 'row-reverse' : 'column', alignItems: 'center', gap: 30, marginBottom: 30 }}>
                <View style={styles.showstopperIconPulse}>
                  <MaterialCommunityIcons name={content.showstopper.icon} size={60} color={COLORS.primaryHover} />
                </View>
                <ArText className="text-glow" style={{ fontSize: isDesktop ? 56 : 40, color: COLORS.bgWhite, flexShrink: 1 }} weight="900" align={isDesktop ? "right" : "center"}>
                  {content.showstopper.title}
                </ArText>
              </View>

              <ArText style={{ fontSize: isDesktop ? 24 : 20, color: 'rgba(255,255,255,0.85)', lineHeight: 46 }} align="center">
                {content.showstopper.desc}
              </ArText>
            </SpringReveal>
          </LinearGradient>
        </View>

        {/* OPEN SPATIAL FEATURES (Card-less Editorial Design) */}
        <View style={styles.editorialSection}>
          <SpringReveal direction="up" style={{ marginBottom: 60 }}>
            <ArText style={{ fontSize: 56, color: COLORS.textMain, marginBottom: 16 }} weight="900" align="center">المعادلة <Text style={{ color: COLORS.primary }}>الرابحة</Text></ArText>
          </SpringReveal>

          <View style={{ width: '100%', gap: isDesktop ? 120 : 80 }}>
            {content.features.map((feat, i) => (
              <EditorialFeatureRow key={i} feat={feat} index={i} isDesktop={isDesktop} />
            ))}
          </View>
        </View>

        {/* EXPLOSIVE CTA (Deep Contrast) */}
        <View style={styles.ctaSection}>
          <CinematicBackground isDark={true} />
          <SpringReveal direction="up" style={{ zIndex: 10, alignItems: 'center' }}>
            <MaterialIcons name="local-fire-department" size={80} color={COLORS.accentMint} style={{ marginBottom: 24 }} />
            <ArText className="text-glow" style={{ fontSize: isDesktop ? 72 : 48, color: COLORS.bgWhite, marginBottom: 20 }} weight="900" align="center">وفر جهدك، ضاعف ربحك.</ArText>
            <ArText style={{ fontSize: 24, color: 'rgba(255,255,255,0.7)', marginBottom: 50, maxWidth: 600 }} align="center">الآلاف انضموا للطريقة الجديدة. لا تتأخر، احجز مكانك الآن.</ArText>
            <ImpactButton title={role === 'merchant' ? "اشترك وابدأ رحلتك" : "أنشئ حسابك مجاناً وانطلق"} primary={false} style={{ paddingHorizontal: 70, paddingVertical: 26, backgroundColor: COLORS.bgWhite, borderWidth: 0 }} />
          </SpringReveal>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <MaterialIcons name="bolt" size={50} color={COLORS.accentMint} />
          <ArText style={styles.footerCopy}>© 2025 كودفيلات - Codfilate. جيل جديد من التجارة.</ArText>
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

  // Gate
  gateSide: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, transition: 'background-color 0.4s ease' },
  gateIconWrapper: { width: 160, height: 160, borderRadius: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  gateDividerV: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', height: '100%' },
  gateDividerH: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', width: '100%' },
  gateCenterPrompt: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  gateCenterPill: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 20, paddingHorizontal: 50, borderRadius: 60 },

  // Header
  header: { position: 'absolute', top: 0, width: '100%', height: 100, zIndex: 100, justifyContent: 'center', backgroundColor: 'rgba(248,249,250,0.7)', borderBottomWidth: 1, borderColor: COLORS.border },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40, maxWidth: 1400, alignSelf: 'center', width: '100%' },

  // Buttons
  btnBase: { borderRadius: 100, justifyContent: 'center', alignItems: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 2, borderColor: COLORS.primary },

  // Hero
  heroSection: { paddingTop: 220, paddingBottom: 100, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, position: 'relative' },
  heroContent: { maxWidth: 1100, alignItems: 'center', zIndex: 10 },
  heroHeading: { lineHeight: Platform.OS === 'web' ? 110 : 75, color: COLORS.textMain },
  heroSub: { fontSize: 26, color: COLORS.textMuted, lineHeight: 44, maxWidth: 900, marginVertical: 40 },
  pill: { backgroundColor: COLORS.bgWhite, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 50, marginBottom: 40, borderWidth: 1, borderColor: COLORS.accentMint, shadowColor: COLORS.border, shadowOpacity: 1, shadowRadius: 20 },

  // Epiphany Block
  epiphanyWrapper: { width: '100%', maxWidth: 900, marginTop: 20, paddingHorizontal: 20 },
  epiphanyBox: { padding: 40, borderRadius: 40, borderWidth: 2, borderColor: COLORS.gold, shadowColor: COLORS.gold, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10, alignItems: 'center', position: 'relative' },
  epiphanyIcon: { position: 'absolute', top: -24, backgroundColor: COLORS.bgWhite, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.gold },

  // Pain vs Gain
  comparisonWrapper: { paddingHorizontal: 20, width: '100%', maxWidth: 1300, alignSelf: 'center', paddingBottom: 120, paddingTop: 60 },
  compBox: { flex: 1, borderRadius: 40, padding: 50, overflow: 'hidden', position: 'relative', borderWidth: 1 },
  compBoxOld: { backgroundColor: COLORS.bgWhite, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 30 },
  compBoxNew: { backgroundColor: COLORS.primaryHover, borderColor: COLORS.primaryHover, shadowColor: COLORS.primaryHover, shadowOpacity: 0.4, shadowRadius: 50, elevation: 20 },
  compHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)', paddingBottom: 24 },

  // Ticker
  tickerContainer: { width: '100%', backgroundColor: COLORS.primary, paddingVertical: 24, overflow: 'hidden', transform: [{ rotate: '-1.5deg' }, { scale: 1.05 }], marginVertical: 40 },
  tickerTrack: { flexDirection: 'row', width: 5000, alignItems: 'center' },
  tickerText: { color: COLORS.bgWhite, fontSize: 28, marginHorizontal: 40, letterSpacing: 1 },

  // Showstopper
  showstopperWrapper: { paddingHorizontal: 20, width: '100%', maxWidth: 1400, alignSelf: 'center', marginTop: 80, marginBottom: 80 },
  showstopperBox: { width: '100%', borderRadius: 50, paddingVertical: 120, paddingHorizontal: 40, alignItems: 'center', shadowColor: COLORS.primaryHover, shadowOpacity: 0.5, shadowRadius: 60, elevation: 30, position: 'relative', overflow: 'hidden' },
  showstopperTag: { backgroundColor: 'rgba(116, 198, 157, 0.15)', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 40, marginBottom: 40, borderWidth: 1, borderColor: COLORS.accentMint },
  showstopperIconPulse: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.accentMint, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.accentMint, shadowOpacity: 0.8, shadowRadius: 40 },

  // Spatial Editorial Features (Card-less)
  editorialSection: { paddingVertical: 80, paddingHorizontal: 40, width: '100%', maxWidth: 1300, alignSelf: 'center' },
  editorialRow: { width: '100%', position: 'relative', alignItems: 'center' },
  watermarkAnchor: { position: 'absolute', top: '10%', zIndex: 0 },
  editorialAccent: { width: 60, height: 6, backgroundColor: COLORS.accentMint, borderRadius: 3, marginBottom: 24, alignSelf: 'flex-end' },
  editorialIconSolid: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 15 },

  // CTA Card
  ctaSection: { width: '100%', backgroundColor: COLORS.primaryHover, paddingVertical: 140, paddingHorizontal: 20, alignItems: 'center', position: 'relative', overflow: 'hidden', marginTop: 80 },

  // Footer
  footer: { paddingVertical: 80, alignItems: 'center', backgroundColor: COLORS.bgMain },
  footerCopy: { marginTop: 24, color: COLORS.textMuted, fontSize: 18 }
});

// --- END OF FILE App.js ---