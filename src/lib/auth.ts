import { UserProfile, DEFAULT_PROFILE, User } from "@/types/auth";

const AUTH_KEY = "saheli_auth";
const THEME_KEY = "saheli_theme";
const USERS_KEY = "saheli_users";
const PROFILE_IMAGE_KEY = "saheli_profile_image";

// Users database (localStorage)
export function getAllUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(USERS_KEY);
    const users = stored ? JSON.parse(stored) : [];
    
    // Add demo account if not exists
    if (!users.some((u: User) => u.email === "demo@saheli.com")) {
      users.push({
        id: "demo-user-001",
        name: "Demo User",
        email: "demo@saheli.com",
        password: "demo123",
      });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    
    return users;
  } catch {
    return [];
  }
}

export function saveUser(user: User): void {
  if (typeof window === "undefined") return;
  try {
    const users = getAllUsers();
    const existing = users.findIndex(u => u.email === user.email);
    if (existing > -1) {
      users[existing] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Failed to save user:", e);
  }
}

// Auth functions
export function signup(name: string, email: string, password: string, gender: "male" | "female" = "female"): { success: boolean; error?: string; user?: UserProfile } {
  const users = getAllUsers();
  
  // Validate input
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return { success: false, error: "All fields are required" };
  }
  
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: "Email already registered" };
  }
  
  // Create new user
  const newUser: User = {
    id: Date.now().toString(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
  };
  
  saveUser(newUser);
  
  const profile: UserProfile = {
    id: newUser.id,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    gender,
    language: "en",
    voiceType: gender === "female" ? "female" : "male",
    isLoggedIn: true,
    profileImage: undefined,
  };
  
  saveProfile(profile);
  return { success: true, user: profile };
}

export function login(email: string, password: string): { success: boolean; error?: string; user?: UserProfile } {
  // Validate input
  if (!email?.trim() || !password?.trim()) {
    return { success: false, error: "Email and password are required" };
  }
  
  const users = getAllUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  
  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }
  
  if (user.password !== password) {
    return { success: false, error: "Invalid email or password" };
  }
  
  // Load existing profile or create new one
  const existingProfile = loadProfile();
  const profile: UserProfile = {
    id: user.id,
    name: user.name,
    email: user.email,
    gender: existingProfile.id === user.id ? existingProfile.gender : "female",
    language: existingProfile.id === user.id ? existingProfile.language : "en",
    voiceType: existingProfile.id === user.id ? existingProfile.voiceType : "female",
    isLoggedIn: true,
    profileImage: existingProfile.id === user.id ? existingProfile.profileImage : undefined,
  };
  
  saveProfile(profile);
  return { success: true, user: profile };
}

export function logout(): void {
  clearProfile();
}

export function loadProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save profile:", e);
  }
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (e) {
    console.error("Failed to clear profile:", e);
  }
}

export function loadTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
    // Default to system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveTheme(theme: "light" | "dark"): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {
    console.error("Failed to save theme:", e);
  }
}

export function updateProfile(updates: Partial<UserProfile>): void {
  const profile = loadProfile();
  if (!profile.isLoggedIn) return;
  
  const updated = { ...profile, ...updates };
  saveProfile(updated);
  
  // Update user in database if name changed
  if (updates.name) {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === profile.id);
    if (userIndex > -1) {
      users[userIndex].name = updates.name;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  }
}

export function updatePassword(oldPassword: string, newPassword: string): { success: boolean; error?: string } {
  const profile = loadProfile();
  if (!profile.isLoggedIn) return { success: false, error: "Not logged in" };
  
  const users = getAllUsers();
  const user = users.find(u => u.id === profile.id);
  
  if (!user) return { success: false, error: "User not found" };
  if (user.password !== oldPassword) return { success: false, error: "Incorrect current password" };
  if (!newPassword?.trim() || newPassword.length < 6) return { success: false, error: "Password must be at least 6 characters" };
  
  user.password = newPassword;
  saveUser(user);
  
  return { success: true };
}
