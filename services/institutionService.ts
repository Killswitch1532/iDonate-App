import { supabase } from '@/lib/supabase';

export type Institution = {
    id: string;
    institution_name: string;
    license_number: string | null;
    verified: boolean;
    location: any; // geography(point)
    address: string | null;
    website: string | null;
    institution_type?: 'hospital' | 'blood_bank';
};

/** Fetch all verified institutions */
export async function getInstitutions() {
    console.log('[iDonate:InstitutionService] getInstitutions');

    const { data, error } = await supabase
        .from('institutions')
        .select(`
            *,
            profiles!institutions_id_fkey (
                user_type,
                avatar_url
            )
        `)
        .eq('verified', true);

    if (error) {
        console.error('[iDonate:InstitutionService] getInstitutions failed', error);
    }

    return { data, error };
}

/** Fetch a single institution by ID */
export async function getInstitutionById(id: string) {
    const { data, error } = await supabase
        .from('institutions')
        .select(`
            *,
            profiles!institutions_id_fkey (
                full_name,
                user_type,
                avatar_url,
                phone_number
            )
        `)
        .eq('id', id)
        .single();

    return { data, error };
}
