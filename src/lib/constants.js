import { appConfig } from './appConfig';

export const APP_NAME = appConfig.appName;
export const APP_NAME_AR = appConfig.appNameAr;
export const APP_SCHEME = appConfig.slug;
export const APP_DOMAIN = appConfig.domain;

/**
 * أربعة أدوار: الإدارة العليا (admin)، المدير الإقليمي، التاجر، المسوق.
 */
export const ROLES = {
  DEVELOPER: 'developer',
  ADMIN: 'admin',
  MERCHANT: 'merchant',
  AFFILIATE: 'affiliate',
  REGIONAL_MANAGER: 'regional_manager',
  DELIVERY: 'delivery', // Internal/Staff role or legacy mapping
};

// Internal DB Enums
export const ORDER_STATUS = {
  PENDING: 'pending',
  AWAITING_MARKETER: 'awaiting_marketer',
  CONFIRMED: 'confirmed',
  CONFIRMED_BY_MANAGER: 'confirmed_by_manager',
  PAID: 'paid',
  SHIPPED: 'shipped',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Arabic UI Translations for Statuses
export const ORDER_STATUS_AR = {
  pending: '⏳ معلقة',
  awaiting_marketer: 'بانتظار المسوق',
  confirmed: '✅ مؤكدة',
  confirmed_by_manager: '✅ مؤكدة',
  paid: 'مدفوع',
  shipped: 'shipped',
  picked_up: 'تحت الاستلام',
  in_transit: '🚚 قيد التوصيل',
  delivered: '📦 تم التوصيل',
  returned: '↩️ مرتجعة',
  failed: 'فشل التوصيل',
  cancelled: '❌ ملغاة',
};

export const TRACKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED_BY_MANAGER: 'confirmed_by_manager',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
};

export const TRACKING_STATUS_AR = {
  pending: '⏳ معلقة',
  confirmed_by_manager: '✅ مؤكدة',
  picked_up: '🚚 قيد التوصيل',
  in_transit: '🚚 قيد التوصيل',
  delivered: '📦 تم التوصيل',
  returned: '↩️ مرتجعة',
  failed: '❌ ملغاة',
};

export const DELIVERY_TYPES = {
  HOME: 'home',
  OFFICE: 'office',
};

export const DELIVERY_TYPES_AR = {
  home: 'توصيل للمنزل',
  office: 'توصيل للمكتب',
};

export const COMMISSION_STATUS_AR = {
  pending: 'قيد الانتظار',
  approved: 'مقبول',
  paid: 'مدفوع',
  rejected: 'مرفوض',
};

export const COMMISSION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  REJECTED: 'rejected',
};

export const ORDER_STATUS_COLORS = {
  pending: '#FDCB6E',
  awaiting_marketer: '#A29BFE',
  confirmed: '#00B894',
  confirmed_by_manager: '#00B894',
  paid: '#00B894',
  shipped: '#6C5CE7',
  picked_up: '#0984E3',
  in_transit: '#0984E3',
  delivered: '#2D6A4F',
  returned: '#E17055',
  failed: '#D63031',
  cancelled: '#FF6B6B',
};

// Fixed fees
export const PLATFORM_FEE = 200;        // DZD — deducted from marketer profit
export const ADMIN_FEE = 50;            // DZD — per successful order
export const REGIONAL_MANAGER_FEE = 150; // DZD — per successful order

export const DEFAULT_STORE_COLORS = {
  primary: appConfig.theme.primaryColor,
  secondary: appConfig.theme.secondaryColor,
  accent: appConfig.theme.accentColor,
};

export const PAGINATION_LIMIT = 20;

export const LISTING_STATUS_AR = {
  draft: 'مسودة',
  pending_review: 'بانتظار المراجعة',
  published: 'منشور',
  rejected: 'مرفوض',
};

// Wilayas — only loaded if locale.wilayas is enabled
export const ALGERIAN_WILAYAS = appConfig.locale.wilayas ? [
  "أدرار - Adrar", "الشلف - Chlef", "الأغواط - Laghouat", "أم البواقي - Oum El Bouaghi",
  "باتنة - Batna", "بجاية - Béjaïa", "بسكرة - Biskra", "بشار - Béchar",
  "البليدة - Blida", "البويرة - Bouira", "تمنراست - Tamanrasset", "تبسة - Tébessa",
  "تلمسان - Tlemcen", "تيارت - Tiaret", "تيزي وزو - Tizi Ouzou", "الجزائر - Alger",
  "الجلفة - Djelfa", "جيجل - Jijel", "سطيف - Sétif", "سعيدة - Saïda",
  "سكيكدة - Skikda", "سيدي بلعباس - Sidi Bel Abbès", "عنابة - Annaba", "قالمة - Guelma",
  "قسنطينة - Constantine", "المدية - Médéa", "مستغانم - Mostaganem", "المسيلة - M'Sila",
  "معسكر - Mascara", "ورقلة - Ouargla", "وهران - Oran", "البيض - El Bayadh",
  "إيليزي - Illizi", "برج بوعريريج - Bordj Bou Arréridj", "بومرداس - Boumerdès", "الطارف - El Tarf",
  "تندوف - Tindouf", "تيسمسيلت - Tissemsilt", "الوادي - El Oued", "خنشلة - Khenchela",
  "سوق أهراس - Souk Ahras", "تيبازة - Tipaza", "ميلة - Mila", "عين الدفلى - Aïn Defla",
  "النعامة - Naâma", "عين تموشنت - Aïn Témouchent", "غرداية - Ghardaïa", "غليزان - Relizane",
  "تيميمون - Timimoun", "برج باجي مختار - Bordj Badji Mokhtar", "أولاد جلال - Ouled Djellal", "بني عباس - Béni Abbès",
  "إن صالح - In Salah", "إن قزام - In Guezzam", "تقرت - Touggourt", "جانت - Djanet",
  "المغير - El M'Ghair", "المنيعة - El Meniaa"
] : [];
