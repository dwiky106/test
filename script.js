// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// CONFIG 
const firebaseConfig = {
  apiKey: "AIzaSyADQgZ1Pu0OmvWDJwDJgN6rPVt600ae1hg",
  authDomain: "monitor-lele.firebaseapp.com",
  projectId: "monitor-lele",
  appId: "1:1060711241947:web:57517544c5ecbde01bd4fe"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Form Login
const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");

form.addEventListener("submit", function(e){
  e.preventDefault();

  const userId = document.getElementById("userId").value;
const password = document.getElementById("password").value;

// ubah ID jadi email palsu
const fakeEmail = userId + "@app.com";

signInWithEmailAndPassword(auth, fakeEmail, password)
  .then((userCredential) => {
    const user = userCredential.user;

    localStorage.setItem("user", JSON.stringify(user));

    window.location.href = "dashboard.html";
  })
  .catch((error) => {
    errorMsg.textContent = "ID atau password salah!";
  });
});

const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("change", function () {
  if (this.checked) {
    passwordInput.type = "text";
  } else {
    passwordInput.type = "password";
  }
});

