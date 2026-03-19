import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { registerForPushNotifications, savePushToken, clearPushToken } from '@/services/notificationService';

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

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);

                    // For Google sign-ins, save avatar_url if available
                    if (_event === 'SIGNED_IN') {
                        const meta = session.user.user_metadata;
                        const avatarUrl = meta?.avatar_url || meta?.picture || null;
                        if (avatarUrl) {
                            console.log('[iDonate:Auth] Saving Google avatar_url to profile');
                            await supabase
                                .from('profiles')
                                .update({ avatar_url: avatarUrl })
                                .eq('id', session.user.id);
                        }

                        // Register for push notifications
                        registerForPushNotifications().then(token => {
                            if (token) savePushToken(session.user.id, token);
                        });
                    }
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    async function fetchProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
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
            console.log('[iDonate:Auth] Profile loaded', data);
            setProfile(data);
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
        try {
            console.log('[iDonate:Auth] Starting Google OAuth flow');

            // Build the redirect URL using the app scheme
            const redirectUrl = Linking.createURL('/');
            console.log('[iDonate:Auth] Redirect URL:', redirectUrl);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                console.error('[iDonate:Auth] signInWithOAuth error', {
                    code: error.code,
                    message: error.message,
                    fullError: JSON.stringify(error),
                });
                return { error };
            }

            if (!data?.url) {
                console.error('[iDonate:Auth] No OAuth URL returned');
                return { error: { message: 'No OAuth URL returned from Supabase' } };
            }

            console.log('[iDonate:Auth] Opening browser for Google OAuth');

            // Open the OAuth URL in the system browser
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUrl,
            );

            console.log('[iDonate:Auth] Browser result:', result.type);

            if (result.type === 'success' && result.url) {
                // Extract the session from the redirect URL
                const url = new URL(result.url);

                // Supabase sends tokens in the hash fragment
                const hashParams = new URLSearchParams(
                    url.hash.replace('#', '')
                );
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (accessToken && refreshToken) {
                    console.log('[iDonate:Auth] Setting session from OAuth tokens');
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) {
                        console.error('[iDonate:Auth] setSession error', {
                            message: sessionError.message,
                        });
                        return { error: sessionError };
                    }
                } else {
                    console.warn('[iDonate:Auth] No tokens found in redirect URL');
                    return { error: { message: 'Authentication failed — no tokens received' } };
                }
            } else if (result.type === 'cancel' || result.type === 'dismiss') {
                console.log('[iDonate:Auth] Google OAuth cancelled by user');
                return { error: null }; // User cancelled, not an error
            }

            return { error: null };
        } catch (e: any) {
            console.error('[iDonate:Auth] Google OAuth exception', {
                message: e?.message,
                stack: e?.stack,
            });
            return { error: { message: e?.message || 'Google sign-in failed' } };
        }
    }

    async function signOut() {
        if (user?.id) await clearPushToken(user.id);
        await supabase.auth.signOut();
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
