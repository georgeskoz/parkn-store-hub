import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { appRoleToDb, dbRoleToApp, type AppRole } from "@/lib/roleMapping";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, emailRedirectTo?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  addRole: (role: AppRole) => Promise<void>;
  removeRole: (role: AppRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("profiles_public")
      .select("id, display_name, avatar_url, bio, phone")
      .eq("id", userId)
      .maybeSingle();
    setProfile(
      data
        ? { ...data, stripe_account_id: null, stripe_onboarding_complete: false }
        : null,
    );
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data || [])
      .map((r: any) => dbRoleToApp(r.role as string))
      .filter((r): r is AppRole => r === "seeker" || r === "provider"));
  };



  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock on auth state change
          setTimeout(async () => {
            await Promise.all([
              fetchProfile(session.user.id),
              fetchRoles(session.user.id),
            ]);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
      // If there is a session, onAuthStateChange will handle it
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string, emailRedirectTo?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: emailRedirectTo ?? window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const addRole = async (role: AppRole) => {
    if (!user) return;
    const dbRole = appRoleToDb(role);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: dbRole as any });
    if (error && (error as any).code !== "23505") throw error;
    await fetchRoles(user.id);
  };

  const removeRole = async (role: AppRole) => {
    if (!user) return;
    const dbRole = appRoleToDb(role);
    await supabase.from("user_roles").delete().eq("user_id", user.id).eq("role", dbRole as any);
    await fetchRoles(user.id);
  };



  return (
    <AuthContext.Provider
      value={{ user, session, profile, roles, loading, signUp, signIn, signOut, addRole, removeRole, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
