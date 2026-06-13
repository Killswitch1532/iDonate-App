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
 * Parse a hex-encoded IEEE 754 float64 (8 bytes = 16 hex chars).
 */
function hexToFloat64(hex: string, littleEndian: boolean): number {
    const bytes = hex.match(/../g)!.map(b => parseInt(b, 16));
    if (littleEndian) bytes.reverse();
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    bytes.forEach((b, i) => view.setUint8(i, b));
    return view.getFloat64(0);
}

/**
 * Extract [latitude, longitude] from a PostGIS location value.
 * Handles three formats:
 *   1. WKB hex string  — e.g. "0101000020E6100000..."
 *   2. GeoJSON object  — { type: 'Point', coordinates: [lng, lat] }
 *   3. WKT string      — "POINT(lng lat)"
 */
export function extractCoords(location: any): { lat: number; lng: number } | null {
    if (!location) return null;

    // 1) WKB hex string (starts with "00" big-endian or "01" little-endian)
    if (typeof location === 'string' && /^[0-9a-fA-F]+$/.test(location) && location.length >= 42) {
        try {
            const isLittleEndian = location.substring(0, 2) === '01';
            const typeHex = location.substring(2, 10);
            const typeNum = isLittleEndian
                ? parseInt(typeHex.match(/../g)!.reverse().join(''), 16)
                : parseInt(typeHex, 16);

            let offset = 10; // past endianness byte + 4-byte type
            if (typeNum & 0x20000000) {
                offset += 8; // skip 4-byte SRID
            }

            const xHex = location.substring(offset, offset + 16);
            const yHex = location.substring(offset + 16, offset + 32);
            const lng = hexToFloat64(xHex, isLittleEndian);
            const lat = hexToFloat64(yHex, isLittleEndian);

            if (isFinite(lat) && isFinite(lng)) return { lat, lng };
        } catch { /* fall through */ }
    }

    // 2) GeoJSON: { coordinates: [lng, lat] }
    if (location?.coordinates?.length >= 2) {
        const [lng, lat] = location.coordinates;
        return { lat, lng };
    }

    // 3) WKT: "POINT(lng lat)"
    if (typeof location === 'string') {
        const m = location.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (m) return { lat: parseFloat(m[2]), lng: parseFloat(m[1]) };
    }

    return null;
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

    let totalWithLocation = 0;
    const nearbyCount = data.filter((inst: any) => {
        try {
            const parsed = extractCoords(inst.location);
            if (!parsed) {
                console.log('[iDonate:InstitutionService] No location for', inst.institution_name, 'raw location:', JSON.stringify(inst.location));
                return false;
            }
            totalWithLocation++;
            const dist = getHaversineDistance(userLat, userLon, parsed.lat, parsed.lng);
            console.log('[iDonate:InstitutionService] Distance check', {
                name: inst.institution_name,
                instLat: parsed.lat, instLng: parsed.lng,
                distance: dist.toFixed(2) + 'km',
                withinRadius: dist <= radiusKm,
            });
            return dist <= radiusKm;
        } catch {
            return false;
        }
    }).length;

    console.log('[iDonate:InstitutionService] Nearby count result', {
        totalInstitutions: data.length,
        totalWithLocation,
        nearbyCount,
        radiusKm,
    });

    return { count: nearbyCount, radiusKm, error: null };
}

/**
 * Get nearby institutions with full details and distance.
 */
export async function getNearbyInstitutions(
    userLat: number,
    userLon: number,
    radiusKm: number = 10
): Promise<{ data: Array<Institution & { distance: number; latitude: number; longitude: number }> | null; error: any }> {
    const { data, error } = await getInstitutions();
    if (error || !data) return { data: null, error };

    const results = data
        .map((inst: any) => {
            const parsed = extractCoords(inst.location);
            if (!parsed) return null;
            const distance = getHaversineDistance(userLat, userLon, parsed.lat, parsed.lng);
            if (distance > radiusKm) return null;
            return { ...inst, distance: Math.round(distance * 10) / 10, latitude: parsed.lat, longitude: parsed.lng };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.distance - b.distance);

    return { data: results, error: null };
}
