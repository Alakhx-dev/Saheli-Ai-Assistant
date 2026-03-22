export const i18n = {
  en: {
    // Auth
    auth: {
      loginTitle: "Welcome to Saheli AI",
      loginDescription: "Your personal AI companion",
      signupTitle: "Create Your Account",
      name: "Name",
      namePlaceholder: "Your name",
      gender: "Gender",
      language: "Language",
      male: "Male",
      female: "Female",
      hindi: "Hindi",
      english: "English",
      loginBtn: "Login",
      signupBtn: "Sign Up",
      alreadyHaveAccount: "Already have an account?",
      dontHaveAccount: "Don't have an account?",
      startChatting: "Start Chatting",
      welcomeMessage: "Hi! I'm Saheli, your personal AI companion. Let's chat!",
    },
    // Chat
    chat: {
      newChat: "New Chat",
      placeholder: "Message Saheli...",
      listeningPlaceholder: "Listening... 🎤",
      sendMessage: "Send",
      audioOn: "Audio On",
      audioOff: "Audio Off",
      scanLook: "Scan Look",
      online: "online",
      typing: "typing...",
      listening: "listening...",
      noChatsYet: "No chats yet. Start a new conversation!",
      logout: "Logout",
      theme: "Theme",
      language: "Language",
      dark: "Dark",
      light: "Light",
    },
    // Error messages
    errors: {
      cameraError: "Camera access denied. Please check permissions!",
      connectionError: "Connection error. Please try again!",
      defaultError: "Something went wrong. Try again!",
    },
  },
  hi: {
    // Auth
    auth: {
      loginTitle: "Saheli AI में स्वागत है",
      loginDescription: "आपकी व्यक्तिगत AI साथी",
      signupTitle: "अपना खाता बनाएं",
      name: "नाम",
      namePlaceholder: "अपना नाम डालो",
      gender: "लिंग",
      language: "भाषा",
      male: "पुरुष",
      female: "महिला",
      hindi: "हिंदी",
      english: "अंग्रेजी",
      loginBtn: "लॉगिन",
      signupBtn: "साइन अप",
      alreadyHaveAccount: "पहले से खाता है?",
      dontHaveAccount: "खाता नहीं है?",
      startChatting: "बातचीत शुरू करो",
      welcomeMessage: "हाय! मैं हूँ तुम्हारी Saheli AI। बात करते हैं 💕",
    },
    // Chat
    chat: {
      newChat: "नई बातचीत",
      placeholder: "Saheli को संदेश दो...",
      listeningPlaceholder: "सुन रही हूँ... 🎤",
      sendMessage: "भेजो",
      audioOn: "ऑडियो चालू",
      audioOff: "ऑडियो बंद",
      scanLook: "लुक स्कैन करो",
      online: "online",
      typing: "लिख रही हूँ...",
      listening: "सुन रही हूँ...",
      noChatsYet: "अभी कोई चैट नहीं है। नई बातचीत शुरू करो!",
      logout: "लॉगआउट",
      theme: "थीम",
      language: "भाषा",
      dark: "डार्क",
      light: "लाइट",
    },
    // Error messages
    errors: {
      cameraError: "कैमरा एक्सेस नहीं हो सका। अनुमति जांचो!",
      connectionError: "कनेक्शन एरर। फिर से कोशिश करो!",
      defaultError: "कुछ गलत हुआ। फिर से कोशिश करो!",
    },
  },
};

export type Language = "en" | "hi";

export function getI18n(lang: Language) {
  return i18n[lang];
}

export function getI18nText(lang: Language, path: string): string {
  const keys = path.split(".");
  let value: any = i18n[lang];
  for (const key of keys) {
    value = value?.[key];
  }
  return value || path;
}
