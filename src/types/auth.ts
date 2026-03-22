export interface UserProfile {
  name: string;
  gender: "male" | "female";
  language: "en" | "hi";
  isLoggedIn: boolean;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: "",
  gender: "female",
  language: "en",
  isLoggedIn: false,
};
