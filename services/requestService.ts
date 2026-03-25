import { supabase } from '@/lib/supabase';

export type BloodRequest = {
    id?: string;
    requester_id: string;
    patient_name?: string;
    blood_type_needed: string;
    units_needed: number;
    urgency_level: 'critical' | 'high' | 'moderate' | 'low';
    status?: 'pending' | 'fulfilled' | 'cancelled';
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

/** Fetch all active (pending) blood requests */
export async function getActiveRequests() {
    const { data, error } = await supabase
        .from('blood_requests')
        .select('*, profiles:requester_id(full_name, avatar_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    return { data, error };
}

/** Fetch requests created by a specific user */
export async function getUserRequests(userId: string) {
    const { data, error } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

    return { data, error };
}

/** Update request status (e.g. fulfilled, cancelled) */
export async function updateRequestStatus(
    requestId: string,
    status: 'pending' | 'fulfilled' | 'cancelled'
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
