// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyATp09gddns1TmwrzJrtc5dMACQvItJTq0",
  authDomain: "my-app-auth-c4c33.firebaseapp.com",
  projectId: "my-app-auth-c4c33",
  storageBucket: "my-app-auth-c4c33.firebasestorage.app",
  messagingSenderId: "969276576261",
  appId: "1:969276576261:web:734cf567d291d0a9dcc26c",
  measurementId: "G-WV19BD2MZM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);