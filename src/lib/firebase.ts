import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDIOeFUPlfs3F5g_avQvglGxMKCKG43BwQ",
  authDomain: "saheli-3f68f.firebaseapp.com",
  projectId: "saheli-3f68f",
  storageBucket: "saheli-3f68f.firebasestorage.app",
  messagingSenderId: "400858981809",
  appId: "1:400858981809:web:5515939fe6d14130e14990",
  measurementId: "G-4DFJ6D94BS"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
