export interface UserProfile {
  id: string;
  name: string;
  email: string;
  gender: "male" | "female";
  language: "en" | "hi";
  voiceType: "male" | "female";
  isLoggedIn: boolean;
  profileImage?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  id: "",
  name: "",
  email: "",
  gender: "female",
  language: "en",
  voiceType: "female",
  isLoggedIn: false,
};
