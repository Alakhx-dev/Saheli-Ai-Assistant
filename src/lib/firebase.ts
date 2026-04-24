import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { clearIndexedDbPersistence, initializeFirestore, terminate } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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
export const auth = getAuth(app);
void setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Failed to set Firebase auth persistence", error);
});
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const storage = getStorage(app);

let persistenceResetInFlight = false;

export async function resetFirestorePersistence() {
  if (persistenceResetInFlight) {
    return;
  }

  persistenceResetInFlight = true;
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } finally {
    persistenceResetInFlight = false;
  }
}
