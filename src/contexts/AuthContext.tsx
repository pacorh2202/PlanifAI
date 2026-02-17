import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, Tables } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { registerPushToken, deactivatePushToken } from '../lib/pushNotifications';

interface Profile extends Tables<'profiles'> { }

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, userName: string) => Promise<{ error: AuthError | null }>;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signInWithGoogle: () => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
    updateEmail: (newEmail: string) => Promise<{ error: AuthError | null }>;
    updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile from database
    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
        }
    };

    // Initialize auth state
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
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state change:', event, !!session);
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
                // Register push token for notifications
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    registerPushToken(session.user.id).catch(e =>
                        console.warn('Push token registration failed:', e)
                    );
                }
            } else {
                setProfile(null);
            }
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                setLoading(false);
            }
        });

        // Safety timeout for loading state (e.g. if OAuth fragment fails to trigger state change)
        const timeout = setTimeout(() => {
            if (loading) {
                console.log('Auth timeout reached, forcing loading false');
                setLoading(false);
            }
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [loading]);

    // Sign up new user
    const signUp = async (
        email: string,
        password: string,
        userName: string
    ): Promise<{ error: AuthError | null }> => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        user_name: userName,
                    },
                },
            });

            if (error) return { error };

            // Profile is created automatically via trigger
            // Fetch it after signup
            if (data.user) {
                await fetchProfile(data.user.id);
            }

            return { error: null };
        } catch (error) {
            console.error('Signup error:', error);
            return { error: error as AuthError };
        }
    };

    // Sign in existing user
    const signIn = async (
        email: string,
        password: string
    ): Promise<{ error: AuthError | null }> => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            return { error };
        } catch (error) {
            console.error('Signin error:', error);
            return { error: error as AuthError };
        }
    };

    // Sign in with Google OAuth
    const signInWithGoogle = async (): Promise<{ error: AuthError | null }> => {
        try {
            // Determine the best redirect URL
            // On Despia/Native, window.location.origin might be non-standard
            // We force the production URL for all non-standard environments
            const origin = window.location.origin;
            const isProduction = origin.includes('planifai-bilingue.pages.dev');
            const isLocalhost = origin.includes('localhost');

            // If we're not on production or localhost, we force production redirect
            const redirectTo = (isProduction || isLocalhost)
                ? origin
                : 'https://planifai-bilingue.pages.dev';

            console.log('SignInWithGoogle - Origin:', origin, 'RedirectTo:', redirectTo);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectTo,
                    queryParams: {
                        prompt: 'select_account'
                    }
                },
            });

            return { error };
        } catch (error) {
            console.error('Google signin error:', error);
            return { error: error as AuthError };
        }
    };

    // Sign out current user
    const signOut = async () => {
        try {
            // Deactivate push tokens before signing out
            if (user) {
                await deactivatePushToken(user.id).catch(e =>
                    console.warn('Push token deactivation failed:', e)
                );
            }
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            setSession(null);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    // Update user profile
    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            // Refetch profile
            await fetchProfile(user.id);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    // Update user email
    const updateEmail = async (newEmail: string): Promise<{ error: AuthError | null }> => {
        if (!user) return { error: { message: 'No user logged in', name: 'AuthError', status: 401 } as AuthError };

        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail,
            });

            if (error) return { error };

            console.log('✅ Email update initiated. Check inbox for confirmation.');
            return { error: null };
        } catch (error) {
            console.error('Error updating email:', error);
            return { error: error as AuthError };
        }
    };

    // Update user password
    const updatePassword = async (newPassword: string): Promise<{ error: AuthError | null }> => {
        if (!user) return { error: { message: 'No user logged in', name: 'AuthError', status: 401 } as AuthError };

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) return { error };

            console.log('✅ Password updated successfully.');
            return { error: null };
        } catch (error) {
            console.error('Error updating password:', error);
            return { error: error as AuthError };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                session,
                loading,
                signUp,
                signIn,
                signInWithGoogle,
                signOut,
                updateProfile,
                updateEmail,
                updatePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
