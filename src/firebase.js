import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const cleanEnv = (val) => val ? val.replace(/^["']|["']$/g, '').trim() : val;

export const firebaseConfig = {
    apiKey: cleanEnv(process.env.REACT_APP_FIREBASE_API_KEY),
    authDomain: cleanEnv(process.env.REACT_APP_FIREBASE_AUTH_DOMAIN),
    projectId: cleanEnv(process.env.REACT_APP_FIREBASE_PROJECT_ID),
    storageBucket: cleanEnv(process.env.REACT_APP_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: cleanEnv(process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID),
    appId: cleanEnv(process.env.REACT_APP_FIREBASE_APP_ID)
};

export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "your_api_key_here";

let app;
let db;

if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
}

export { app, db };
