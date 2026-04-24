"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { 
 fetchCases, fetchUsers, assignJudge, fetchRegistrarStatistics, 
 fetchPendingCases, reviewCase, fetchCaseById, createDefendantAccount,
 fetchTransactions
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
 MoreHorizontal, ShieldCheck, Search, UserCheck, FileCheck, XCircle, 
 FileText, Download, Scale, ClipboardList, AlertCircle, Loader2, 
 UserPlus, Mail, Phone, Eye, CreditCard, FileSearch
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
 PENDING_REVIEW: "bg-amber-500/10 text-amber-600",
 APPROVED: "bg-emerald-500/10 text-emerald-600",
 PAID: "bg-teal-500/10 text-teal-600",
 ASSIGNED: "bg-blue-500/10 text-blue-600",
 IN_PROGRESS: "bg-purple-500/10 text-purple-600",
 CLOSED: "bg-slate-500/10 text-muted-foreground",
 REJECTED: "bg-rose-500/10 text-rose-600",
};

const STATUS_LABELS = {
 PENDING_REVIEW: "Pending Review",
 APPROVED: "Approved",
 PAID: "Paid — Ready",
 ASSIGNED: "Assigned",
 IN_PROGRESS: "In Progress",
 CLOSED: "Closed",
 REJECTED: "Rejected",
};

