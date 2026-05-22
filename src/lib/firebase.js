
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyBD81nsVfpvDOuHb4bMPLTSbm2YBFlfvjU",
    authDomain: "autosporting-app.firebaseapp.com",
    projectId: "autosporting-app",
    storageBucket: "autosporting-app.firebasestorage.app",
    messagingSenderId: "655682442996",
    appId: "1:655682442996:web:077412dc3385e70d36f0a1",
    measurementId: "G-4W5D70BRX0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const db = getFirestore(app);
export const storage = getStorage(app);
// Optional: export const analytics = getAnalytics(app); 
