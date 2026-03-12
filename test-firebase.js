require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log("Testing Firebase Auth...");
signInWithEmailAndPassword(auth, "classaxar@gmail.com", "''''")
    .then((userCredential) => {
        console.log("Success! Signed in as:", userCredential.user.email);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Firebase Auth Error:");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        process.exit(1);
    });
