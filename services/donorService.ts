import { supabase } from '@/lib/supabase';

export type DonorProfile = {
    id: string;
    blood_type: string | null;
    birth_date: string | null;
    weight_kg: number | null;
    last_donation_date: string | null;
    availability_status: boolean;
    address: string | null;
};

const ELIGIBILITY_COOLDOWN_DAYS = 56;
const MIN_WEIGHT_KG = 50;
const MIN_AGE = 18;
const MAX_AGE = 65;

/** Fetch the current user's donor profile */
export async function getDonorProfile(userId: string) {
    const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('id', userId)
        .single();

    return { data, error };
}

/** Create or update the donor profile (upsert) */
export async function upsertDonorProfile(
    userId: string,
    profile: Partial<Omit<DonorProfile, 'id'>>
) {
    const { data, error } = await supabase
        .from('donors')
        .upsert({ id: userId, ...profile })
        .select()
        .single();

    return { data, error };
}

/** Check if a donor is eligible to donate */
export function checkEligibility(donor: DonorProfile): {
    eligible: boolean;
    reasons: string[];
} {
    const reasons: string[] = [];

    // Weight check
    if (donor.weight_kg != null && donor.weight_kg < MIN_WEIGHT_KG) {
        reasons.push(`Weight must be at least ${MIN_WEIGHT_KG} kg`);
    }

    // Age check
    if (donor.birth_date) {
        const age = getAge(new Date(donor.birth_date));
        if (age < MIN_AGE) reasons.push(`Must be at least ${MIN_AGE} years old`);
        if (age > MAX_AGE) reasons.push(`Must be ${MAX_AGE} or younger`);
    }

    // Cooldown check (56 days since last donation)
    if (donor.last_donation_date) {
        const lastDonation = new Date(donor.last_donation_date);
        const daysSince = Math.floor(
            (Date.now() - lastDonation.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince < ELIGIBILITY_COOLDOWN_DAYS) {
            const remaining = ELIGIBILITY_COOLDOWN_DAYS - daysSince;
            reasons.push(`Must wait ${remaining} more day(s) since last donation`);
        }
    }

    return { eligible: reasons.length === 0, reasons };
}

function getAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
        age--;
    }
    return age;
}
