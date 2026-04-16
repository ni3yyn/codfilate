// ============================================
// Dynamic Expo Config — White-Label SaaS
// ============================================
// Reads from ./customers/<CUSTOMER_ID>/config.json at build time.
// Set CUSTOMER_ID env var to choose which customer to build for.
// Default: 'default'

const fs = require('fs');
const path = require('path');

const customerId = process.env.CUSTOMER_ID || 'default';
const customerDir = path.resolve(__dirname, 'customers', customerId);
const configPath = path.join(customerDir, 'config.json');

if (!fs.existsSync(configPath)) {
  throw new Error(`Customer config not found: ${configPath}\nMake sure customers/${customerId}/config.json exists.`);
}

const customerConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const assetsDir = `./customers/${customerId}/assets`;

module.exports = ({ config: defaultConfig }) => ({
  ...defaultConfig,
  name: customerConfig.appName,
  slug: customerConfig.slug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: `${assetsDir}/icon.png`,
  userInterfaceStyle: 'automatic',
  scheme: customerConfig.slug,
  splash: {
    image: `${assetsDir}/splash.png`,
    resizeMode: 'contain',
    backgroundColor: customerConfig.theme.splashBackground || '#0A0A1A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: customerConfig.bundleId,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: `${assetsDir}/adaptive-icon.png`,
      backgroundColor: customerConfig.theme.splashBackground || '#0A0A1A',
    },
    package: customerConfig.packageName,
  },
  web: {
    favicon: `${assetsDir}/favicon.png`,
  },
  plugins: [
    'expo-router',
    'expo-sharing',
    [
      'expo-build-properties',
      {
        android: {
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          buildArchs: ['arm64-v8a', 'armeabi-v7a'],
        },
      },
    ],
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission: `Allow ${customerConfig.appName} to access your photos to upload product images.`,
      },
    ],
    'expo-font',
    [
      'expo-notifications',
      {
        icon: `${assetsDir}/icon.png`,
        color: customerConfig.theme?.primaryColor || '#6C5CE7',
      },
    ],
  ],
  extra: {
    ...defaultConfig.extra,
    customerConfig: customerConfig,
    customerId: customerId,
  },
});
