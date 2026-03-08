import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { app, isFirebaseConfigured } from "./firebase";

export const auth = isFirebaseConfigured ? getAuth(app) : null;

const provider = new GoogleAuthProvider();

export const loginWithGoogle = () => auth ? signInWithPopup(auth, provider) : Promise.reject(new Error("Firebase not configured"));

export const loginWithEmail = (email, password) => auth ? signInWithEmailAndPassword(auth, email, password) : Promise.reject(new Error("Firebase not configured"));

export const logout = () => auth ? signOut(auth) : Promise.resolve();

export const listenAuth = (setUser) => {
  if (!auth) return () => { };
  return onAuthStateChanged(auth, (user) => {
    setUser(user);
  });
};