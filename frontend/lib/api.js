const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function formatError(errData) {
    if (typeof errData === 'string') return errData;
    if (errData?.detail) return errData.detail;
    // Prefer 'details' (the actual message) over 'error' (the generic code)
    if (errData?.details) return errData.details;
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
        const res = await fetch(`${getApiUrl()}/cases/categories/`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
        console.error("fetchCategories error:", error);
        return [];
    }
}

export async function createCategory(data) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/categories/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to create category");
        }
        return await res.json();
    } catch (error) {
        console.error("createCategory error:", error);
        throw error;
    }
}

export async function fetchAvailableJudges(categoryId) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/judge-profiles/available/?category=${categoryId}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch available judges");
        return await res.json();
    } catch (error) {
        console.error("fetchAvailableJudges error:", error);
        return [];
    }
}

export async function createJudgeProfile(data) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/judge-profiles/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to create judge profile");
        }
        return await res.json();
    } catch (error) {
        console.error("createJudgeProfile error:", error);
        throw error;
    }
}

export async function fetchAllJudgeProfiles() {
    try {
        const res = await fetch(`${getApiUrl()}/cases/judge-profiles/`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch judge profiles");
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
        console.error("fetchAllJudgeProfiles error:", error);
        return [];
    }
}

export async function updateJudgeProfile(id, data) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/judge-profiles/${id}/`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to update judge profile");
        }
        return await res.json();
    } catch (error) {
        console.error("updateJudgeProfile error:", error);
        throw error;
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

export async function fetchHearingById(id) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${id}/`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to fetch hearing details");
        }
        return await res.json();
    } catch (error) {
        console.error("fetchHearingById error:", error);
        throw error;
    }
}

