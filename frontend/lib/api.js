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
        const res = await fetch(`${getApiUrl()}/hearings/${id}/reschedule/`, {
            method: "POST",
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
        const res = await fetch(`${getApiUrl()}/defendant/cases/${caseId}/submit-response/`, { 
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to submit response");
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

export async function fetchDefendantDocuments(caseId) {
    try {
        const res = await fetch(`${getApiUrl()}/defendant/cases/${caseId}/documents/`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to fetch documents");
        return await res.json();
    } catch (e) { throw e; }
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

export async function confirmHearingAttendance(hearingId, data) {
    try {
        const res = await fetch(`${getApiUrl()}/hearings/${hearingId}/confirm-attendance/`, { 
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to confirm attendance");
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

