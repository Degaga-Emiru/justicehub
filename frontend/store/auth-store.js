import { create } from "zustand";

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,

    login: async (email, password) => {
        try {
            const res = await fetch(`${getApiUrl()}/auth/login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                let message = "Invalid credentials";
                if (errorData.detail) message = errorData.detail;
                else if (errorData.non_field_errors) message = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
                else if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
                    message = Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`).join(" | ");
                }
                return { success: false, error: message };
            }

            const data = await res.json();

            // Assuming data contains access and refresh tokens, or user data
            if (data.access) {
                localStorage.setItem("access_token", data.access);
                localStorage.setItem("refresh_token", data.refresh);
            } else if (data.token) {
                localStorage.setItem("access_token", data.token);
            }

            // Try to fetch profile
            let userProfile = data.user || null;
            let role = "Client";

            if (!userProfile && data.access) {
                const profileRes = await fetch(`${getApiUrl()}/profile/`, {
                    headers: { "Authorization": `Bearer ${data.access}` }
                });
                if (profileRes.ok) {
                    userProfile = await profileRes.json();
                }
            }

            if (userProfile) {
                role = userProfile.role || userProfile.user_type || "Client";
            } else {
                // Mock user profile if the backend doesn't return one directly
                userProfile = { email, role };
            }

            set({ user: userProfile, isAuthenticated: true });
            return { success: true, role };
        } catch (error) {
            return { success: false, error: "Network error. Please try again later." };
        }
    },

    signup: async (first_name, last_name, email, phone_number, password, confirm_password) => {
        try {
            const res = await fetch(`${getApiUrl()}/auth/citizen-register/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ first_name, last_name, email, phone_number, password, confirm_password }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                // Flatten DRF field errors into a readable string
                const message = typeof errorData === "object"
                    ? Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`).join(" | ")
                    : "Registration failed";
                return { success: false, error: message };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: "Network error. Please try again later." };
        }
    },

    verifyOTP: async (email, otp, purpose = "VERIFICATION") => {
        try {
            const res = await fetch(`${getApiUrl()}/auth/verify-otp/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp, purpose }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                return { success: false, error: errorData.detail || errorData.otp?.[0] || "Verification failed" };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: "Network error. Please try again later." };
        }
    },

    resendOTP: async (email, purpose = "VERIFICATION") => {
        try {
            const res = await fetch(`${getApiUrl()}/auth/resend-otp/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, purpose }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                return { success: false, error: errorData.detail || "Failed to resend OTP" };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: "Network error. Please try again later." };
        }
    },


    logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false });
    },

    updateProfile: (updates) => {
        set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
        }));
    },

    // Initialize auth from token in localStorage when app loads
    initAuth: async () => {
        if (typeof window === "undefined") return;

        const token = localStorage.getItem("access_token");
        if (token) {
            try {
                const profileRes = await fetch(`${getApiUrl()}/profile/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (profileRes.ok) {
                    const userProfile = await profileRes.json();
                    set({ user: userProfile, isAuthenticated: true });
                } else {
                    localStorage.removeItem("access_token");
                    set({ user: null, isAuthenticated: false });
                }
            } catch (error) {
                set({ user: null, isAuthenticated: false });
            }
        }
    }
}));
