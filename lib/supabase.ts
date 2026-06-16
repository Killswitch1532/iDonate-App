import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;
const supabaseProjectRef = (() => {
    try {
        return new URL(supabaseUrl).hostname.split('.')[0];
    } catch {
        return null;
    }
})();
export const supabaseAuthStorageKey = supabaseProjectRef
    ? `sb-${supabaseProjectRef}-auth-token`
    : 'sb-idonate-auth-token';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        storageKey: supabaseAuthStorageKey,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export async function clearSupabaseAuthStorage() {
    await AsyncStorage.multiRemove([
        supabaseAuthStorageKey,
        `${supabaseAuthStorageKey}-code-verifier`,
        `${supabaseAuthStorageKey}-user`,
    ]);
}
