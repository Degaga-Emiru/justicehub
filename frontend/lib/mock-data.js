// Mock data for the Justice Hub Court Management System

export const users = [
    { id: "usr-001", name: "John Doe", email: "client@justicehub.com", role: "client", avatar: "JD", phone: "+1-555-0101", createdAt: "2025-01-15" },
    { id: "usr-002", name: "Hon. Sarah Mitchell", email: "judge@justicehub.com", role: "judge", avatar: "SM", phone: "+1-555-0102", court: "Federal District Court", createdAt: "2024-06-10" },
    { id: "usr-003", name: "Mark Williams", email: "registrar@justicehub.com", role: "registrar", avatar: "MW", phone: "+1-555-0103", createdAt: "2024-08-20" },
    { id: "usr-004", name: "Admin User", email: "admin@justicehub.com", role: "admin", avatar: "AU", phone: "+1-555-0104", createdAt: "2024-01-01" },
    { id: "usr-005", name: "Jane Smith", email: "jane@example.com", role: "client", avatar: "JS", phone: "+1-555-0105", createdAt: "2025-03-22" },
    { id: "usr-006", name: "Hon. Robert Chen", email: "rchen@court.gov", role: "judge", avatar: "RC", phone: "+1-555-0106", court: "Superior Court", createdAt: "2023-11-15" },
    { id: "usr-007", name: "Lisa Park", email: "lpark@court.gov", role: "registrar", avatar: "LP", phone: "+1-555-0107", createdAt: "2025-01-05" },
    { id: "usr-008", name: "David Kofi", email: "dkofi@example.com", role: "client", avatar: "DK", phone: "+1-555-0108", createdAt: "2025-06-12" },
];

export const cases = [
    {
        id: "CSE-2025-001",
        title: "Doe v. Springfield Corp",
        type: "Civil",
        status: "In Review",
        priority: "High",
        plaintiff: "John Doe",
        plaintiffId: "usr-001",
        defendant: "Springfield Corp",
        judge: "Hon. Sarah Mitchell",
        judgeId: "usr-002",
        registrar: "Mark Williams",
        registrarId: "usr-003",
        filedDate: "2025-08-15",
        nextHearing: "2026-02-20",
        description: "Breach of contract dispute regarding services rendered. The plaintiff alleges that the defendant failed to deliver on contractual obligations worth $250,000.",
        documents: [
            { name: "Contract_Agreement.pdf", size: "2.4 MB", uploadedAt: "2025-08-15" },
            { name: "Evidence_Photos.zip", size: "15.1 MB", uploadedAt: "2025-08-20" },
        ],
    },
    {
        id: "CSE-2025-002",
        title: "State v. Marcus Reed",
        type: "Criminal",
        status: "Adjudicated",
        priority: "Critical",
        plaintiff: "State Prosecutor",
        plaintiffId: "usr-005",
        defendant: "John Doe",
        defendantId: "usr-001", // Linked to our main test user
        judge: "Hon. Robert Chen",
        judgeId: "usr-006",
        registrar: "Lisa Park",
        registrarId: "usr-007",
        filedDate: "2025-05-10",
        nextHearing: null,
        description: "Criminal case involving fraud charges. The defendant is accused of orchestrating a financial scheme resulting in damages exceeding $1.2 million.",
        documents: [
            { name: "Police_Report.pdf", size: "1.8 MB", uploadedAt: "2025-05-10" },
            { name: "Financial_Records.xlsx", size: "4.5 MB", uploadedAt: "2025-05-15" },
            { name: "Witness_Statements.pdf", size: "3.2 MB", uploadedAt: "2025-06-01" },
        ],
        verdict: "Guilty - 5 years probation with restitution of $1.2M",
    },
    {
        id: "CSE-2025-003",
        title: "Smith Family Trust Dispute",
        type: "Family",
        status: "Active",
        priority: "Medium",
        plaintiff: "Jane Smith",
        plaintiffId: "usr-005",
        defendant: "Robert Smith",
        judge: "Hon. Sarah Mitchell",
        judgeId: "usr-002",
        registrar: "Mark Williams",
        registrarId: "usr-003",
        filedDate: "2025-10-01",
        nextHearing: "2026-02-25",
        description: "Family trust dispute involving inheritance distribution among beneficiaries.",
        documents: [
            { name: "Trust_Document.pdf", size: "5.6 MB", uploadedAt: "2025-10-01" },
        ],
    },
    {
        id: "CSE-2025-004",
        title: "Kofi v. Metro Transit Authority",
        type: "Civil",
        status: "Pending",
        priority: "Low",
        plaintiff: "David Kofi",
        plaintiffId: "usr-008",
        defendant: "Metro Transit Authority",
        judge: null,
        judgeId: null,
        registrar: "Mark Williams",
        registrarId: "usr-003",
        filedDate: "2026-01-20",
        nextHearing: null,
        description: "Personal injury claim following a public transit accident. The plaintiff seeks damages for medical expenses and lost wages.",
        documents: [
            { name: "Medical_Report.pdf", size: "3.1 MB", uploadedAt: "2026-01-20" },
            { name: "Incident_Report.pdf", size: "1.2 MB", uploadedAt: "2026-01-22" },
        ],
    },
    {
        id: "CSE-2026-005",
        title: "TechStart Inc. Patent Infringement",
        type: "Commercial",
        status: "Pending",
        priority: "High",
        plaintiff: "TechStart Inc.",
        plaintiffId: "usr-001",
        defendant: "InnovateCo Ltd.",
        judge: null,
        judgeId: null,
        registrar: null,
        registrarId: null,
        filedDate: "2026-02-05",
        nextHearing: null,
        description: "Patent infringement case regarding proprietary AI algorithms. The plaintiff alleges unauthorized use of patented technology.",
        documents: [
            { name: "Patent_Filing.pdf", size: "8.4 MB", uploadedAt: "2026-02-05" },
        ],
    },
    {
        id: "CSE-2026-006",
        title: "Anderson v. City Planning Board",
        type: "Administrative",
        status: "In Review",
        priority: "Medium",
        plaintiff: "John Doe",
        plaintiffId: "usr-001",
        defendant: "City Planning Board",
        judge: "Hon. Robert Chen",
        judgeId: "usr-006",
        registrar: "Lisa Park",
        registrarId: "usr-007",
        filedDate: "2026-01-10",
        nextHearing: "2026-03-05",
        description: "Challenge to zoning decisions affecting residential property development.",
        documents: [
            { name: "Zoning_Application.pdf", size: "2.1 MB", uploadedAt: "2026-01-10" },
        ],
    },
];

