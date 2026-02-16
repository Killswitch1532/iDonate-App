import { supabase } from '@/lib/supabase';

/**
 * Blood type compatibility matrix.
 * Key = blood type needed, Value = array of compatible donor blood types.
 */
const COMPATIBILITY: Record<string, string[]> = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-'],
};

/** Get the list of donor blood types that can donate to the given blood type */
export function getCompatibleDonorTypes(bloodTypeNeeded: string): string[] {
    return COMPATIBILITY[bloodTypeNeeded] ?? [];
}

/**
 * Find eligible, available donors whose blood type is compatible
 * with the given request's blood type needed.
 */
export async function findMatchingDonors(bloodTypeNeeded: string) {
    const compatibleTypes = getCompatibleDonorTypes(bloodTypeNeeded);

    if (compatibleTypes.length === 0) {
        return { data: [], error: null };
    }

    const { data, error } = await supabase
        .from('donors')
        .select('*, profiles:id(full_name, phone_number, avatar_url)')
        .in('blood_type', compatibleTypes)
        .eq('availability_status', true);

    return { data, error };
}

/**
 * Check if a specific blood type can donate to another.
 */
export function canDonateTo(
    donorBloodType: string,
    recipientBloodType: string
): boolean {
    const compatible = COMPATIBILITY[recipientBloodType];
    return compatible ? compatible.includes(donorBloodType) : false;
}
