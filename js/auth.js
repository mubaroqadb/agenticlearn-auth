// Authentication - JSCroot Implementation with Cloud Functions
import { setCookieWithExpireHour, getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/lib@0.0.4/cookie.js";
import { setInner, getValue } from "https://cdn.jsdelivr.net/gh/jscroot/lib@0.0.4/element.js";
import { redirect } from "https://cdn.jsdelivr.net/gh/jscroot/lib@0.0.4/url.js";
import { AgenticAPIClient } from "https://mubaroqadb.github.io/agenticlearn-shared/js/api-client.js";

// Initialize API client
const apiClient = new AgenticAPIClient();

// Get GitHub username for redirects
const GITHUB_USERNAME = window.location.hostname.includes('github.io')
    ? window.location.hostname.split('.')[0]
    : 'mubaroqadb';

// Helper function to decode JWT token and extract role
function decodeJWTRole(token) {
    try {
        if (!token) return null;

        // JWT has 3 parts separated by dots
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // Decode the payload (second part)
        const payload = parts[1];
        // Add padding if needed
        const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
        const decodedPayload = atob(paddedPayload);
        const payloadObj = JSON.parse(decodedPayload);

        console.log("🔍 JWT Payload:", payloadObj);
        return payloadObj.role || null;
    } catch (error) {
        console.error("❌ Failed to decode JWT:", error);
        return null;
    }
}

// Helper function to redirect to appropriate portal
function redirectToPortal(role) {
    console.log(`🎯 Redirecting to ${role} portal...`);
    switch (role) {
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
            console.log("🔄 Unknown role, defaulting to student");
            redirect(`https://${GITHUB_USERNAME}.github.io/agenticlearn-student`);
    }
}

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
        // Use Cloud Functions API client
        const data = await apiClient.auth('/login', {
            method: "POST",
            body: { email, password }
        });

        if (data.status === "success") {
            // Set cookie for 24 hours - use access_token from Cloud Functions
            const token = data.data.access_token || data.token;
            setCookieWithExpireHour("login", token, 24);

            // Track carbon footprint
            const duration = performance.now() - startTime;
            console.log(`🌱 Login completed in ${duration.toFixed(2)}ms`);

            // Show success message
            setInner("message", "Login berhasil! Redirecting...");
            document.getElementById("message").className = "success";

            // Redirect based on role
            setTimeout(() => {
                const user = data.data.user || data.user;
                redirectToPortal(user.role);
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

async function checkExistingLogin() {
    const token = getCookie("login");
    console.log("🔍 Checking existing login, token:", token ? "exists" : "none");

    if (token) {
        setInner("message", "Anda sudah login, mengalihkan ke dashboard...");
        document.getElementById("message").className = "success";

        try {
            console.log("🔄 Fetching user profile...");

            // Try to decode JWT token to get role directly
            const roleFromToken = decodeJWTRole(token);
            if (roleFromToken) {
                console.log("🎯 Got role from JWT token:", roleFromToken);
                setTimeout(() => {
                    redirectToPortal(roleFromToken);
                }, 1500);
                return;
            }

            // Fallback to API call
            const response = await apiClient.auth('/profile');
            console.log("📋 Profile response:", response);

            const user = response.data?.profile || response.data?.user || response.user;
            console.log("👤 User data:", user);
            console.log("🎭 User role:", user?.role);

            if (!user || !user.role) {
                console.warn("⚠️ No user or role found, using fallback");
                setTimeout(() => {
                    redirect(`https://${GITHUB_USERNAME}.github.io/agenticlearn-student`);
                }, 1500);
                return;
            }

            setTimeout(() => {
                console.log(`🎯 Redirecting to ${user.role} portal...`);
                redirectToPortal(user.role);
            }, 1500);

        } catch (error) {
            console.error("❌ Failed to get user profile:", error);
            // Try direct backend call as fallback (both localhost and production)
            const backendUrls = [
                'http://localhost:8080/api/v1/auth/profile',
                'https://agenticlearn-backend-production.up.railway.app/api/v1/auth/profile'
            ];

            for (const url of backendUrls) {
                try {
                    console.log(`🔄 Trying direct backend call to: ${url}`);
                    const directResponse = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (directResponse.ok) {
                        const directData = await directResponse.json();
                        console.log("📋 Direct response:", directData);
                        const user = directData.data?.profile || directData.data?.user || directData.user;

                        if (user && user.role) {
                            setTimeout(() => {
                                console.log(`🎯 Direct redirect to ${user.role} portal...`);
                                redirectToPortal(user.role);
                            }, 1500);
                            return;
                        }
                    }
                } catch (directError) {
                    console.error(`❌ Direct backend call failed for ${url}:`, directError);
                }
            }

            // Final fallback to student dashboard
            console.log("🔄 Using final fallback to student portal");
            setTimeout(() => {
                redirect(`https://${GITHUB_USERNAME}.github.io/agenticlearn-student`);
            }, 1500);
        }
    }
}

// Auto-fill demo credentials and perform demo login
function fillDemoCredentials(role) {
    console.log(`🎭 Demo login for role: ${role}`);

    // Demo credentials mapping
    const demoCredentials = {
        student: {
            email: "student.test@agenticlearn.id",
            name: "Andi Mahasiswa Test",
            role: "student"
        },
        educator: {
            email: "educator.test@agenticlearn.id",
            name: "Dr. Sarah Educator Test",
            role: "educator"
        },
        admin: {
            email: "admin.test2@agenticlearn.id",
            name: "Admin System Test",
            role: "admin"
        }
    };

    const demo = demoCredentials[role];
    if (!demo) {
        showNotification("Invalid demo role", "error");
        return;
    }

    // Fill form
    document.getElementById("email").value = demo.email;
    document.getElementById("password").value = "password123";

    // Show demo login message
    setInner("message", `Demo login sebagai ${demo.name}...`);
    document.getElementById("message").className = "success";

    // Create demo JWT token
    const demoToken = createDemoJWT(demo);

    // Set cookie
    setCookieWithExpireHour("login", demoToken, 24);

    // Redirect after short delay
    setTimeout(() => {
        console.log(`🎯 Demo redirect to ${role} portal`);
        redirectToPortal(role);
    }, 1500);
}

// Create demo JWT token for testing
function createDemoJWT(user) {
    const header = {
        "alg": "HS256",
        "typ": "JWT"
    };

    const payload = {
        "user_id": "demo_" + user.role + "_id",
        "email": user.email,
        "role": user.role,
        "name": user.name,
        "token_type": "access",
        "iss": "AgenticLearn",
        "exp": Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        "iat": Math.floor(Date.now() / 1000)
    };

    // Simple base64 encoding for demo (not secure, just for testing)
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = "demo_signature_" + user.role;

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Add click handlers for demo credentials
function setupDemoCredentialHandlers() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('demo-btn')) {
            const role = e.target.dataset.role;
            fillDemoCredentials(role);
        }
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        background: ${type === 'info' ? '#2196F3' : type === 'error' ? '#f44336' : '#4CAF50'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
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

    console.log("🌱 AgenticLearn Auth loaded with JSCroot + Cloud Functions");
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', initializeAuth);
