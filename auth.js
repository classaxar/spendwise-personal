import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";

export const auth = getAuth();

const provider = new GoogleAuthProvider();

export const login = () => signInWithPopup(auth, provider);

export const logout = () => signOut(auth);

export const listenAuth = (setUser) => {
  return onAuthStateChanged(auth, (user) => {
    setUser(user);
  });
};