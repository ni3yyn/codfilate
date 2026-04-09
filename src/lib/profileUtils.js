/**
 * Wilaya IDs for regional_manager (and wilayah hints on profiles). HQ admin operates at platform scope in the app.
 * Merges primary `wilaya_id` with `assigned_wilayas` (same logic as RLS / triggers).
 */
export function getEffectiveWilayaIds(profile) {
  if (!profile) return [];
  let raw = profile.assigned_wilayas;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      raw = [];
    }
  }
  let ids = [];
  if (Array.isArray(raw)) {
    ids = raw.map((id) => (typeof id === 'string' ? parseInt(id, 10) : id)).filter((n) => n != null && !Number.isNaN(n));
  }
  if (profile.wilaya_id != null && !ids.includes(profile.wilaya_id)) {
    ids.push(profile.wilaya_id);
  }
  return ids;
}
