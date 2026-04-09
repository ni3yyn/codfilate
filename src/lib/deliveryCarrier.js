import { supabase } from './supabase';

/**
 * Internal shipping is operated by the super admin (headquarters) profile.
 * `delivery_requests.delivery_company_id` stores that profile's id (historical column name).
 */
export async function resolveDeliveryCarrierProfileId(wilayaId) {
  const orWilaya = `wilaya_id.eq.${wilayaId},assigned_wilayas.cs.["${wilayaId}"]`;

  const { data: adminWilaya } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .or(orWilaya)
    .limit(1)
    .maybeSingle();

  if (adminWilaya?.id) return adminWilaya.id;

  const { data: anyAdmin } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return anyAdmin?.id ?? null;
}