export async function fetchUsers(filters = {}) {
    try {
        // Typically role-based access for this, but let's assume there is a users endpoint or fallback
        const queryParams = new URLSearchParams(filters).toString();
        const res = await fetch(`${getApiUrl()}/admin/users/?${queryParams}`, {
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

export async function confirmPayment(txRef) {
    try {
        const res = await fetch(`${getApiUrl()}/payments/verify/${txRef}/`, {
            method: "GET",
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Payment verification failed");
        }
        return await res.json();
    } catch (error) {
        console.error("verifyPayment error:", error);
        throw error;
    }
}

export async function fetchReports() {
    try {
        const res = await fetch(`${getApiUrl()}/reports/admin/system/?type=overview`, {
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
        const res = await fetch(`${getApiUrl()}/payments/bank-transfer-submit/`, {
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
        const res = await fetch(`${getApiUrl()}/admin/users/${userId}/`, {
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

export async function adminToggleUserStatus(userId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/admin/users/${userId}/toggle-status/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data) // e.g. { action: 'activate' | 'deactivate', reason: '' }
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || JSON.stringify(errData) || "Failed to toggle status");
        }
        return await res.json();
    } catch (error) {
        console.error("adminToggleUserStatus error:", error);
        throw error;
    }
}

export async function adminResetPassword(userId, sendEmail = true) {
    try {
        const res = await fetch(`${getApiUrl()}/admin/users/${userId}/reset-password/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ send_email: sendEmail })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || JSON.stringify(errData) || "Failed to reset password");
        }
        return await res.json();
    } catch (error) {
        console.error("adminResetPassword error:", error);
        throw error;
    }
}

export function getAdminUsersExportUrl() {
    return `${getApiUrl()}/admin/users/export/`;
}

export async function adminDeleteUser(userId) {
    try {
        const res = await fetch(`${getApiUrl()}/admin/users/${userId}/`, {
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

export async function purgeAuditLogs(days) {
    try {
        const res = await fetch(`${getApiUrl()}/audit/logs/purge_old/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ days })
        });
        if (!res.ok) throw new Error("Failed to purge audit logs");
        return await res.json();
    } catch (error) {
        console.error("purgeAuditLogs error:", error);
        throw error;
    }
}

export async function deleteAuditLog(logId) {
    try {
        const res = await fetch(`${getApiUrl()}/audit/logs/${logId}/`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to delete audit log");
        return true;
    } catch (error) {
        console.error("deleteAuditLog error:", error);
        throw error;
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

// ======================================
// ADMIN REPORTS & ANALYTICS
// ======================================

export async function fetchSystemReport(type = 'overview', filters = {}) {
    try {
        const queryParams = new URLSearchParams({ type, ...filters }).toString();
        const res = await fetch(`${getApiUrl()}/reports/admin/system/?${queryParams}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch system report");
        return await res.json();
    } catch (error) {
        console.error("fetchSystemReport error:", error);
        throw error;
    }
}

export async function fetchAnalyticsReport(type = 'master') {
    try {
        const queryParams = new URLSearchParams({ type }).toString();
        const res = await fetch(`${getApiUrl()}/reports/admin/analytics/?${queryParams}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch analytics report");
        return await res.json();
    } catch (error) {
        console.error("fetchAnalyticsReport error:", error);
        throw error;
    }
}

export function getReportDownloadUrl(format = 'pdf', type = 'system', filters = {}) {
    const queryParams = new URLSearchParams({ type, ...filters }).toString();
    return `${getApiUrl()}/reports/admin/export/${format}/?${queryParams}`;
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
        const payload = {
            ...data,
            scheduled_date: data.scheduled_date ? new Date(data.scheduled_date).toISOString() : undefined,
            hearing_format: data.hearing_format || "PHYSICAL",
        };
        
        const res = await fetch(`${getApiUrl()}/hearings/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
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
        // Backend expects { new_date: "YYYY-MM-DD", new_time: "HH:MM", reason: "..." }
        const payload = {};
        if (data.new_date) payload.new_date = data.new_date;
        if (data.new_time) payload.new_time = data.new_time;
        if (data.reason) payload.reason = data.reason;
        // Fallback: if caller sends scheduled_date as ISO, split it
        if (data.scheduled_date && !data.new_date) {
            const dt = new Date(data.scheduled_date);
            payload.new_date = dt.toISOString().split('T')[0];
            payload.new_time = dt.toTimeString().slice(0, 5);
        }
        if (data.reason) payload.reason = data.reason;
        const res = await fetch(`${getApiUrl()}/hearings/${id}/reschedule/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
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

// ======================================
// ROLE-SPECIFIC NAMESPACES & CASES
// ======================================

export async function fetchDefendantCases() {
    try {
        const res = await fetch(`${getApiUrl()}/defendant/cases/`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to fetch defendant cases");
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (e) { throw e; }
}

export async function fetchDefendantHearings() {
    try {
        const res = await fetch(`${getApiUrl()}/defendant/hearings/`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to fetch defendant hearings");
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (e) { throw e; }
}

export async function submitDefendantResponse(caseId, data) {
    try {
        const isFormData = data instanceof FormData;
        const headers = getAuthHeaders();
        if (isFormData) delete headers['Content-Type'];

        const res = await fetch(`${getApiUrl()}/defendant/cases/${caseId}/submit-response/`, { 
            method: "POST", 
            headers, 
            body: isFormData ? data : JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to submit response");
        }
        return await res.json();
    } catch (e) { throw e; }
}

export async function acknowledgeDefendantDecision(caseId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/defendant/cases/${caseId}/acknowledge-decision/`, { 
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to acknowledge decision");
        return await res.json();
    } catch (e) { throw e; }
}

export async function acknowledgeDefendantService(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/defendant/cases/${caseId}/acknowledge-service/`, { 
            method: "POST", headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to acknowledge service");
        return await res.json();
    } catch (e) { throw e; }
}

export async function confirmHearingAttendance(hearingId, role = "Defendant") {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/confirm-attendance/`, { 
            method: "POST", 
            headers: getAuthHeaders(),
            body: JSON.stringify({ participant_role: role })
        });
        if (!res.ok) throw new Error("Failed to confirm attendance");
        return await res.json();
    } catch (e) { throw e; }
}

export async function declineHearingAttendance(hearingId, reason, role = "Defendant") {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/decline-attendance/`, { 
            method: "POST", 
            headers: getAuthHeaders(),
            body: JSON.stringify({ participant_role: role, reason })
        });
        if (!res.ok) throw new Error("Failed to decline attendance");
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchDefendantDocuments(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/defendant/cases/${caseId}/documents/`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to fetch documents");
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchDefendantCaseById(id) {
    try {
        const res = await fetch(`${getApiUrl()}/defendant/cases/${id}/`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to fetch case details");
        return await res.json();
    } catch (e) {
        console.error("fetchDefendantCaseById error:", e);
        return null;
    }
}

export async function assignJudge(caseId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/${caseId}/assign-judge/`, { 
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to assign judge");
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchRegistrarStatistics() {
    try {
        const res = await fetch(`${getApiUrl()}/registrar/cases/statistics/`, { headers: getAuthHeaders() });
        if (!res.ok) return {};
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchJudgeCaseDocuments(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/judge/cases/${caseId}/documents/`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to fetch judge documents");
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchJudgeDocumentAudit(docId) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/judge/documents/audit/${docId}/`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { throw e; }
}

// ======================================
// ADVANCED HEARING MANAGEMENT
// ======================================

export async function recordHearingAttendance(hearingId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/record-attendance/`, { 
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to record attendance");
        return await res.json();
    } catch (e) { throw e; }
}

export async function bulkScheduleHearings(data) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/bulk/schedule/`, { 
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to bulk schedule");
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchJudgeCalendar(judgeId) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/calendar/judge/${judgeId}/`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchCourtroomAvailability(courtroom) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/calendar/courtroom/${encodeURIComponent(courtroom)}/`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchUpcomingHearingsReport() {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/reports/upcoming/`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchJudgeHearingWorkload() {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/reports/judge-workload/`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { throw e; }
}

// ======================================
// GENERAL CASE MGMT & BULK ACTIONS
// ======================================

export async function fetchCaseTimeline(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/${caseId}/timeline/`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchCaseNotes(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/${caseId}/notes/`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { throw e; }
}

export async function createCaseNote(caseId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/${caseId}/notes/`, { 
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to create note");
        return await res.json();
    } catch (e) { throw e; }
}

export async function bulkAssignJudges(data) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/bulk/assign/`, { 
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to bulk assign");
        return await res.json();
    } catch (e) { throw e; }
}

export async function bulkStatusUpdate(data) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/bulk/status-update/`, { 
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to bulk update status");
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchJudgeWorkloadStats() {
    try {
        const res = await fetch(`${getApiUrl()}/cases/statistics/judge-workload/`, { headers: getAuthHeaders() });
        if (!res.ok) return {};
        return await res.json();
    } catch (e) { throw e; }
}

export async function exportCasesCSV() {
    try {
        const res = await fetch(`${getApiUrl()}/cases/export/csv/`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to export cases CSV");
        return await res.text();
    } catch (e) { throw e; }
}

export async function exportCasesPDF() {
    try {
        const res = await fetch(`${getApiUrl()}/cases/export/pdf/`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to export cases PDF");
        return await res.blob();
    } catch (e) { throw e; }
}

// ======================================
// EXTENDED PAYMENTS
// ======================================

export async function confirmManualPayment(data) {
    try {
        const res = await fetch(`${getApiUrl()}/payments/manual-confirm/`, { 
            method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to manual confirm payment");
        return await res.json();
    } catch (e) { throw e; }
}

export async function retryPayment(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/payments/retry/${caseId}/`, { 
            method: "POST", headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to retry payment");
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchPaymentByCase(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/payments/case/${caseId}/`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to fetch payment by case");
        return await res.json();
    } catch (e) { throw e; }
}

// ======================================
// JUDGE-SPECIFIC API FUNCTIONS
// ======================================

export async function fetchJudgeDashboard() {
    try {
        const res = await fetch(`${getApiUrl()}/judge/dashboard`, { headers: getAuthHeaders() });
        if (!res.ok) return { assigned_cases: 0, pending_cases: 0, closed_cases: 0, upcoming_hearings: 0 };
        return await res.json();
    } catch (e) {
        console.error("fetchJudgeDashboard error:", e);
        return { assigned_cases: 0, pending_cases: 0, closed_cases: 0, upcoming_hearings: 0 };
    }
}

export async function fetchJudgeCases(statusFilter) {
    try {
        const params = statusFilter ? `?status=${statusFilter}` : '';
        const res = await fetch(`${getApiUrl()}/judge/cases${params}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to fetch judge cases");
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (e) {
        console.error("fetchJudgeCases error:", e);
        return [];
    }
}

export async function fetchJudgeCaseDetail(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/judge/cases/${caseId}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to fetch judge case detail");
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchJudgeCaseHearings(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/judge/cases/${caseId}/hearings`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (e) {
        console.error("fetchJudgeCaseHearings error:", e);
        return [];
    }
}

export async function updateCaseStatus(caseId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/cases/${caseId}/`, {
            method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to update case status");
        }
        return await res.json();
    } catch (e) { throw e; }
}

export async function cancelHearing(hearingId, reason) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/cancel/`, {
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ reason })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to cancel hearing");
        }
        return await res.json();
    } catch (e) { throw e; }
}

export async function completeHearing(hearingId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/complete/`, {
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to complete hearing");
        }
        return await res.json();
    } catch (e) { throw e; }
}

// ======================================
// DECISIONS API (Judge)
// ======================================

export async function createDecision(data) {
    try {
        const res = await fetch(`${getApiUrl()}/decisions/`, {
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to create decision");
        }
        return await res.json();
    } catch (e) { throw e; }
}

export async function updateDecision(decisionId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/`, {
            method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to update decision");
        }
        return await res.json();
    } catch (e) { throw e; }
}

export async function finalizeDecision(decisionId) {
    try {
        const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/finalize/`, {
            method: "POST", headers: getAuthHeaders()
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to finalize decision");
        }
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchDecisionsByCase(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/decisions/by-case/${caseId}/`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (e) {
        console.error("fetchDecisionsByCase error:", e);
        return [];
    }
}

export async function fetchPendingDecisions() {
    try {
        const res = await fetch(`${getApiUrl()}/decisions/pending/`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (e) {
        console.error("fetchPendingDecisions error:", e);
        return [];
    }
}

export async function createImmediateDecision(caseId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/decisions/by-case/${caseId}/immediate/`, {
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to create immediate decision");
        }
        return await res.json();
    } catch (e) { throw e; }
}

// ======================================
// JUDGE DOCUMENT & DECISION EXTENDED APIs
// ======================================

export async function downloadJudgeDocument(documentId) {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(`${getApiUrl()}/judge/documents/${documentId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error("Failed to download document");
    const blob = await res.blob();
    const contentDisp = res.headers.get("content-disposition");
    const match = contentDisp && contentDisp.match(/filename="?(.+?)"?$/);
    const filename = match ? match[1] : `document_${documentId}`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
}

export async function downloadDocument(fileUrl, filename = "document") {
    try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        const res = await fetch(fileUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error("Failed to download file");
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("downloadDocument error:", error);
        // Fallback to window.open if fetch fails (e.g. CORS)
        window.open(fileUrl, '_blank');
    }
}

export async function downloadDecisionPdf(decisionId) {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/download-pdf/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "PDF not available");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Decision_${decisionId}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
}

export async function publishDecision(decisionId, data = {}) {
    const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/publish/`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to publish decision");
    }
    return await res.json();
}

export async function fetchDecisionVersions(decisionId) {
    const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/versions/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
}

export async function fetchDecisionComments(decisionId) {
    const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/comments/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
}

export async function addDecisionComment(decisionId, text) {
    const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/comments/`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ text })
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to add comment");
    }
    return await res.json();
}

export async function uploadDecisionDocument(decisionId, file) {
    const formData = new FormData();
    formData.append("file", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/upload-decision-document/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to upload decision document");
    }
    return await res.json();
}

// ======================================
// HEARING MANAGEMENT (Extended)
// ======================================

export async function updateHearing(hearingId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/`, {
            method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to update hearing");
        }
        return await res.json();
    } catch (e) { throw e; }
}

export async function scheduleNextHearing(hearingId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/next-hearing/`, {
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(formatError(errData) || "Failed to schedule next hearing");
        }
        return await res.json();
    } catch (e) { throw e; }
}

export async function fetchHearingAttendance(hearingId) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/attendance/`, { headers: getAuthHeaders() });
        if (!res.ok) return { participants: [] };
        return await res.json();
    } catch (e) {
        console.error("fetchHearingAttendance error:", e);
        return { participants: [] };
    }
}

// ==========================================
// User Profile & Settings APIs
// ==========================================

export async function changePassword(data) {
    const res = await fetch(`${getApiUrl()}/auth/change-password/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to change password");
    }
    return await res.json();
}

export async function updateUserProfile(data) {
    const res = await fetch(`${getApiUrl()}/profile/`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to update profile");
    }
    return await res.json();
}

export async function fetchUserProfile() {
    const res = await fetch(`${getApiUrl()}/profile/`, { headers: getAuthHeaders() });
    if (!res.ok) return null;
    return await res.json();
}


// ==========================================
// Citizen Document APIs
// ==========================================

export async function uploadCitizenDocument(caseId, data) {
    const formData = new FormData();
    formData.append('document_type', data.document_type || 'OTHER');
    formData.append('description', data.description || '');
    formData.append('file', data.file);
    
    // We don't use getAuthHeaders() here because we can't set Content-Type to application/json for FormData.
    // The browser automatically sets Content-Type to multipart/form-data with the correct boundary.
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    const res = await fetch(`${getApiUrl()}/cases/citizen/cases/${caseId}/documents/`, {
        method: "POST",
        headers: headers,
        body: formData,
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to upload document");
    }
    return await res.json();
}

export async function fetchCitizenCaseDocuments(caseId) {
    const res = await fetch(`${getApiUrl()}/cases/citizen/cases/${caseId}/documents/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
}

export async function downloadCitizenDocumentVersion(versionId) {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    const res = await fetch(`${getApiUrl()}/cases/citizen/documents/versions/${versionId}/download/`, { headers });
    if (!res.ok) {
        throw new Error("Failed to download document");
    }
    return res;
}

export async function deleteCitizenDocument(docId) {
    const res = await fetch(`${getApiUrl()}/cases/citizen/documents/${docId}/`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    if (!res.ok && res.status !== 204) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to delete document");
    }
    return true;
}

export async function uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append("profile_picture", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    const res = await fetch(`${getApiUrl()}/profile/upload-picture/`, {
        method: "POST",
        headers,
        body: formData,
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to upload profile picture");
    }
    return await res.json();
}

export async function initiatePayment(caseId) {
    const res = await fetch(`${getApiUrl()}/payments/initiate/${caseId}/`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to initiate payment");
    }
    return await res.json();
}


// ==========================================
// Notification APIs
// ==========================================

export async function markNotificationRead(notificationIds, markAll = false) {
    const payload = {};
    if (markAll) {
        payload.mark_all = true;
    } else if (notificationIds && notificationIds.length > 0) {
        payload.notification_ids = notificationIds;
    }
    
    const res = await fetch(`${getApiUrl()}/notifications/mark_read/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to mark notifications read");
    }
    return await res.json();
}

export async function archiveNotification(notificationId) {
    const res = await fetch(`${getApiUrl()}/notifications/${notificationId}/archive/`, {
        method: "POST", headers: getAuthHeaders()
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to archive notification");
    }
    return await res.json();
}

export async function updateNotificationPreferences(data) {
    const res = await fetch(`${getApiUrl()}/notifications/preferences/`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to update notification preferences");
    }
    return await res.json();
}


// ==========================================
// Citizen Hearing APIs
// ==========================================

export async function fetchCitizenHearings() {
    const res = await fetch(`${getApiUrl()}/citizen/hearings/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
}

export async function confirmCitizenAttendance(hearingId) {
    const res = await fetch(`${getApiUrl()}/citizen/hearings/${hearingId}/confirm-attendance/`, {
        method: "POST", headers: getAuthHeaders()
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to confirm attendance");
    }
    return await res.json();
}

export async function declineCitizenAttendance(hearingId, reason) {
    const res = await fetch(`${getApiUrl()}/citizen/hearings/${hearingId}/decline-attendance/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason })
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to decline attendance");
    }
    return await res.json();
}

// ==========================================
// DEFENDANT EXTENDED APIs
// ==========================================


export async function submitDefendantEvidence(caseId, formData) {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(`${getApiUrl()}/defendant/cases/${caseId}/evidence/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to submit evidence");
    }
    return await res.json();
}

export async function fetchDefendantDecision(caseId) {
    const res = await fetch(`${getApiUrl()}/defendant/cases/${caseId}/decision/`, { headers: getAuthHeaders() });
    if (!res.ok) return null;
    return await res.json();
}

export async function fetchDefendantActions(caseId) {
    const res = await fetch(`${getApiUrl()}/defendant/cases/${caseId}/actions/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
}

export async function respondToDefendantAction(caseId, actionId, data) {
    const res = await fetch(`${getApiUrl()}/defendant/cases/${caseId}/respond-to-action/${actionId}/`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to respond to action");
    }
    return await res.json();
}

// ==========================================
// NOTIFICATION EXTENDED APIs
// ==========================================

export async function markAllNotificationsRead() {
    const res = await fetch(`${getApiUrl()}/notifications/mark-all-read/`, {
        method: "POST", headers: getAuthHeaders()
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to mark all read");
    }
    return await res.json();
}

export async function archiveAllNotifications() {
    const res = await fetch(`${getApiUrl()}/notifications/archive-all/`, {
        method: "POST", headers: getAuthHeaders()
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to archive all");
    }
    return await res.json();
}

export async function deleteReadNotifications() {
    const res = await fetch(`${getApiUrl()}/notifications/delete-read/`, {
        method: "DELETE", headers: getAuthHeaders()
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to delete read notifications");
    }
    return true;
}

export async function fetchNotificationStats() {
    const res = await fetch(`${getApiUrl()}/notifications/statistics/`, { headers: getAuthHeaders() });
    if (!res.ok) return { total: 0, unread: 0, read_percentage: 0, by_type: [], by_priority: [] };
    return await res.json();
}

export async function fetchUnreadNotificationCount() {
    const res = await fetch(`${getApiUrl()}/notifications/unread_count/`, { headers: getAuthHeaders() });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? data.unread_count ?? 0;
}

// ==========================================
// AUDIT LOG EXTENDED APIs
// ==========================================

export async function fetchUserAuditTrail(days) {
    const params = days ? `?days=${days}` : '';
    const res = await fetch(`${getApiUrl()}/audit/logs/user_trail/${params}`, { headers: getAuthHeaders() });
    if (!res.ok) return { results: [], count: 0 };
    return await res.json();
}

export async function fetchRecentAuditLogs(limit = 10, actionTypes = []) {
    const params = new URLSearchParams({ limit });
    actionTypes.forEach(t => params.append('action_types', t));
    const res = await fetch(`${getApiUrl()}/audit/logs/recent/?${params}`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
}

export async function fetchAuditStatistics(days = 7) {
    const res = await fetch(`${getApiUrl()}/audit/logs/statistics/?days=${days}`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}

export async function exportAuditLogsCSV() {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(`${getApiUrl()}/audit/logs/export_csv/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error("Failed to export audit logs");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit_logs.csv";
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
}

// ==========================================
// ADMIN / CORE SYSTEM APIs
// ==========================================

export async function fetchAdminUsersDashboard() {
    const res = await fetch(`${getApiUrl()}/admin/users/dashboard/`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}

export async function fetchSystemMetrics() {
    const res = await fetch(`${getApiUrl()}/admin/system/metrics/`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}

export async function fetchSystemErrors() {
    const res = await fetch(`${getApiUrl()}/admin/system/errors/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
}

export async function fetchAuditDashboard() {
    const res = await fetch(`${getApiUrl()}/admin/audit/dashboard/`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}

export async function adminBulkCreateUsers(file) {
    const formData = new FormData();
    formData.append("file", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(`${getApiUrl()}/admin/users/bulk/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to bulk create users");
    }
    return await res.json();
}

export async function adminBulkAction(userIds, action) {
    const res = await fetch(`${getApiUrl()}/admin/users/bulk-action/`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ user_ids: userIds, action })
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to perform bulk action");
    }
    return await res.json();
}

export async function fetchAdminRoles() {
    const res = await fetch(`${getApiUrl()}/admin/roles/`, { headers: getAuthHeaders() });
    if (!res.ok) return { roles: [] };
    return await res.json();
}

// ==========================================
// CASES EXTENDED APIs
// ==========================================

export async function fetchCaseHearingTimeline(caseId) {
    const res = await fetch(`${getApiUrl()}/cases/${caseId}/hearing-timeline/`, { headers: getAuthHeaders() });
    if (!res.ok) return { timeline: [] };
    return await res.json();
}

export async function createDefendantAccount(caseId, data) {
    const res = await fetch(`${getApiUrl()}/cases/${caseId}/create-defendant-account/`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to create defendant account");
    }
    return await res.json();
}

export async function requestDefendantAction(caseId, actionDescription) {
    const res = await fetch(`${getApiUrl()}/cases/${caseId}/request_defendant_action/`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ action_description: actionDescription })
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to request defendant action");
    }
    return await res.json();
}

// ==========================================
// DECISIONS EXTENDED APIs
// ==========================================

export async function fetchPublishedDecisions() {
    const res = await fetch(`${getApiUrl()}/decisions/published/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
}

export async function fetchRecentDecisions() {
    const res = await fetch(`${getApiUrl()}/decisions/recent/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
}

export async function signDecision(decisionId, data = {}) {
    const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/signature/`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to sign decision");
    }
    return await res.json();
}

export async function verifyDecisionSignature(decisionId) {
    const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/verify-signature/`, { headers: getAuthHeaders() });
    if (!res.ok) return { valid: false };
    return await res.json();
}

export async function fetchDecisionDeliveries(decisionId) {
    const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/deliveries/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
}

export async function acknowledgeDecision(decisionId, data = {}) {
    const res = await fetch(`${getApiUrl()}/decisions/${decisionId}/acknowledge/`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to acknowledge decision");
    }
    return await res.json();
}

export async function bulkPublishDecisions(decisionIds) {
    const res = await fetch(`${getApiUrl()}/decisions/bulk/publish/`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ decision_ids: decisionIds })
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to bulk publish");
    }
    return await res.json();
}

export async function fetchMonthlyDecisionsReport() {
    const res = await fetch(`${getApiUrl()}/decisions/reports/monthly/`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}

export async function fetchJudgeDecisionPerformance() {
    const res = await fetch(`${getApiUrl()}/decisions/reports/judge-performance/`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}

// ==========================================
// HEARINGS EXTENDED APIs
// ==========================================

export async function fetchHearingParticipants(hearingId) {
    const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/participants/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
}

export async function updateSingleAttendance(hearingId, userId, data) {
    const res = await fetch(`${getApiUrl()}/judge/hearings/${hearingId}/attendance/${userId}/`, {
        method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(formatError(errData) || "Failed to update attendance");
    }
    return await res.json();
}

export async function fetchHearingStatus(hearingId) {
    const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/status/`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}

export async function fetchUpcomingHearings() {
    const res = await fetch(`${getApiUrl()}/hearings/upcoming/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
}

export async function fetchHearingsCalendar() {
    const res = await fetch(`${getApiUrl()}/hearings/calendar/`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
}

// ==========================================
// REPORTS EXTENDED APIs
// ==========================================

export async function fetchJudgeReport() {
    const res = await fetch(`${getApiUrl()}/reports/judge/`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}

export async function fetchAdminJudgeReport(judgeId) {
    const res = await fetch(`${getApiUrl()}/reports/admin/judge/${judgeId}/`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}

export async function fetchAdminReportsStatistics() {
    const res = await fetch(`${getApiUrl()}/admin/reports/statistics/`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}

export async function fetchAdminReportsPerformance() {
    const res = await fetch(`${getApiUrl()}/admin/reports/performance/`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
}
