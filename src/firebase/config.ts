import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgXSf0mNdOzeWzhGbmfP6BxqeQNuZ0ejc",
  authDomain: "dptrtss-v2.firebaseapp.com",
  projectId: "dptrtss-v2",
  storageBucket: "dptrtss-v2.firebasestorage.app",
  messagingSenderId: "101843765424",
  appId: "1:101843765424:web:ae13ef3b3f661ca6d09375"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

