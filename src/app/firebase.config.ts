// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCOmjBNgZh5d0lwekavPHWAp2T1TQw33dY",
  authDomain: "movietrendsapp.firebaseapp.com",
  projectId: "movietrendsapp",
  storageBucket: "movietrendsapp.appspot.com",
  messagingSenderId: "135628694973",
  appId: "1:135628694973:web:1576c7328034c37c621ed4",
  measurementId: "G-CZNJQ7NLV0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Authentication-Instanz exportieren
export const auth = getAuth(app);

// Firestore-Instanz exportieren
export const firestore = getFirestore(app);