export const hearings = [
    { id: "HRG-001", caseId: "CSE-2025-001", caseTitle: "Doe v. Springfield Corp", date: "2026-02-20", time: "09:00 AM", courtroom: "Room 301", type: "Pre-Trial Hearing", judge: "Hon. Sarah Mitchell", status: "Scheduled" },
    { id: "HRG-002", caseId: "CSE-2025-003", caseTitle: "Smith Family Trust Dispute", date: "2026-02-25", time: "11:00 AM", courtroom: "Room 204", type: "Mediation", judge: "Hon. Sarah Mitchell", status: "Scheduled" },
    { id: "HRG-003", caseId: "CSE-2026-006", caseTitle: "Anderson v. City Planning Board", date: "2026-03-05", time: "02:00 PM", courtroom: "Room 105", type: "Initial Hearing", judge: "Hon. Robert Chen", status: "Scheduled" },
    { id: "HRG-004", caseId: "CSE-2025-001", caseTitle: "Doe v. Springfield Corp", date: "2026-03-15", time: "10:00 AM", courtroom: "Room 301", type: "Trial - Day 1", judge: "Hon. Sarah Mitchell", status: "Scheduled" },
    { id: "HRG-005", caseId: "CSE-2025-002", caseTitle: "State v. Marcus Reed", date: "2025-12-10", time: "09:30 AM", courtroom: "Room 401", type: "Sentencing", judge: "Hon. Robert Chen", status: "Completed" },
    { id: "HRG-006", caseId: "CSE-2025-003", caseTitle: "Smith Family Trust Dispute", date: "2026-03-20", time: "01:00 PM", courtroom: "Room 204", type: "Evidence Hearing", judge: "Hon. Sarah Mitchell", status: "Scheduled" },
    { id: "HRG-007", caseId: "CSE-2025-001", caseTitle: "Doe v. Springfield Corp", date: "2026-03-25", time: "10:00 AM", courtroom: "Room 301", type: "Trial - Day 2", judge: "Hon. Sarah Mitchell", status: "Scheduled" },
];

