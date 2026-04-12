import { supabase } from '@/lib/supabase';

export type DonationStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export type Donation = {
  id: string;
  donor_id: string;
  institution_id: string;
  blood_request_id: string | null;
  scheduled_date: string;
  status: DonationStatus;
  units_donated: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Book a new donation appointment */
export async function bookDonation(params: {
  donorId: string;
  institutionId: string;
  scheduledDate: Date;
  bloodRequestId?: string;
}) {
  console.log('[iDonate:DonationService] bookDonation', {
    donorId: params.donorId,
    institutionId: params.institutionId,
    scheduledDate: params.scheduledDate.toISOString(),
  });

  const { data, error } = await supabase
    .from('donations')
    .insert({
      donor_id: params.donorId,
      institution_id: params.institutionId,
      scheduled_date: params.scheduledDate.toISOString(),
      blood_request_id: params.bloodRequestId || null,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) {
    console.error('[iDonate:DonationService] bookDonation failed', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  return { data, error };
}

/** Get all donations for a donor */
export async function getDonorDonations(donorId: string) {
  console.log('[iDonate:DonationService] getDonorDonations', { donorId });

  const { data, error } = await supabase
    .from('donations')
    .select(`
      *,
      institutions (
        institution_name,
        address,
        profiles!institutions_id_fkey (
          phone_number
        )
      ),
      blood_requests (
        blood_type_needed
      )
    `)
    .eq('donor_id', donorId)
    .order('scheduled_date', { ascending: false });

  if (error) {
    console.error('[iDonate:DonationService] getDonorDonations failed', {
      code: error.code,
      message: error.message,
    });
  }

  return { data, error };
}

/** Cancel a scheduled donation */
export async function cancelDonation(donationId: string) {
  console.log('[iDonate:DonationService] cancelDonation', { donationId });

  const { data, error } = await supabase
    .from('donations')
    .update({ status: 'cancelled' })
    .eq('id', donationId)
    .eq('status', 'scheduled') // can only cancel scheduled appointments
    .select()
    .single();

  if (error) {
    console.error('[iDonate:DonationService] cancelDonation failed', {
      code: error.code,
      message: error.message,
    });
  }

  return { data, error };
}

/** Check if a donor already has an active (non-cancelled, non-completed) donation */
export async function getActiveDonation(donorId: string) {
  const { data, error } = await supabase
    .from('donations')
    .select('*, blood_requests(blood_type_needed, urgency_level), institutions(institution_name)')
    .eq('donor_id', donorId)
    .in('status', ['scheduled', 'confirmed'])
    .limit(1)
    .maybeSingle();

  return { data, error };
}

/** Get the most recent donation for a donor + blood request (any status) */
export async function getDonationForRequest(donorId: string, bloodRequestId: string) {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .eq('donor_id', donorId)
    .eq('blood_request_id', bloodRequestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

/** Update donation status (for institutions) */
export async function updateDonationStatus(donationId: string, status: DonationStatus, unitsdonated?: number) {
  console.log('[iDonate:DonationService] updateDonationStatus', { donationId, status });

  const updatePayload: any = { status };
  if (unitsdonated !== undefined) {
    updatePayload.units_donated = unitsdonated;
  }

  const { data, error } = await supabase
    .from('donations')
    .update(updatePayload)
    .eq('id', donationId)
    .select()
    .single();

  if (error) {
    console.error('[iDonate:DonationService] updateDonationStatus failed', {
      code: error.code,
      message: error.message,
    });
  }

  return { data, error };
}

/**
 * Get a map of blood_request_id → DonationStatus for all of a donor's
 * request-linked donations. When a request has multiple donations (e.g.
 * cancelled then re-accepted), the most recent one wins.
 */
export async function getDonorRequestStatuses(donorId: string): Promise<{
  statuses: Map<string, DonationStatus>;
  error: any;
}> {
  const { data, error } = await supabase
    .from('donations')
    .select('blood_request_id, status, created_at')
    .eq('donor_id', donorId)
    .not('blood_request_id', 'is', null)
    .order('created_at', { ascending: false });

  const statuses = new Map<string, DonationStatus>();

  if (data) {
    for (const d of data) {
      // First (most recent) entry per request wins
      if (d.blood_request_id && !statuses.has(d.blood_request_id)) {
        statuses.set(d.blood_request_id, d.status as DonationStatus);
      }
    }
  }

  return { statuses, error };
}
