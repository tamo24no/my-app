import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATp09gddns1TmwrzJrtc5dMACQvItJTq0",
  authDomain: "my-app-auth-c4c33.firebaseapp.com",
  projectId: "my-app-auth-c4c33",
  storageBucket: "my-app-auth-c4c33.appspot.com",
  messagingSenderId: "969276576261",
  appId: "1:969276576261:web:734cf567d291d0a9dcc26c",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // Firestore を追加！
