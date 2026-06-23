import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { clearSupabaseAuthStorage, supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { registerForPushNotifications, savePushToken, clearPushToken } from '@/services/notificationService';
import { upsertDonorProfile } from '@/services/donorService';

// Try to load native Google Sign-In (requires dev build with native module)
// Falls back to browser-based OAuth if not available
let GoogleSignin: any = null;
try {
    const gsi = require('@react-native-google-signin/google-signin');
    GoogleSignin = gsi.GoogleSignin;
    GoogleSignin.configure({
        webClientId: '655086831488-5kqeg9he2a1pfuni6q7ufh29ndvlmv2v.apps.googleusercontent.com',
    });
    console.log('[iDonate:Auth] Native Google Sign-In available');
} catch {
    console.log('[iDonate:Auth] Native Google Sign-In not available, using browser fallback');
}

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: any | null;
    loading: boolean;
    signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signInWithGoogle: () => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isMissingRefreshTokenError(error: any) {
    const message = String(error?.message ?? '').toLowerCase();
    const code = String(error?.code ?? '').toLowerCase();

    return (
        code === 'refresh_token_not_found' ||
        message.includes('invalid refresh token') ||
        message.includes('refresh token not found')
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    async function clearInvalidLocalSession(error: any) {
        console.warn('[iDonate:Auth] Clearing invalid local Supabase session', {
            code: error?.code,
            message: error?.message,
            status: error?.status,
        });

        try {
            await supabase.auth.signOut({ scope: 'local' });
        } catch (signOutError) {
            console.warn('[iDonate:Auth] Local sign-out cleanup failed', signOutError);
        }

        try {
            await clearSupabaseAuthStorage();
        } catch (storageError) {
            console.warn('[iDonate:Auth] Auth storage cleanup failed', storageError);
        }

        setSession(null);
        setUser(null);
        setProfile(null);
    }

    useEffect(() => {
        let isMounted = true;

        async function loadInitialSession() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (!isMounted) return;

                if (error) {
                    if (isMissingRefreshTokenError(error)) {
                        await clearInvalidLocalSession(error);
                    } else {
                        console.error('[iDonate:Auth] getSession failed', {
                            code: error.code,
                            message: error.message,
                            status: error.status,
                        });
                        setSession(null);
                        setUser(null);
                        setProfile(null);
                    }
                    return;
                }

                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await handleNewUserSignIn(session.user);
                    // Register for push notifications on app start if session exists
                    registerForPushNotifications().then(token => {
                        if (token) savePushToken(session.user.id, token);
                    });
                }
            } catch (error) {
                if (!isMounted) return;

                if (isMissingRefreshTokenError(error)) {
                    await clearInvalidLocalSession(error);
                } else {
                    console.error('[iDonate:Auth] getSession threw', error);
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadInitialSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!isMounted) return;

                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await handleNewUserSignIn(session.user, _event);

                    // Register for push notifications on sign-in
                    registerForPushNotifications().then(token => {
                        if (token) savePushToken(session.user.id, token);
                    });
                } else {
                    setProfile(null);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    async function handleNewUserSignIn(user: User, event?: string) {
        const meta = user.user_metadata;
        
        // Make sure profile has full_name and user_type (donor)
        let fullName = meta?.full_name || meta?.name || '';
        let phoneNumber = meta?.phone_number || meta?.phone || '';
        
        // Update profiles table if needed
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (!existingProfile || !existingProfile.full_name || !existingProfile.user_type) {
            await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    user_type: 'donor',
                    phone_number: phoneNumber,
                    avatar_url: meta?.avatar_url || meta?.picture || null,
                    default_anonymous: false,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
        }

        // Save avatar_url if available
        const avatarUrl = meta?.avatar_url || meta?.picture || null;
        if (avatarUrl && (!existingProfile || existingProfile.avatar_url !== avatarUrl)) {
            console.log('[iDonate:Auth] Saving Google avatar_url to profile');
            await supabase
                .from('profiles')
                .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
                .eq('id', user.id);
        }

        // Check if donor profile exists
        const { data: existingDonor } = await supabase
            .from('donors')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        
        if (!existingDonor) {
            console.log('[iDonate:Auth] Creating donor profile for Google sign-in user');
            await upsertDonorProfile(user.id, {});
        }

        // Now fetch the complete profile
        await fetchProfile(user.id);
    }

    async function fetchProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*, donors(blood_type, rh_factor, genotype, availability_status, last_donation_date)')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('[iDonate:Auth] fetchProfile failed', {
                userId,
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
            });
        }
        if (!error && data) {
            // Flatten donor info into profile if it exists
            const enrichedProfile = {
                ...data,
                blood_type: data.donors?.blood_type || null,
                rh_factor: data.donors?.rh_factor || null,
                genotype: data.donors?.genotype || null,
                availability_status: data.donors?.availability_status || null,
                last_donation_date: data.donors?.last_donation_date || null
            };
            console.log('[iDonate:Auth] Profile loaded', enrichedProfile);
            setProfile(enrichedProfile);
        } else if (!error && !data) {
            console.warn('[iDonate:Auth] No profile found for user', userId);
        }
    }

    async function signUp(
        email: string,
        password: string,
        metadata: Record<string, any> = {}
    ) {
        console.log('[iDonate:Auth] signUp attempt', {
            email,
            metadata: { full_name: metadata.full_name, user_type: metadata.user_type, phone_number: metadata.phone_number },
        });

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: metadata.full_name || '',
                    user_type: metadata.user_type || 'donor',
                    phone_number: metadata.phone_number || '',
                },
            },
        });

        if (error) {
            console.error('[iDonate:Auth] signUp error', {
                code: error.code,
                message: error.message,
                status: error.status,
                name: error.name,
                fullError: JSON.stringify(error),
            });
        } else {
            console.log('[iDonate:Auth] signUp succeeded', {
                userId: data?.user?.id,
                emailConfirmed: data?.user?.email_confirmed_at,
                session: data?.session ? 'present' : 'null',
            });
        }

        return { error };
    }

    async function signIn(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    }

    async function signInWithGoogle() {
        // ─── Strategy 1: Native Google Sign-In popup (dev build) ────
        if (GoogleSignin) {
            try {
                console.log('[iDonate:Auth] Using native Google Sign-In');
                await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

                // Sign out first so the account picker always shows
                try { await GoogleSignin.signOut(); } catch {}

                const signInResult = await GoogleSignin.signIn();
                const idToken = signInResult?.data?.idToken;

                if (!idToken) {
                    console.error('[iDonate:Auth] No ID token from Google');
                    throw new Error('Google sign-in failed — no ID token received');
                }

                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: idToken,
                });

                if (error) {
                    console.error('[iDonate:Auth] signInWithIdToken error:', error.message);
                    throw error;
                }

                console.log('[iDonate:Auth] Google Sign-In complete:', data?.user?.email);
                return { error: null };
            } catch (e: any) {
                if (e?.code === 'SIGN_IN_CANCELLED' || e?.code === '12501') {
                    return { error: null }; // User cancelled
                }
                console.warn('[iDonate:Auth] Native Google Sign-In failed, falling back to browser:', e?.message);
                // Fall through to browser-based OAuth
            }
        }

        // ─── Strategy 2: Browser-based OAuth fallback (Expo Go or native failed) ─────
        try {
            console.log('[iDonate:Auth] Using browser-based Google OAuth');
            let redirectUrl = 'idonateapp://google-auth';
            if (process.env.EXPO_PUBLIC_APP_ENV === 'development') {
                redirectUrl = 'idonateapp-dev://google-auth';
            } else if (process.env.EXPO_PUBLIC_APP_ENV === 'preview') {
                redirectUrl = 'idonateapp-preview://google-auth';
            }

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
            });

            if (error) return { error };
            if (!data?.url) return { error: { message: 'No OAuth URL returned' } };

            const browserListenerUrl = Linking.createURL('google-auth');
            const result = await WebBrowser.openAuthSessionAsync(data.url, browserListenerUrl);

            if (result.type === 'success' && result.url) {
                const url = result.url;
                let params: URLSearchParams;
                const hashIndex = url.indexOf('#');
                if (hashIndex !== -1) {
                    params = new URLSearchParams(url.substring(hashIndex + 1));
                } else {
                    const queryIndex = url.indexOf('?');
                    params = new URLSearchParams(queryIndex !== -1 ? url.substring(queryIndex + 1) : '');
                }

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (sessionError) return { error: sessionError };
                } else {
                    return { error: { message: 'Authentication failed — no tokens received' } };
                }
            } else if (result.type === 'cancel' || result.type === 'dismiss') {
                return { error: null }; // User cancelled
            }

            return { error: null };
        } catch (e: any) {
            console.error('[iDonate:Auth] Browser Google OAuth failed:', e?.message);
            return { error: { message: e?.message || 'Google sign-in failed' } };
        }
    }

    async function signOut() {
        if (user?.id) {
            try {
                await clearPushToken(user.id);
            } catch (error) {
                console.warn('[iDonate:Auth] Failed to clear push token during sign-out', error);
            }
        }

        // Also sign out from Google if native module is available
        if (GoogleSignin) {
            try { await GoogleSignin.signOut(); } catch {}
        }

        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                if (isMissingRefreshTokenError(error)) {
                    await clearInvalidLocalSession(error);
                    return;
                }

                console.error('[iDonate:Auth] signOut failed', {
                    code: error.code,
                    message: error.message,
                    status: error.status,
                });
            }
        } catch (error) {
            if (isMissingRefreshTokenError(error)) {
                await clearInvalidLocalSession(error);
                return;
            }

            console.error('[iDonate:Auth] signOut threw', error);
        }

        setSession(null);
        setUser(null);
        setProfile(null);
    }

    async function refreshProfile() {
        if (user?.id) await fetchProfile(user.id);
    }

    return (
        <AuthContext.Provider
            value={{ session, user, profile, loading, signUp, signIn, signInWithGoogle, signOut, refreshProfile }}
        >
            {children}
        </AuthContext.Provider>
    );
}
