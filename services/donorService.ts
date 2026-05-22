import { supabase } from '@/lib/supabase';

export type DonorProfile = {
    id: string;
    blood_type: string | null;
    rh_factor: string | null;
    genotype: string | null;
    birth_date: string | null;
    weight_kg: number | null;
    last_donation_date: string | null;
    next_eligible_date: string | null;
    availability_status: boolean;
    address: string | null;
};

const ELIGIBILITY_COOLDOWN_DAYS = 90;
const MIN_WEIGHT_KG = 50;
const MIN_AGE = 18;
const MAX_AGE = 65;

/** Fetch the current user's donor profile */
export async function getDonorProfile(userId: string) {
    console.log('[iDonate:DonorService] getDonorProfile', { userId });

    const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('[iDonate:DonorService] getDonorProfile failed', {
            userId,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
        });
    }

    return { data, error };
}

/** Update the user's profile in the profiles table */
export async function updateProfile(
    userId: string,
    updates: { full_name?: string; phone_number?: string }
) {
    console.log('[iDonate:DonorService] updateProfile', { userId, updates });

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('[iDonate:DonorService] updateProfile failed', {
            userId, code: error.code, message: error.message,
        });
    }

    return { data, error };
}

/** Create or update the donor profile (upsert) */
export async function upsertDonorProfile(
    userId: string,
    profile: Partial<Omit<DonorProfile, 'id'>>
) {
    const payload = { id: userId, ...profile };
    console.log('[iDonate:DonorService] upsertDonorProfile', { userId, profile: payload });

    const { data, error } = await supabase
        .from('donors')
        .upsert(payload)
        .select()
        .single();

    if (error) {
        console.error('[iDonate:DonorService] upsertDonorProfile failed', {
            userId,
            payload,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            fullError: JSON.stringify(error),
        });
    } else {
        console.log('[iDonate:DonorService] upsertDonorProfile succeeded', { userId });
    }

    return { data, error };
}

/** Check if a donor is eligible to donate */
export function checkEligibility(donor: DonorProfile): {
    eligible: boolean;
    reasons: string[];
    nextEligibleDate: Date | null;
} {
    const reasons: string[] = [];
    let nextEligibleDate: Date | null = null;

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

    // Cooldown check — prefer next_eligible_date (set by DB trigger), fall back to last_donation_date
    if (donor.next_eligible_date) {
        const eligibleDate = new Date(donor.next_eligible_date);
        if (Date.now() < eligibleDate.getTime()) {
            nextEligibleDate = eligibleDate;
            const remaining = Math.ceil(
                (eligibleDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            reasons.push(`Must wait ${remaining} more day(s) before next donation`);
        }
    } else if (donor.last_donation_date) {
        const lastDonation = new Date(donor.last_donation_date);
        const daysSince = Math.floor(
            (Date.now() - lastDonation.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince < ELIGIBILITY_COOLDOWN_DAYS) {
            const remaining = ELIGIBILITY_COOLDOWN_DAYS - daysSince;
            nextEligibleDate = new Date(lastDonation.getTime() + ELIGIBILITY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
            reasons.push(`Must wait ${remaining} more day(s) since last donation`);
        }
    }

    return { eligible: reasons.length === 0, reasons, nextEligibleDate };
}

/**
 * Quick cooldown status check for UI display.
 * Returns whether the donor is eligible and the next eligible date if in cooldown.
 */
export function getCooldownStatus(donor: DonorProfile | null): {
    isEligible: boolean;
    nextEligibleDate: Date | null;
    daysRemaining: number;
} {
    if (!donor) return { isEligible: true, nextEligibleDate: null, daysRemaining: 0 };

    // Check next_eligible_date first (set by DB trigger)
    if (donor.next_eligible_date) {
        const eligibleDate = new Date(donor.next_eligible_date);
        if (Date.now() < eligibleDate.getTime()) {
            const daysRemaining = Math.ceil(
                (eligibleDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return { isEligible: false, nextEligibleDate: eligibleDate, daysRemaining };
        }
    }
    // Fallback to last_donation_date
    else if (donor.last_donation_date) {
        const lastDonation = new Date(donor.last_donation_date);
        const daysSince = Math.floor(
            (Date.now() - lastDonation.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince < ELIGIBILITY_COOLDOWN_DAYS) {
            const nextEligibleDate = new Date(lastDonation.getTime() + ELIGIBILITY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
            return {
                isEligible: false,
                nextEligibleDate,
                daysRemaining: ELIGIBILITY_COOLDOWN_DAYS - daysSince,
            };
        }
    }

    return { isEligible: true, nextEligibleDate: null, daysRemaining: 0 };
}

/** 
 * Check if the user has completed their basic blood profile.
 * Genotype is optional.
 */
export function isBloodTypeComplete(profile: any): boolean {
    if (!profile) return false;
    
    // Check both profile (flattened) and donors (nested) structures for safety
    const bloodType = profile.blood_type || profile.donors?.blood_type;
    
    return !!bloodType;
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
