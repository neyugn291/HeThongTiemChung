import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBS41ALRvHi7Fm_fLvfgKL11T738unCNe0",
  authDomain: "vaccinationapp-cb597.firebaseapp.com",
  databaseURL: "https://vaccinationapp-cb597-default-rtdb.firebaseio.com",
  projectId: "vaccinationapp-cb597",
  storageBucket: "vaccinationapp-cb597.appspot.com",
  messagingSenderId: "115864967085",
  appId: "1:115864967085:web:c028c3aad6a39879b0b324",
};

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  app = initializeApp(firebaseConfig, "secondary");
}

const database = getDatabase(app);

export { database, ref, onValue, push, set, update }; // Xuất các hàm cần thiết
export default app;