import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

export const auth = getAuth();

const provider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, provider);

export const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

export const logout = () => signOut(auth);

export const listenAuth = (setUser) => {
  return onAuthStateChanged(auth, (user) => {
    setUser(user);
  });
};