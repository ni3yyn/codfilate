import { Stack } from 'expo-router';

export default function PublicCampaignLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        animation: 'slide_from_right',
      }}
    />
  );
}
