import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  aud: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: { user: AuthUser } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  signIn: async () => {},
  signUp: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("saheli_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("[Auth] Failed to parse stored user:", error);
        localStorage.removeItem("saheli_user");
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // Validate credentials (simple mock validation)
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Check if user exists in localStorage
    const storedUser = localStorage.getItem(`saheli_user_${email}`);
    if (!storedUser) {
      throw new Error("Invalid email or password");
    }

    const userData = JSON.parse(storedUser);
    if (userData.password !== password) {
      throw new Error("Invalid email or password");
    }

    const userSession: AuthUser = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      aud: "authenticated",
    };

    setUser(userSession);
    localStorage.setItem("saheli_user", JSON.stringify(userSession));
  };

  const signUp = async (email: string, password: string, name: string) => {
    // Validate input
    if (!email || !password || !name) {
      throw new Error("All fields are required");
    }

    // Check if user already exists
    if (localStorage.getItem(`saheli_user_${email}`)) {
      throw new Error("User already exists");
    }

    // Create new user
    const userId = `user_${Date.now()}`;
    const userData = {
      id: userId,
      email,
      password,
      name: name.trim(),
    };

    // Store user data (in real app, this would be hashed)
    localStorage.setItem(`saheli_user_${email}`, JSON.stringify(userData));

    const userSession: AuthUser = {
      id: userId,
      email,
      name: name.trim(),
      aud: "authenticated",
    };

    setUser(userSession);
    localStorage.setItem("saheli_user", JSON.stringify(userSession));
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem("saheli_user");
  };

  const session = user ? { user } : null;

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, signIn, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
