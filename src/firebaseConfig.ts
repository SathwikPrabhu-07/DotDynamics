import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC56oMvKVbjNBK0p1rNjDifddwNZORhj8s",
    authDomain: "dotdynamics-7cb77.firebaseapp.com",
    projectId: "dotdynamics-7cb77",
    storageBucket: "dotdynamics-7cb77.firebasestorage.app",
    messagingSenderId: "25704011641",
    appId: "1:25704011641:web:823f9524d76d3d2f8dc1a8",
    measurementId: "G-81MJ0HMELM",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
