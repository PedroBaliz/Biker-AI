import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase client
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
});

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Custom Fetch Wrapper to automatically append the Firebase Auth ID Token to any internal API calls
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : (input instanceof URL ? input.toString() : (input as Request).url);
  
  let newInit = init ? { ...init } : {};
  if (url.startsWith("/api/")) {
    const headers = new Headers(newInit.headers || {});
    const user = auth.currentUser;

    if (user) {
      try {
        const token = await user.getIdToken();
        if (token && !headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        if (user.email && !headers.has("X-User-Email")) {
          headers.set("X-User-Email", user.email);
        }
      } catch (e) {
        console.error("Failed to append Firebase Auth ID token to API request:", e);
      }
    }

    if (!headers.has("X-User-Email")) {
      const storedEmail = localStorage.getItem("biker_ai_user_email");
      if (storedEmail) {
        headers.set("X-User-Email", storedEmail);
      }
    }

    newInit.headers = headers;
  }
  return fetch(input, newInit);
}

