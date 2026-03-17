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

/**
 * Haversine formula — returns distance in km between two lat/lng points.
 */
function getHaversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Count how many verified institutions are within `radiusKm` of the given
 * coordinates. Uses client-side Haversine filtering.
 */
export async function getNearbyInstitutionCount(
    userLat: number,
    userLon: number,
    radiusKm: number = 5
): Promise<{ count: number; radiusKm: number; error: any }> {
    console.log('[iDonate:InstitutionService] getNearbyInstitutionCount', {
        userLat, userLon, radiusKm,
    });

    const { data, error } = await getInstitutions();

    if (error || !data) {
        return { count: 0, radiusKm, error };
    }

    const nearbyCount = data.filter((inst: any) => {
        try {
            // PostGIS geography(point) is stored as GeoJSON: { type: 'Point', coordinates: [lng, lat] }
            const coords = inst.location?.coordinates;
            if (!coords || coords.length < 2) return false;
            const [lng, lat] = coords;
            const dist = getHaversineDistance(userLat, userLon, lat, lng);
            return dist <= radiusKm;
        } catch {
            return false;
        }
    }).length;

    return { count: nearbyCount, radiusKm, error: null };
}
