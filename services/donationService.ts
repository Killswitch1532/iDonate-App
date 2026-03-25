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
