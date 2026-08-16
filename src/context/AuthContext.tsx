import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../lib/api';
import { 
  supabase, 
  supabaseSignUp, 
  supabaseSignIn, 
  supabaseResendVerification, 
  supabaseSignOut, 
  syncUserProfileFromSupabase,
  saveUserProfileToSupabase,
  isClientSupabaseConfigured 
} from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { 
    name: string; 
    email: string; 
    phone: string; 
    password: string; 
    role?: 'customer' | 'buyer' | 'driver' | 'admin' | 'staff';
    businessName?: string;
    vehicleType?: string;
    vehiclePlate?: string;
    address?: any 
  }) => Promise<{ user?: User; requiresEmailVerification: boolean; email: string }>;
  resendVerification: (email: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: { name?: string; phone?: string; addresses?: any[]; businessName?: string }) => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isDriver: boolean;
  isBuyer: boolean;
  isCustomer: boolean;
  isSupabaseConnected: boolean;
  verificationSuccessMsg: string | null;
  clearVerificationMsg: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('haven_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [verificationSuccessMsg, setVerificationSuccessMsg] = useState<string | null>(null);

  // Initialize and listen to Supabase auth events (e.g. when user clicks email confirmation link)
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // 1. Check if Supabase has an active session (e.g. from email verification link)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const profile = await syncUserProfileFromSupabase(session.user);
          if (profile) {
            setUser(profile);
            setToken(session.access_token);
            localStorage.setItem('haven_token', session.access_token);
          }
        } else {
          // 2. Check local fallback token if any
          const savedToken = localStorage.getItem('haven_token');
          if (savedToken && mounted) {
            try {
              const profile = await api.getMe();
              setUser(profile);
            } catch (err) {
              localStorage.removeItem('haven_token');
              setToken(null);
              setUser(null);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase Auth State Changes (Email verified, Sign in, Sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await syncUserProfileFromSupabase(session.user);
        if (profile) {
          setUser(profile);
          setToken(session.access_token);
          localStorage.setItem('haven_token', session.access_token);
          setVerificationSuccessMsg(`Welcome back, ${profile.name}! Your account is verified and ready.`);
        }
      } else if (event === 'USER_UPDATED' && session?.user) {
        const profile = await syncUserProfileFromSupabase(session.user);
        if (profile) {
          setUser(profile);
          setVerificationSuccessMsg('🎉 Your email address has been verified successfully!');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setToken(null);
        localStorage.removeItem('haven_token');
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Supabase Sign In with email confirmation check
  const login = async (email: string, password: string): Promise<User> => {
    try {
      // 1. Authenticate via Supabase Auth
      const authRes = await supabaseSignIn(email, password);
      if (authRes.user) {
        const isCliff = email.toLowerCase() === 'nyambageracliff@gmail.com';
        const profile = await syncUserProfileFromSupabase(authRes.user);
        const activeUser: User = profile || {
          id: authRes.user.id,
          name: authRes.user.user_metadata?.name || (isCliff ? 'Cliff Nyambagera' : email.split('@')[0]),
          email: authRes.user.email || email,
          phone: authRes.user.user_metadata?.phone || '',
          role: isCliff ? 'admin' : (authRes.user.user_metadata?.role || 'customer'),
          createdAt: authRes.user.created_at,
          addresses: [],
        };
        if (isCliff) {
          activeUser.role = 'admin';
        }

        const sessionToken = authRes.session?.access_token || 'supabase_token_' + Date.now();
        localStorage.setItem('haven_token', sessionToken);
        setToken(sessionToken);
        setUser(activeUser);
        return activeUser;
      }
      throw new Error('Could not retrieve user profile from Supabase.');
    } catch (err: any) {
      // Check if error is due to unverified email
      if (err.message && (err.message.toLowerCase().includes('email not confirmed') || err.message.toLowerCase().includes('unconfirmed'))) {
        const customErr: any = new Error('Email not verified. Please check your inbox and verify your email address to log in.');
        customErr.isEmailUnconfirmed = true;
        customErr.unconfirmedEmail = email;
        throw customErr;
      }

      // Fallback to local server auth for demo/admin accounts
      try {
        const res = await api.login({ email, password });
        localStorage.setItem('haven_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res.user;
      } catch {
        throw err;
      }
    }
  };

  // Supabase Sign Up with Email Verification requirement
  const register = async (data: { 
    name: string; 
    email: string; 
    phone: string; 
    password: string; 
    role?: 'customer' | 'buyer' | 'driver' | 'admin' | 'staff';
    businessName?: string;
    vehicleType?: string;
    vehiclePlate?: string;
    address?: any 
  }): Promise<{ user?: User; requiresEmailVerification: boolean; email: string }> => {
    try {
      // Register with Supabase
      const result = await supabaseSignUp(data);

      // Also register on local sync store so backend and database remain consistent
      try {
        await api.register(data);
      } catch (syncErr) {
        console.warn('Local register sync notice:', syncErr);
      }

      if (result.isEmailConfirmationRequired || !result.session) {
        return {
          requiresEmailVerification: true,
          email: data.email,
        };
      }

      if (result.user && result.session) {
        const profile = await syncUserProfileFromSupabase(result.user);
        const activeUser = profile || {
          id: result.user.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role || 'customer',
          businessName: data.businessName,
          vehicleType: data.vehicleType,
          vehiclePlate: data.vehiclePlate,
          createdAt: new Date().toISOString(),
          addresses: data.address ? [data.address] : [],
        };
        localStorage.setItem('haven_token', result.session.access_token);
        setToken(result.session.access_token);
        setUser(activeUser);
        return { user: activeUser, requiresEmailVerification: false, email: data.email };
      }

      return { requiresEmailVerification: true, email: data.email };
    } catch (err: any) {
      throw err;
    }
  };

  // Resend email verification link
  const resendVerification = async (email: string): Promise<boolean> => {
    return await supabaseResendVerification(email);
  };

  const logout = async () => {
    await supabaseSignOut();
    localStorage.removeItem('haven_token');
    setToken(null);
    setUser(null);
    setVerificationSuccessMsg(null);
  };

  const updateProfile = async (data: { name?: string; phone?: string; addresses?: any[]; businessName?: string }) => {
    // 1. Update on server
    try {
      const res = await api.updateProfile(data);
      setUser(res.user);
    } catch (e) {
      console.warn('Server profile update notice:', e);
    }

    // 2. Update on Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await saveUserProfileToSupabase(session.user, {
        name: data.name || user?.name || '',
        phone: data.phone || user?.phone || '',
        role: user?.role || 'customer',
        businessName: data.businessName || user?.businessName,
        vehicleType: user?.vehicleType,
        vehiclePlate: user?.vehiclePlate,
        addresses: data.addresses || user?.addresses || [],
      });
    }

    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const isCliffEmail = user?.email?.toLowerCase() === 'nyambageracliff@gmail.com';
  const isAdmin = user?.role === 'admin' || isCliffEmail;
  const isStaff = user?.role === 'staff' || isAdmin;
  const isDriver = user?.role === 'driver' || isAdmin;
  const isBuyer = user?.role === 'buyer' && !isAdmin;
  const isCustomer = (!user || user?.role === 'customer') && !isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        resendVerification,
        logout,
        updateProfile,
        isAdmin,
        isStaff,
        isDriver,
        isBuyer,
        isCustomer,
        isSupabaseConnected: isClientSupabaseConfigured,
        verificationSuccessMsg,
        clearVerificationMsg: () => setVerificationSuccessMsg(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