export default function ClerkDashboardPage() {
 const queryClient = useQueryClient();
 const router = useRouter();
 const [searchTerm, setSearchTerm] = useState("");

 // Assign Judge Modal State
 const [isAssignOpen, setIsAssignOpen] = useState(false);
 const [targetCase, setTargetCase] = useState(null);
 const [selectedJudgeId, setSelectedJudgeId] = useState("");

 // Review Modal State
 const [isReviewOpen, setIsReviewOpen] = useState(false);
 const [reviewTarget, setReviewTarget] = useState(null);
 const [rejectionReason, setRejectionReason] = useState("");
 const [reviewAction, setReviewAction] = useState(""); // "accept" or "reject"
 const [courtName, setCourtName] = useState("");
 const [courtRoom, setCourtRoom] = useState("");

 // Create Defendant Account Modal State
 const [isDefendantOpen, setIsDefendantOpen] = useState(false);
 const [defendantTarget, setDefendantTarget] = useState(null);
 const [defendantForm, setDefendantForm] = useState({
 email: "",
 phone_number: "",
 first_name: "",
 last_name: "",
 });

 // Queries
 const { data: cases = [], isLoading: casesLoading } = useQuery({
 queryKey: ["clerk-cases"],
 queryFn: () => fetchCases()
 });

 const { data: pendingIntake = [], isLoading: intakeLoading } = useQuery({
 queryKey: ["clerk-pendingIntake"],
 queryFn: () => fetchPendingCases()
 });

 const { data: payments = [], isLoading: loadingPayments } = useQuery({
 queryKey: ["clerk-payments"],
 queryFn: () => fetchTransactions(),
 });

 // Fetch details for deeply nested documents when a case is picked for review
 const { data: activeReviewCase, isLoading: reviewLoading } = useQuery({
 queryKey: ["clerk-caseDetails", reviewTarget?.id],
 queryFn: () => fetchCaseById(reviewTarget?.id),
 enabled: !!reviewTarget?.id && isReviewOpen
 });

 const { data: users = [] } = useQuery({
 queryKey: ["users"],
 queryFn: () => fetchUsers()
 });

 const { data: stats = {} } = useQuery({
 queryKey: ["clerk-stats"],
 queryFn: () => fetchRegistrarStatistics()
 });

 // Mutations
 const assignMutation = useMutation({
 mutationFn: ({ caseId, judgeId }) => assignJudge(caseId, { judge_id: judgeId }),
 onSuccess: () => {
 queryClient.invalidateQueries(["clerk-cases"]);
 queryClient.invalidateQueries(["clerk-stats"]);
 setIsAssignOpen(false);
 setTargetCase(null);
 setSelectedJudgeId("");
 }
 });

 const reviewMutation = useMutation({
 mutationFn: ({ caseId, action, rejection_reason, court_name, court_room }) => 
 reviewCase(caseId, { action, rejection_reason, court_name, court_room }),
 onSuccess: () => {
 queryClient.invalidateQueries(["clerk-pendingIntake"]);
 queryClient.invalidateQueries(["clerk-cases"]);
 queryClient.invalidateQueries(["clerk-stats"]);
 setIsReviewOpen(false);
 setReviewTarget(null);
 setRejectionReason("");
 setCourtName("");
 setCourtRoom("");
 setReviewAction("");
 }
 });

 const defendantMutation = useMutation({
 mutationFn: ({ caseId, data }) => createDefendantAccount(caseId, data),
 onSuccess: () => {
 queryClient.invalidateQueries(["clerk-cases"]);
 queryClient.invalidateQueries(["clerk-pendingIntake"]);
 queryClient.invalidateQueries(["clerk-caseDetails"]);
 setIsDefendantOpen(false);
 setDefendantTarget(null);
 setDefendantForm({ email: "", phone_number: "", first_name: "", last_name: "" });
 }
 });

 // Filters
 const judges = users.filter(user => user.role === "JUDGE" && user.is_active !== false);

 const filteredCases = cases.filter(c =>
 String(c.file_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
 String(c.title || "").toLowerCase().includes(searchTerm.toLowerCase())
 );

 const pendingAssignment = filteredCases.filter(c => c.status === "PAID" || c.status === "APPROVED");

 const filteredIntake = pendingIntake.filter(c =>
 String(c.file_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
 String(c.title || "").toLowerCase().includes(searchTerm.toLowerCase())
 );

 const handleAssignClick = (caseItem) => {
 setTargetCase(caseItem);
 setSelectedJudgeId("");
 setIsAssignOpen(true);
 };

 const handleReviewClick = (caseItem) => {
 setReviewTarget(caseItem);
 setRejectionReason("");
 setReviewAction("");
 setIsReviewOpen(true);
 };

 const handleDefendantClick = (caseItem) => {
 setDefendantTarget(caseItem);
 setDefendantForm({
 email: "",
 phone_number: "",
 first_name: caseItem.defendant_name?.split(' ')[0] || "",
 last_name: caseItem.defendant_name?.split(' ').slice(1).join(' ') || "",
 });
 setIsDefendantOpen(true);
 };

 return (
 <div className="space-y-10 animate-fade-up">
 {/* Header */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Registry Command</h1>
 <p className="text-muted-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
 <ClipboardList className="h-5 w-5 text-primary" />
 Case intake review, judge assignment, and financial oversight.
 </p>
 </div>
 <div className="relative max-w-sm w-full group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
 <Input
 placeholder="Search by docket number or title..."
 className="h-11 pl-11 bg-muted/30 border-border rounded-2xl focus-visible:ring-primary/20 focus-visible:bg-muted/50 transition-all font-medium text-sm"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 </div>

 {/* Statistics Cards */}
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
 <Card className="bg-card shadow-sm border-border hover:border-amber-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-amber-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Pending Intake</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
 <FileText className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{filteredIntake.length}</div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mt-1">Awaiting review</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-blue-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Pending Assignment</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
 <UserCheck className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">
 {stats.pending_assignment !== undefined ? stats.pending_assignment : pendingAssignment.length}
 </div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mt-1">Need judge assigned</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-emerald-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Payments</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
 <CreditCard className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{payments.filter(p => p.status === 'PENDING').length}</div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mt-1">Pending verification</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-purple-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Total Registry</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
 <Scale className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{cases.length}</div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mt-1">Cases in system</p>
 </CardContent>
 </Card>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="intake" className="w-full space-y-8">
 <TabsList className="h-14 p-1.5 bg-muted/30 border border-border rounded-2xl bg-background shadow-sm border-border backdrop-blur-xl w-full lg:max-w-3xl mx-auto flex">
 <TabsTrigger value="intake" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
 Intake Review
 <Badge className="bg-amber-500/20 text-amber-600 border-none text-[10px] font-black h-5 px-1.5">{filteredIntake.length}</Badge>
 </TabsTrigger>
 <TabsTrigger value="assignment" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
 Assignment
 <Badge className="bg-blue-500/20 text-blue-600 border-none text-[10px] font-black h-5 px-1.5">{pendingAssignment.length}</Badge>
 </TabsTrigger>
 <TabsTrigger value="payments" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
 Payments
 </TabsTrigger>
 <TabsTrigger value="all" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
 Master Registry
 </TabsTrigger>
 </TabsList>

 {/* INTAKE TAB */}
 <TabsContent value="intake" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-2xl font-black font-display tracking-tight">Case Filing Queue</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Verify incoming filings and proceed with administrative intake.</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {intakeLoading ? (
 <div className="p-8 space-y-4">
 {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <Table>
 <TableHeader className="bg-muted/30">
 <TableRow className="border-border hover:bg-transparent">
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">Ref #</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Case Profile</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Jurisdiction</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Priority</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredIntake.length > 0 ? (
 filteredIntake.map((c) => (
 <TableRow 
 key={c.id} 
 className="border-border hover:bg-muted/30 transition-colors group cursor-pointer" 
 onClick={() => router.push(`/dashboard/clerk/cases/${c.id}`)}
 >
 <TableCell className="font-mono text-xs font-bold text-muted-foreground pl-8">PENDING</TableCell>
 <TableCell className="py-6">
 <div className="flex flex-col gap-1">
 <span className="font-black font-display text-base tracking-tight group-hover:text-primary transition-colors">{c.title}</span>
 <span className="text-xs font-medium text-muted-foreground truncate max-w-[240px]">{c.description}</span>
 </div>
 </TableCell>
 <TableCell>
 <span className="text-xs font-black uppercase tracking-widest">{c.category?.name || "General"}</span>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border-none bg-muted/50">
 {c.priority}
 </Badge>
 </TableCell>
 <TableCell className="text-right pr-8">
 <Button 
 size="sm" 
 className="rounded-xl font-bold text-xs uppercase tracking-widest" 
 onClick={(e) => { e.stopPropagation(); handleReviewClick(c); }}
 >
 Review Filing
 </Button>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={5} className="py-32 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
 No incoming filings at this time.
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* ASSIGNMENT TAB */}
 <TabsContent value="assignment" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-2xl font-black font-display tracking-tight">Judge Assignment</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Allocate validated cases to the appropriate judicial department.</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {casesLoading ? (
 <div className="p-8 space-y-4">
 {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <Table>
 <TableHeader className="bg-muted/30">
 <TableRow className="border-border hover:bg-transparent">
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">Docket #</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Title</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {pendingAssignment.length > 0 ? (
 pendingAssignment.map((c) => (
 <TableRow 
 key={c.id} 
 className="border-border hover:bg-muted/30 transition-colors group cursor-pointer" 
 onClick={() => router.push(`/dashboard/clerk/cases/${c.id}`)}
 >
 <TableCell className="font-mono text-xs font-bold text-muted-foreground pl-8">{c.file_number}</TableCell>
 <TableCell className="py-6">
 <span className="font-black font-display text-base tracking-tight group-hover:text-primary transition-colors">{c.title}</span>
 </TableCell>
 <TableCell>
 <Badge className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none", STATUS_COLORS[c.status])}>
 {STATUS_LABELS[c.status] || c.status}
 </Badge>
 </TableCell>
 <TableCell className="text-right pr-8">
 <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
 {(!c.defendant || c.defendant === "PENDING_DEFENDANT") && (
 <Button size="sm" variant="outline" className="rounded-xl font-bold text-xs" onClick={(e) => { e.stopPropagation(); handleDefendantClick(c); }}>
 + Defendant
 </Button>
 )}
 <Button size="sm" className="rounded-xl font-bold text-xs" onClick={(e) => { e.stopPropagation(); handleAssignClick(c); }}>
 Assign Judge
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={4} className="py-32 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
 No cases awaiting assignment.
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* PAYMENTS TAB */}
 <TabsContent value="payments" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-2xl font-black font-display tracking-tight">Audit Transactions</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Verify filing fee receipts against electronic records.</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {loadingPayments ? (
 <div className="p-8 space-y-4">
 {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <Table>
 <TableHeader className="bg-muted/30">
 <TableRow className="border-border hover:bg-transparent">
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">Date</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Audit ID</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Payer Info</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Amount</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">Status</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {payments.length > 0 ? (
 payments.map((p) => (
 <TableRow key={p.id} className="border-border hover:bg-muted/30 transition-colors group">
 <TableCell className="text-xs font-bold pl-8">{new Date(p.created_at).toLocaleDateString()}</TableCell>
 <TableCell className="font-mono text-[10px] font-bold text-muted-foreground">{p.transaction_reference}</TableCell>
 <TableCell className="py-6">
 <div className="flex flex-col">
 <span className="font-black font-display text-sm truncate max-w-[200px]">{p.sender_name || p.user_name || "Unknown"}</span>
 <span className="text-[10px] font-bold text-muted-foreground uppercase">{p.case_title || "Filing Fee"}</span>
 </div>
 </TableCell>
 <TableCell className="font-display font-black text-foreground">{p.amount} ETB</TableCell>
 <TableCell className="text-right pr-8">
 <Badge className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none", 
 p.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted/50 text-muted-foreground')}>
 {p.status}
 </Badge>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={5} className="py-32 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
 No transaction records found.
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* MASTER REGISTRY TAB */}
 <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-2xl font-black font-display tracking-tight">Master Registry</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Unified index of all electronic archives and live proceedings.</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {casesLoading ? (
 <div className="p-8 space-y-4">
 {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <Table>
 <TableHeader className="bg-muted/30">
 <TableRow className="border-border hover:bg-transparent">
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">Docket #</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Title</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Jurisdiction</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Security State</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">Audit</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredCases.map((c) => (
 <TableRow 
 key={c.id} 
 className="border-border hover:bg-muted/30 transition-colors group cursor-pointer" 
 onClick={() => router.push(`/dashboard/clerk/cases/${c.id}`)}
 >
 <TableCell className="font-mono text-xs font-bold text-muted-foreground pl-8">{c.file_number || "—"}</TableCell>
 <TableCell className="py-6 font-black font-display text-sm tracking-tight group-hover:text-primary transition-colors">{c.title}</TableCell>
 <TableCell className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c.category?.name || "GENERAL"}</TableCell>
 <TableCell>
 <Badge className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none", STATUS_COLORS[c.status])}>
 {STATUS_LABELS[c.status] || c.status}
 </Badge>
 </TableCell>
 <TableCell className="text-right pr-8">
 <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
 <Eye className="h-4 w-4" />
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>

 {/* Modals from Registrar Logic (Merged) */}
 <Dialog open={isAssignOpen} onOpenChange={(open) => !assignMutation.isPending && setIsAssignOpen(open)}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Assign Judge</DialogTitle>
 <DialogDescription>Select the officer presiding over this matter.</DialogDescription>
 </DialogHeader>
 <div className="py-4">
 <Select value={selectedJudgeId} onValueChange={setSelectedJudgeId}>
 <SelectTrigger className="h-12 rounded-xl">
 <SelectValue placeholder="Select a Judge" />
 </SelectTrigger>
 <SelectContent>
 {judges.map(j => (
 <SelectItem key={j.id} value={j.id}>Judge {j.full_name || j.email}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
 <Button onClick={() => assignMutation.mutate({ caseId: targetCase.id, judgeId: selectedJudgeId })} disabled={!selectedJudgeId || assignMutation.isPending}>
 Confirm Assignment
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Review Case Details & Document Modal (Simplified High-Fidelity) */}
 <Dialog open={isReviewOpen} onOpenChange={(open) => setIsReviewOpen(open)}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Review Filing Details</DialogTitle>
 </DialogHeader>
 {reviewLoading ? <div className="py-20 text-center uppercase font-black text-xs tracking-widest animate-pulse">Loading Metadata...</div> : activeReviewCase && (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/20 rounded-2xl border border-border">
 <div><p className="text-[10px] font-black uppercase text-muted-foreground">Title</p><p className="font-bold">{activeReviewCase.title}</p></div>
 <div><p className="text-[10px] font-black uppercase text-muted-foreground">Category</p><p className="font-bold">{activeReviewCase.category?.name}</p></div>
 <div className="col-span-2"><p className="text-[10px] font-black uppercase text-muted-foreground">Description</p><p className="test-xs">{activeReviewCase.description}</p></div>
 </div>
 
 <div className="flex gap-3">
 <Button 
 className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold" 
 onClick={() => setReviewAction("accept")} 
 disabled={reviewMutation.isPending}
 >
 Accept Filing
 </Button>
 <Button 
 variant="destructive" 
 className="w-full rounded-xl font-bold" 
 onClick={() => setReviewAction("reject")} 
 disabled={reviewMutation.isPending}
 >
 Reject Filing
 </Button>
 </div>
 
 {reviewAction === "accept" && (
 <div className="space-y-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Court Name</label>
 <Input 
 placeholder="e.g. Federal High Court" 
 value={courtName} 
 onChange={(e) => setCourtName(e.target.value)} 
 className="rounded-xl bg-muted/30 h-11" 
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Room/Bench</label>
 <Input 
 placeholder="e.g. Bench 04" 
 value={courtRoom} 
 onChange={(e) => setCourtRoom(e.target.value)} 
 className="rounded-xl bg-muted/30 h-11" 
 />
 </div>
 </div>
 <div className="flex gap-3">
 <Button variant="outline" className="w-full rounded-xl" onClick={() => setReviewAction("")}>Cancel</Button>
 <Button 
 className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
 onClick={() => reviewMutation.mutate({ 
 caseId: activeReviewCase.id, 
 action: "accept", 
 court_name: courtName,
 court_room: courtRoom
 })}
 disabled={!courtName.trim() || reviewMutation.isPending}
 >
 {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 Confirm Acceptance
 </Button>
 </div>
 </div>
 )}

 {reviewAction === "reject" && (
 <div className="space-y-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Rejection Reason</label>
 <Textarea 
 placeholder="Detail why this filing is being rejected..." 
 value={rejectionReason} 
 onChange={(e) => setRejectionReason(e.target.value)} 
 className="rounded-xl bg-muted/30 min-h-[100px]" 
 />
 </div>
 <div className="flex gap-3">
 <Button variant="outline" className="w-full rounded-xl" onClick={() => setReviewAction("")}>Cancel</Button>
 <Button 
 variant="destructive" 
 className="w-full rounded-xl font-bold" 
 onClick={() => reviewMutation.mutate({ 
 caseId: activeReviewCase.id, 
 action: "reject", 
 rejection_reason: rejectionReason 
 })} 
 disabled={!rejectionReason.trim() || reviewMutation.isPending}
 >
 {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 Confirm Rejection
 </Button>
 </div>
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>

 {/* Create Defendant Modal */}
 <Dialog open={isDefendantOpen} onOpenChange={setIsDefendantOpen}>
 <DialogContent>
 <DialogHeader><DialogTitle>Register Defendant</DialogTitle></DialogHeader>
 <div className="space-y-4 py-4">
 <Input placeholder="Email Address" value={defendantForm.email} onChange={(e) => setDefendantForm({...defendantForm, email: e.target.value})} className="rounded-xl h-12" />
 <Input placeholder="Phone Number" value={defendantForm.phone_number} onChange={(e) => setDefendantForm({...defendantForm, phone_number: e.target.value})} className="rounded-xl h-12" />
 </div>
 <DialogFooter>
 <Button className="w-full rounded-xl font-bold h-12" onClick={() => defendantMutation.mutate({ caseId: defendantTarget.id, data: defendantForm })} disabled={defendantMutation.isPending}>Setup Secure Account</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
