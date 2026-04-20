// =======================
// 🔥 IMPORT FIREBASE
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// =======================
// 🔥 CONFIG FIREBASE
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyADQgZ1Pu0OmvWDJwDJgN6rPVt600ae1hg",
  authDomain: "monitor-lele.firebaseapp.com",
  projectId: "monitor-lele",
  appId: "1:1060711241947:web:57517544c5ecbde01bd4fe"
};

// =======================
// 🔥 INIT FIREBASE
// =======================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// =======================
// 🔥 ELEMENT
// =======================
const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");

// =======================
// 🔥 LOGIN FUNCTION
// =======================
form.addEventListener("submit", function(e) {
  e.preventDefault();

  const userId = document.getElementById("userId").value.trim();
  const password = document.getElementById("password").value.trim();

  let email = "";

  // DETEKSI ROLE DARI INPUT
  if (userId.startsWith("sfs.")) {
    email = userId + "@ops.com";
  } else {
    email = userId + "@app.com";
  }

  console.log("LOGIN EMAIL:", email); // 🔥 debug

  // 🔥 LOGIN
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch((err) => {
      console.error(err.code);
      errorMsg.textContent = "ID atau password salah!";
    });
});

// =======================
// 🔥 TOGGLE PASSWORD
// =======================
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("change", function () {
  passwordInput.type = this.checked ? "text" : "password";
});
