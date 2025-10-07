import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  continueAsGuest: () => void;
  exitGuest: () => void;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isGuest: false,
  continueAsGuest: () => {},
  exitGuest: () => {},
  signOut: async () => {},
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  // Set up auth state listener
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // If we have a real session, disable guest mode
      if (session?.user) setIsGuest(false);
      setLoading(false);
    }
  );

  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    // Restore guest mode only if no session
    if (!session) {
      const guest = localStorage.getItem('guest_mode') === 'true';
      setIsGuest(guest);
    }
    setLoading(false);
  });

  return () => subscription.unsubscribe();
}, []);


const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  // Clear guest mode too
  localStorage.removeItem('guest_mode');
  setIsGuest(false);
  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

const continueAsGuest = () => {
  localStorage.setItem('guest_mode', 'true');
  setIsGuest(true);
};

const exitGuest = () => {
  localStorage.removeItem('guest_mode');
  setIsGuest(false);
};

const value: AuthContextType = {
  user,
  session,
  isGuest,
  continueAsGuest,
  exitGuest,
  signOut,
  loading,
};

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};