# White-Label Customer Setup

Each customer gets their own directory under `customers/` with their branding, assets, and Supabase credentials. The app builds a unique version for each customer by reading from their config.

## Directory Structure

```
customers/
├── default/             ← Your own instance / template
│   ├── config.json      ← Branding, Supabase URL, colors, currency
│   └── assets/          ← App icon, splash, adaptive icon, favicon
├── customer-abc/
│   ├── config.json
│   └── assets/
└── customer-xyz/
    ├── config.json
    └── assets/
```

## Adding a New Customer

### 1. Copy the template

```powershell
Copy-Item -Recurse "customers/default" "customers/my-new-customer"
```

### 2. Edit `customers/my-new-customer/config.json`

Update the following fields:

| Field | Description |
|-------|-------------|
| `customerId` | Unique slug for this customer (e.g., `ali-store`) |
| `appName` | App name shown everywhere (e.g., `Ali Store`) |
| `appNameAr` | Arabic name |
| `slug` | URL-safe slug used for deep linking |
| `bundleId` / `packageName` | Unique iOS/Android identifiers |
| `supabase.url` | Customer's Supabase project URL |
| `supabase.anonKey` | Customer's anon/publishable key |
| `theme.*` | Brand colors |
| `currency.*` | Currency code, locale, symbol |

### 3. Replace assets

Replace the images in `customers/my-new-customer/assets/`:

- `icon.png` — 1024×1024 app icon
- `adaptive-icon.png` — Android foreground (1024×1024, with padding)
- `splash.png` — Splash screen (1242×2436 or similar)
- `favicon.png` — Web favicon (48×48)

### 4. Set up the customer's Supabase project

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` against the new project's SQL editor
3. Run `supabase/migration_categories.sql` for categories support
4. Create storage buckets: `products`, `logos`, `avatars`
5. Set bucket policies to allow authenticated uploads

### 5. Build for the customer

```powershell
$env:CUSTOMER_ID = "my-new-customer"
npx expo start     # For development
npx eas build      # For production (EAS Build)
```

## Config Reference

See `customers/default/config.json` for the complete config schema with all available fields.

## Feature Flags

The `features` object in config.json controls what's available:

| Flag | Default | Description |
|------|---------|-------------|
| `enablePayouts` | `true` | Show payouts/withdrawal tab |
| `enableReferralLinks` | `true` | Allow affiliate link generation |
| `enableMultipleImages` | `true` | Allow multiple product images |
| `enableCategories` | `true` | Show categories management |
| `maxProductImages` | `8` | Max images per product |
| `enableAdminPanel` | `false` | Show platform admin (your use only) |
