// Authentication - JSCroot Implementation
import { setCookieWithExpireHour, getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/lib@0.0.4/cookie.js";
import { setInner, getValue } from "https://cdn.jsdelivr.net/gh/jscroot/lib@0.0.4/element.js";
import { redirect } from "https://cdn.jsdelivr.net/gh/jscroot/lib@0.0.4/url.js";

// Dynamic API Configuration
const API_BASE_URL = "$API_BASE_URL";

// Get GitHub username for redirects
const GITHUB_USERNAME = window.location.hostname.includes('github.io')
    ? window.location.hostname.split('.')[0]
    : 'mubaroqadb';

async function performLogin() {
    const startTime = performance.now();

    const email = getValue("email");
    const password = getValue("password");

    if (!email || !password) {
        setInner("message", "Email dan password harus diisi");
        return;
    }

    // Show loading state
    setInner("login-btn", "Logging in...");
    document.getElementById("login-btn").disabled = true;
    setInner("message", "");

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Carbon-Efficient": "true",
                "X-JSCroot": "optimized"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.status === "success") {
            // Set cookie for 24 hours
            setCookieWithExpireHour("login", data.token, 24);

            // Track carbon footprint
            const duration = performance.now() - startTime;
            console.log(`🌱 Login completed in ${duration.toFixed(2)}ms`);

            // Show success message
            setInner("message", "Login berhasil! Redirecting...");
            document.getElementById("message").className = "success";

            // Redirect based on role
            setTimeout(() => {
                switch (data.user.role) {
                    case "student":
                        redirect(`https://${GITHUB_USERNAME}.github.io/agenticlearn-student`);
                        break;
                    case "educator":
                        redirect(`https://${GITHUB_USERNAME}.github.io/agenticlearn-educator`);
                        break;
                    case "admin":
                        redirect(`https://${GITHUB_USERNAME}.github.io/agenticlearn-admin`);
                        break;
                    default:
                        redirect(`https://${GITHUB_USERNAME}.github.io/agenticlearn-student`);
                }
            }, 1000);

        } else {
            setInner("message", data.message || "Login gagal");
            document.getElementById("message").className = "error";
        }

    } catch (error) {
        console.error("Login error:", error);
        setInner("message", "Terjadi kesalahan koneksi. Silakan coba lagi.");
        document.getElementById("message").className = "error";
    } finally {
        setInner("login-btn", "Login");
        document.getElementById("login-btn").disabled = false;
    }
}

function checkExistingLogin() {
    const token = getCookie("login");
    if (token) {
        setInner("message", "Anda sudah login, mengalihkan ke dashboard...");
        document.getElementById("message").className = "success";

        // Redirect to student dashboard by default
        setTimeout(() => {
            redirect(`https://${GITHUB_USERNAME}.github.io/agenticlearn-student`);
        }, 1500);
    }
}

// Auto-fill demo credentials
function fillDemoCredentials(role) {
    const credentials = {
    };

    const cred = credentials[role];
    if (cred) {
        document.getElementById("email").value = cred.email;
        document.getElementById("password").value = cred.password;
    }
}

// Add click handlers for demo credentials
function setupDemoCredentialHandlers() {
    document.addEventListener('click', (e) => {
        }
    });
}

function initializeAuth() {
    // Check if already logged in
    checkExistingLogin();

    // Setup demo credential handlers
    setupDemoCredentialHandlers();

    // Setup form submission
    document.getElementById("login-form").addEventListener('submit', (e) => {
        e.preventDefault();
        performLogin();
    });

    // Setup enter key
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !document.getElementById("login-btn").disabled) {
            performLogin();
        }
    });

    console.log("🌱 AgenticLearn Auth loaded with JSCroot");
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', initializeAuth);
