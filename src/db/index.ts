import { initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBOi6Z81BVOjcJoTBU41682UWfM4RN5eOw",
  authDomain: "glider-63dbf.firebaseapp.com",
  projectId: "glider-63dbf",
  storageBucket: "glider-63dbf.appspot.com",
  messagingSenderId: "498393629478",
  appId: "1:498393629478:web:65ecdbb7561d7fca2137e7",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const firebaseAuth = getAuth(app);