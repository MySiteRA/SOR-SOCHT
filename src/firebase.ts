import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDgZ2rctySr7Q2dcKe0MAl6ooMM_ZA1s4w",
  authDomain: "sor-soch.firebaseapp.com",
  databaseURL: "https://sor-soch-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sor-soch",
  storageBucket: "sor-soch.firebasestorage.app",
  messagingSenderId: "997945606862",
  appId: "1:997945606862:web:04a2d15d9e7482fc38869f",
  measurementId: "G-BXM9KYG49C"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);