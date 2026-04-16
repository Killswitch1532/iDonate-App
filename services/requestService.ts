import { supabase } from '@/lib/supabase';

export type BloodRequest = {
    id?: string;
    requester_id: string;
    patient_name?: string;
    blood_type_needed: string;
    units_needed?: number | null;
    urgency_level: 'critical' | 'high' | 'moderate' | 'low';
    request_type?: 'individual' | 'institution';
    status?: 'open' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
    max_donors?: number;
    donors_confirmed_count?: number;
    units_fulfilled?: number;
    description?: string;
    date_needed?: string;
    time_needed?: string;
    contact_phone?: string;
    created_at?: string;
    updated_at?: string;
};

/** Create a new blood request */
export async function createBloodRequest(
    request: Omit<BloodRequest, 'id' | 'status' | 'created_at' | 'updated_at'>
) {
    const { data, error } = await supabase
        .from('blood_requests')
        .insert(request)
        .select()
        .single();

    return { data, error };
}

/** Fetch all active (pending) blood requests, enriched with institution names */
export async function getActiveRequests() {
    const { data, error } = await supabase
        .from('blood_requests')
        .select('*, profiles:requester_id(full_name, avatar_url)')
        .in('status', ['open', 'matched', 'in_progress'])
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return { data, error };

    // Batch-fetch institution names for all requester IDs
    const requesterIds = [...new Set(data.map((r: any) => r.requester_id))];
    const { data: institutions } = await supabase
        .from('institutions')
        .select('id, institution_name')
        .in('id', requesterIds);

    // Build a lookup map
    const instMap: Record<string, string> = {};
    (institutions || []).forEach((inst: any) => {
        instMap[inst.id] = inst.institution_name;
    });

    // Merge institution_name into each request
    const enriched = data.map((req: any) => ({
        ...req,
        institution_name: instMap[req.requester_id] || null,
    }));

    return { data: enriched, error: null };
}

export async function getUserRequests(userId: string) {
    const { data, error } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

    return { data, error };
}

/** Fetch requests created by a specific user, enriched with donations and donor info */
export async function getUserRequestsWithDonors(userId: string) {
    const { data, error } = await supabase
        .from('blood_requests')
        .select(`
            *,
            donations (
                *,
                donor:profiles!donor_id (
                    full_name,
                    avatar_url,
                    phone_number
                )
            )
        `)
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

    return { data, error };
}

/** Update request status (e.g. fulfilled, cancelled) */
export async function updateRequestStatus(
    requestId: string,
    status: 'open' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'expired'
) {
    const { data, error } = await supabase
        .from('blood_requests')
        .update({ status })
        .eq('id', requestId)
        .select()
        .single();

    return { data, error };
}

/** Fetch a single blood request by ID */
export async function getRequestById(requestId: string) {
    const { data, error } = await supabase
        .from('blood_requests')
        .select('*, profiles:requester_id(full_name, avatar_url, phone_number)')
        .eq('id', requestId)
        .single();

    return { data, error };
}
