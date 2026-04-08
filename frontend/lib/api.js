const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function formatError(errData) {
    if (typeof errData === 'string') return errData;
    if (errData?.detail) return errData.detail;
    if (errData?.error) return errData.error;
    if (typeof errData === 'object' && errData !== null) {
        const messages = [];
        for (const [key, value] of Object.entries(errData)) {
            if (Array.isArray(value)) {
                messages.push(`${key}: ${value[0]}`);
            } else {
                messages.push(`${key}: ${value}`);
            }
        }
        return messages.join('\n');
    }
    return null;
}


const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    return {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
};

export async function setupAccountPassword(data) {
    try {
        const res = await fetch(`${getApiUrl()}/auth/set-password/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to set up account password");
        }
        return await res.json();
    } catch (error) {
        console.error("setupAccountPassword error:", error);
        throw error;
    }
}

export async function fetchCases(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const res = await fetch(`${getApiUrl()}/cases/?${queryParams}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch cases");
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
        console.error("fetchCases error:", error);
        return [];
    }
}

export async function fetchCategories() {
    try {
        const res = await fetch(`${getApiUrl()}/cases/categories/active/`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error("fetchCategories error:", error);
        return [];
    }
}

export async function fetchCaseById(id) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/${id}/`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch case");
        return await res.json();
    } catch (error) {
        console.error("fetchCaseById error:", error);
        return null;
    }
}

export async function fetchHearings(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const res = await fetch(`${getApiUrl()}/hearings/?${queryParams}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch hearings");
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
        console.error("fetchHearings error:", error);
        return [];
    }
}

export async function fetchUsers(filters = {}) {
    try {
        // Typically role-based access for this, but let's assume there is a users endpoint or fallback
        const queryParams = new URLSearchParams(filters).toString();
        const res = await fetch(`${getApiUrl()}/users/?${queryParams}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
        console.error("fetchUsers error:", error);
        return [];
    }
}

export async function adminCreateUser(userData) {
    try {
        const res = await fetch(`${getApiUrl()}/auth/admin-create-user/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to create user");
        }
        return await res.json();
    } catch (error) {
        console.error("adminCreateUser error:", error);
        throw error;
    }
}

export async function fetchTransactions(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const res = await fetch(`${getApiUrl()}/payments/?${queryParams}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
        console.error("fetchTransactions error:", error);
        return [];
    }
}

export async function confirmPayment(transactionId) {
    try {
        const res = await fetch(`${getApiUrl()}/payments/${transactionId}/verify/`, {
            method: "PATCH", // Changed to PATCH to work with DRF UpdateAPIView
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Payment verification failed");
        return await res.json();
    } catch (error) {
        console.error("verifyPayment error:", error);
        throw error;
    }
}

export async function fetchReports() {
    try {
        // Assume there is a general reports or statistics endpoint
        const res = await fetch(`${getApiUrl()}/audit/reports/`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch reports");
        return await res.json();
    } catch (error) {
        console.error("fetchReports error:", error);
        return { totalCases: 0, closedCases: 0, pendingCases: 0, totalRevenue: 0 };
    }
}

export async function createCase(data) {
    try {
        const isFormData = data instanceof FormData;
        const headers = getAuthHeaders();
        if (isFormData) {
            delete headers['Content-Type'];
        }

        const res = await fetch(`${getApiUrl()}/cases/`, {
            method: "POST",
            headers,
            body: isFormData ? data : JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to create case");
        }
        return await res.json();
    } catch (error) {
        console.error("createCase error:", error);
        throw error;
    }
}

export async function reviewCase(caseId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/${caseId}/review/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to review case");
        }
        return await res.json();
    } catch (error) {
        console.error("reviewCase error:", error);
        throw error;
    }
}

export async function submitPayment(data) {
    try {
        const res = await fetch(`${getApiUrl()}/payments/submit/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to submit payment");
        }
        return await res.json();
    } catch (error) {
        console.error("submitPayment error:", error);
        throw error;
    }
}

export async function fetchPendingCases() {
    try {
        const res = await fetch(`${getApiUrl()}/cases/pending_review/`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch pending cases");
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
        console.error("fetchPendingCases error:", error);
        return [];
    }
}

export async function adminUpdateUser(userId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/users/${userId}/`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || JSON.stringify(errData) || "Failed to update user");
        }
        return await res.json();
    } catch (error) {
        console.error("adminUpdateUser error:", error);
        throw error;
    }
}

export async function adminDeleteUser(userId) {
    try {
        const res = await fetch(`${getApiUrl()}/users/${userId}/`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || JSON.stringify(errData) || "Failed to delete user");
        }
        return true;
    } catch (error) {
        console.error("adminDeleteUser error:", error);
        throw error;
    }
}

export async function fetchDashboardStats() {
    try {
        const res = await fetch(`${getApiUrl()}/cases/statistics/dashboard/`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return {};
        return await res.json();
    } catch (error) {
        console.error("fetchDashboardStats error:", error);
        return {};
    }
}

export async function fetchAuditLogs(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const res = await fetch(`${getApiUrl()}/audit/logs/?${queryParams}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return { results: [], count: 0 };
        const data = await res.json();
        return data;
    } catch (error) {
        console.error("fetchAuditLogs error:", error);
        return { results: [], count: 0 };
    }
}

export async function fetchCaseTypeDistribution() {
    try {
        const res = await fetch(`${getApiUrl()}/cases/statistics/case-type-distribution/`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error("fetchCaseTypeDistribution error:", error);
        return [];
    }
}

export async function fetchNotifications(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const res = await fetch(`${getApiUrl()}/notifications/?${queryParams}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
        console.error("fetchNotifications error:", error);
        return [];
    }
}

export async function scheduleHearing(data) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to schedule hearing");
        }
        return await res.json();
    } catch (error) {
        console.error("scheduleHearing error:", error);
        throw error;
    }
}

export async function rescheduleHearing(id, data) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${id}/reschedule/`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to reschedule hearing");
        }
        return await res.json();
    } catch (error) {
        console.error("rescheduleHearing error:", error);
        throw error;
    }
}
