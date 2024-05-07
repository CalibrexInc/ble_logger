import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";


const firebaseConfig = {
    apiKey: "AIzaSyAYjFFJo9SlIFG7EqijZ1AtCMJvElHZ0a4",
    authDomain: "calibrex-data.firebaseapp.com",
    projectId: "calibrex-data",
    storageBucket: "calibrex-data.appspot.com",
    messagingSenderId: "904697613290",
    appId: "1:904697613290:web:31c2211b874926675c4093",
    measurementId: "G-TYDJQJEZXJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = app.storage();