export const transactions = [
    { id: "TXN-001", caseId: "CSE-2025-001", description: "Filing Fee", amount: 350.00, status: "Completed", date: "2025-08-15", method: "Credit Card", paidBy: "John Doe" },
    { id: "TXN-002", caseId: "CSE-2025-002", description: "Court Processing Fee", amount: 500.00, status: "Completed", date: "2025-05-10", method: "Bank Transfer", paidBy: "State Prosecutor" },
    { id: "TXN-003", caseId: "CSE-2025-003", description: "Filing Fee", amount: 275.00, status: "Completed", date: "2025-10-01", method: "Credit Card", paidBy: "Jane Smith" },
    { id: "TXN-004", caseId: "CSE-2025-004", description: "Filing Fee", amount: 350.00, status: "Pending", date: "2026-01-20", method: "Pending", paidBy: "David Kofi" },
    { id: "TXN-005", caseId: "CSE-2026-005", description: "Filing Fee", amount: 450.00, status: "Pending", date: "2026-02-05", method: "Pending", paidBy: "TechStart Inc." },
    { id: "TXN-006", caseId: "CSE-2025-001", description: "Motion Filing Fee", amount: 150.00, status: "Completed", date: "2025-11-20", method: "Credit Card", paidBy: "John Doe" },
];

export const chatMessages = [
    { id: 1, sender: "bot", text: "Hello! I'm JusticeBot, your AI legal assistant. How can I help you today?", time: "Just now" },
    { id: 2, sender: "user", text: "What's the status of my case CSE-2025-001?", time: "1 min ago" },
    { id: 3, sender: "bot", text: "Case CSE-2025-001 (Doe v. Springfield Corp) is currently **In Review**. Your next hearing is scheduled for February 20, 2026 at 9:00 AM in Room 301. Would you like more details?", time: "1 min ago" },
];

export const caseTypes = [
    "Civil", "Criminal", "Family", "Commercial", "Administrative", "Labor", "Tax", "Constitutional"
];

export const courtrooms = [
    "Room 101", "Room 105", "Room 204", "Room 301", "Room 401", "Room 502"
];

export const statusColors = {
    "PENDING_REVIEW": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "APPROVED": "bg-blue-100 text-blue-800 border-blue-200",
    "REJECTED": "bg-red-100 text-red-800 border-red-200",
    "PAID": "bg-teal-100 text-teal-800 border-teal-200",
    "ASSIGNED": "bg-purple-100 text-purple-800 border-purple-200",
    "IN_PROGRESS": "bg-green-100 text-green-800 border-green-200",
    "CLOSED": "bg-gray-100 text-gray-800 border-gray-200",
    // Legacy fallbacks
    "Pending": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Active": "bg-green-100 text-green-800 border-green-200",
    "Scheduled": "bg-cyan-100 text-cyan-800 border-cyan-200",
    "Completed": "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export const priorityColors = {
    "Low": "bg-slate-100 text-slate-700",
    "Medium": "bg-amber-100 text-amber-700",
    "High": "bg-orange-100 text-orange-700",
    "Critical": "bg-red-100 text-red-700",
};

export const reportsData = {
    casesByMonth: [
        { month: "Sep", filed: 12, resolved: 8 },
        { month: "Oct", filed: 18, resolved: 14 },
        { month: "Nov", filed: 15, resolved: 11 },
        { month: "Dec", filed: 22, resolved: 16 },
        { month: "Jan", filed: 20, resolved: 18 },
        { month: "Feb", filed: 10, resolved: 5 },
    ],
    casesByType: [
        { name: "Civil", value: 35, fill: "hsl(215, 50%, 15%)" },
        { name: "Criminal", value: 22, fill: "hsl(210, 30%, 40%)" },
        { name: "Family", value: 18, fill: "hsl(199, 89%, 48%)" },
        { name: "Commercial", value: 15, fill: "hsl(142, 76%, 36%)" },
        { name: "Administrative", value: 10, fill: "hsl(38, 92%, 50%)" },
    ],
    casesByStatus: [
        { name: "Pending", count: 12 },
        { name: "In Review", count: 8 },
        { name: "Active", count: 25 },
        { name: "Adjudicated", count: 40 },
        { name: "Dismissed", count: 5 },
    ],
};
