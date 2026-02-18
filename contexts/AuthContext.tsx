import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: any | null;
    loading: boolean;
    signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
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
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);
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
            metadata: { full_name: metadata.full_name, user_type: metadata.user_type },
        });

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: metadata.full_name || '',
                    user_type: metadata.user_type || 'donor',
                },
            },
        });

        if (error) {
            console.error('[iDonate:Auth] signUp error', {
                code: error.code,
                message: error.message,
                status: error.status,
                name: error.name,
                // Log the full error for any extra fields
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

    async function signOut() {
        await supabase.auth.signOut();
    }

    return (
        <AuthContext.Provider
            value={{ session, user, profile, loading, signUp, signIn, signOut }}
        >
            {children}
        </AuthContext.Provider>
    );
}
