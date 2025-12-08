import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// add these (or merge with your existing firestore imports)
import { doc, setDoc, getDoc, enableNetwork, getDocFromServer, serverTimestamp } from "firebase/firestore";



const firebaseConfig = {
  apiKey: "AIzaSyBUGgLxAJvLBmU2r2tE0O8SzPqUsR5ID80",
  authDomain: "crime-record-management-75534.firebaseapp.com",
  projectId: "crime-record-management-75534",
  storageBucket: "crime-record-management-75534.firebasestorage.app",
  messagingSenderId: "235668625691",
  appId: "1:235668625691:web:1f047de34103abcef9dbbe",
  measurementId: "G-QGSSVT4Z8D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export essential Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);