// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyAm1BiqPabnh0X-FLxctRUAoRWbd9OrdlI",
  authDomain: "kana-loop.firebaseapp.com",
  projectId: "kana-loop",
  storageBucket: "kana-loop.firebasestorage.app",
  messagingSenderId: "566732000404",
  appId: "1:566732000404:web:07c9fefe1727f863bd3881",
  measurementId: "G-QJRHXDT7E4"
};

// Firebase 초기화 (v8 스타일)
firebase.initializeApp(firebaseConfig);

// 전역에서 사용할 수 있도록 변수 선언
const db = firebase.firestore();
const auth = firebase.auth();