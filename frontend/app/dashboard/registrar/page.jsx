"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCases, fetchUsers, assignJudge, fetchRegistrarStatistics, fetchPendingCases, reviewCase, fetchCaseById, createDefendantAccount } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ShieldCheck, Search, UserCheck, FileCheck, XCircle, FileText, Download, Scale, ClipboardList, AlertCircle, Loader2, UserPlus, Mail, Phone, FileSearch } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_COLORS = {
 PENDING_REVIEW: "bg-amber-500/10 text-amber-600",
 APPROVED: "bg-emerald-500/10 text-emerald-600",
 PAID: "bg-teal-500/10 text-teal-600",
 ASSIGNED: "bg-blue-500/10 text-blue-600",
 IN_PROGRESS: "bg-purple-500/10 text-purple-600",
 CLOSED: "bg-slate-500/10 text-muted-foreground",
 REJECTED: "bg-rose-500/10 text-rose-600",
 ASSIGNMENT_FAILED: "bg-red-500/10 text-red-600",
};

const STATUS_LABELS = {
 PENDING_REVIEW: "Pending Review",
 APPROVED: "Approved",
 PAID: "Paid — Ready",
 ASSIGNED: "Assigned",
 IN_PROGRESS: "In Progress",
 CLOSED: "Closed",
 REJECTED: "Rejected",
 ASSIGNMENT_FAILED: "Assignment Failed",
};

export default function RegistrarDashboardPage() {
 const queryClient = useQueryClient();
 const [searchTerm, setSearchTerm] = useState("");

 // Assign Judge Modal State
 const [isAssignOpen, setIsAssignOpen] = useState(false);
 const [targetCase, setTargetCase] = useState(null);
 const [selectedJudgeId, setSelectedJudgeId] = useState("");
 const [assignmentNotes, setAssignmentNotes] = useState("");



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
 queryKey: ["cases"],
 queryFn: () => fetchCases()
 });

 const { data: pendingIntake = [], isLoading: intakeLoading } = useQuery({
 queryKey: ["pendingIntake"],
 queryFn: () => fetchPendingCases()
 });



 const { data: users = [] } = useQuery({
 queryKey: ["users"],
 queryFn: () => fetchUsers()
 });

 const { data: stats = {} } = useQuery({
 queryKey: ["registrarStats"],
 queryFn: () => fetchRegistrarStatistics()
 });

 // Mutations
 const assignMutation = useMutation({
 mutationFn: ({ caseId, judgeId, notes }) => assignJudge(caseId, { 
   judge_id: judgeId,
   assignment_notes: notes 
 }),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["cases"] });
 setIsAssignOpen(false);
 setAssignmentNotes("");
 toast.success("Judge assigned successfully!");
 },
 onError: (err) => toast.error(err.message || "Failed to assign judge")
 });



 const defendantMutation = useMutation({
 mutationFn: ({ caseId, data }) => createDefendantAccount(caseId, data),
 onSuccess: () => {
 queryClient.invalidateQueries(["cases"]);
 queryClient.invalidateQueries(["pendingIntake"]);
 queryClient.invalidateQueries(["caseDetails"]);
 setIsDefendantOpen(false);
 setDefendantTarget(null);
 setDefendantForm({ email: "", phone_number: "", first_name: "", last_name: "" });
 toast.success("Defendant account created and linked.");
 },
 onError: (err) => toast.error(err.message || "Failed to create defendant account")
 });

 // Filters
 const judges = users.filter(user => user.role === "JUDGE" && user.is_active !== false);

 const filteredCases = cases.filter(c =>
  c.status !== "CLOSED" && (
  String(c.file_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
  String(c.title || "").toLowerCase().includes(searchTerm.toLowerCase())
  ));

 const pendingAssignment = filteredCases.filter(c => c.status === "ASSIGNMENT_FAILED" || c.status === "PAID" || c.status === "APPROVED");

 const filteredIntake = pendingIntake.filter(c =>
 String(c.file_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
 String(c.title || "").toLowerCase().includes(searchTerm.toLowerCase())
 );

 const handleAssignClick = (caseItem) => {
 setTargetCase(caseItem);
 setSelectedJudgeId("");
 setAssignmentNotes("");
 setIsAssignOpen(true);
 };

 const handleReviewClick = (caseItem) => {
 window.location.href = `/dashboard/clerk/cases/${caseItem.id}`;
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
 <h1 className="text-4xl font-black font-display tracking-tight text-[#1A202C]">Registrar Command</h1>
 <p className="text-[#4A5568] font-bold text-lg leading-relaxed flex items-center gap-2 opacity-100">
 <ClipboardList className="h-5 w-5 text-primary" />
 Case intake review, judge assignment, and court administration.
 </p>
 </div>
 <div className="relative max-w-sm w-full group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568] group-focus-within:text-primary transition-colors opacity-100" />
 <Input
 placeholder="Search by file number or title..."
 className="h-11 pl-11 bg-muted/30 border-border rounded-2xl focus-visible:ring-primary/20 focus-visible:bg-muted/50 transition-all font-bold text-sm text-[#1A202C]"
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
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-[#2D3748] opacity-100">Pending Intake</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
 <FileText className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-[#1A202C]">{filteredIntake.length}</div>
 <p className="text-xs font-black text-[#4A5568] uppercase tracking-tight mt-1 opacity-100">Awaiting review</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-blue-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-[#2D3748] opacity-100">Pending Assignment</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
 <UserCheck className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-[#1A202C]">
 {stats.pending_assignment !== undefined ? stats.pending_assignment : pendingAssignment.length}
 </div>
 <p className="text-xs font-black text-[#4A5568] uppercase tracking-tight mt-1 opacity-100">Need judge assigned</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-emerald-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-[#2D3748] opacity-100">Active Judges</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
 <ShieldCheck className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-[#1A202C]">{judges.length}</div>
 <p className="text-xs font-black text-[#4A5568] uppercase tracking-tight mt-1 opacity-100">Available for assignment</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-purple-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-[#2D3748] opacity-100">Total Cases</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
 <Scale className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-[#1A202C]">{cases.length}</div>
 <p className="text-xs font-black text-[#4A5568] uppercase tracking-tight mt-1 opacity-100">In the registry</p>
 </CardContent>
 </Card>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="intake" className="w-full space-y-8">
 <TabsList className="h-14 p-1.5 bg-muted/30 border border-border rounded-2xl bg-background shadow-sm border-border backdrop-blur-xl w-full lg:max-w-2xl mx-auto flex">
 <TabsTrigger value="intake" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
 Intake Review
 <Badge className="bg-amber-500/20 text-amber-600 border-none text-[10px] font-black h-5 px-1.5">{filteredIntake.length}</Badge>
 </TabsTrigger>
 <TabsTrigger value="assignment" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
 Judge Assignment
 <Badge className="bg-blue-500/20 text-blue-600 border-none text-[10px] font-black h-5 px-1.5">{pendingAssignment.length}</Badge>
 </TabsTrigger>
 <TabsTrigger value="all" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
 All Cases
 </TabsTrigger>
 </TabsList>

 {/* INTAKE TAB */}
 <TabsContent value="intake" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-2xl font-black font-display tracking-tight text-[#1A202C]">Registration Queue</CardTitle>
 <CardDescription className="text-[#4A5568] font-bold opacity-100">Review and verify incoming case filings before processing.</CardDescription>
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
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] pl-8 opacity-100">Entry #</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Case Profile</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Category</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Priority</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Filed Date</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] text-right pr-8 opacity-100">Command</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredIntake.length > 0 ? (
 filteredIntake.map((c) => (
 <TableRow 
 key={c.id} 
 className="border-border hover:bg-muted/30 transition-colors group cursor-pointer" 
 onClick={() => window.location.href = `/dashboard/clerk/cases/${c.id}`}
 >
 <TableCell className="font-mono text-xs font-black text-[#4A5568] pl-8 opacity-100">PENDING</TableCell>
 <TableCell className="py-6">
 <div className="flex flex-col gap-1">
 <span className="font-black font-display text-base tracking-tight group-hover:text-primary transition-colors text-[#1A202C]">{c.title}</span>
 <span className="text-xs font-bold text-[#4A5568] truncate max-w-[240px] italic opacity-100">{c.description}</span>
 </div>
 </TableCell>
 <TableCell>
 <span className="text-xs font-black uppercase tracking-widest text-[#1A202C]">{c.category?.name || "—"}</span>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border-none bg-muted/50 text-[#1A202C]">
 {c.priority}
 </Badge>
 </TableCell>
 <TableCell className="text-xs font-black text-[#1A202C]">{new Date(c.created_at).toLocaleDateString()}</TableCell>
 <TableCell className="text-right pr-8">
 <Button 
 size="sm" 
 className="rounded-xl font-bold text-xs uppercase tracking-widest" 
 onClick={(e) => { e.stopPropagation(); handleReviewClick(c); }}
 >
 <FileText className="mr-2 h-4 w-4" /> Review
 </Button>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={6} className="py-32 text-center">
 <div className="flex flex-col items-center justify-center space-y-4">
 <div className="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center -rotate-6 border border-border shadow-inner">
 <FileCheck className="h-10 w-10 text-[#4A5568] opacity-20" />
 </div>
 <div className="space-y-1">
 <p className="text-xl font-black font-display text-[#1A202C]">Clear Queue</p>
 <p className="text-sm font-bold text-[#4A5568] opacity-100">All incoming filings have been processed.</p>
 </div>
 </div>
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
  <CardTitle className="text-2xl font-black font-display tracking-tight text-[#1A202C]">Judge Assignment Queue</CardTitle>
  <CardDescription className="text-[#4A5568] font-bold opacity-100">Assign verified cases to available judges in the jurisdiction.</CardDescription>
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
   <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] pl-8 opacity-100">Docket #</TableHead>
   <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Title</TableHead>
   <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Category</TableHead>
   <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Status</TableHead>
   <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Filed</TableHead>
   <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] text-right pr-8 opacity-100">Action</TableHead>
  </TableRow>
  </TableHeader>
 <TableBody>
 {pendingAssignment.length > 0 ? (
 pendingAssignment.map((c) => (
 <TableRow 
 key={c.id} 
 className="border-border hover:bg-muted/30 transition-colors group cursor-pointer" 
 onClick={() => window.location.href = `/dashboard/clerk/cases/${c.id}`}
 >
   <TableCell className="font-mono text-xs font-black text-[#4A5568] pl-8 opacity-100">{c.file_number}</TableCell>
   <TableCell className="py-6">
   <span className="font-black font-display text-base tracking-tight group-hover:text-primary transition-colors text-[#1A202C]">{c.title}</span>
   </TableCell>
   <TableCell className="text-[10px] font-black uppercase tracking-widest text-[#4A5568] opacity-100">{c.category_name || "GENERAL"}</TableCell>
 <TableCell>
 <Badge className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none", STATUS_COLORS[c.status])}>
 {STATUS_LABELS[c.status] || c.status}
 </Badge>
 </TableCell>
 <TableCell className="text-xs font-bold">{new Date(c.created_at).toLocaleDateString()}</TableCell>
 <TableCell className="text-right pr-8">
 <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
 {(!c.defendant || c.defendant === "PENDING_DEFENDANT") && (
 <Button size="sm" variant="outline" className="rounded-xl font-bold text-xs border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/10 gap-1.5" onClick={(e) => { e.stopPropagation(); handleDefendantClick(c); }}>
 <UserPlus className="h-3.5 w-3.5" /> Defendant
 </Button>
 )}
 <Button size="sm" className="rounded-xl font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 text-white shadow-lg shadow-primary/20" onClick={(e) => { e.stopPropagation(); handleAssignClick(c); }}>
 <UserCheck className="mr-2 h-4 w-4" /> Assign Judge
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={6} className="py-32 text-center">
 <div className="flex flex-col items-center justify-center space-y-4">
  <div className="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center rotate-6 border border-border shadow-inner">
  <UserCheck className="h-10 w-10 text-[#4A5568] opacity-20" />
  </div>
  <div className="space-y-1">
  <p className="text-xl font-black font-display text-[#1A202C]">All Assigned</p>
  <p className="text-sm font-bold text-[#4A5568] opacity-100">No cases waiting for judge assignment.</p>
  </div>
 </div>
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

 {/* ALL CASES TAB */}
 <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-2xl font-black font-display tracking-tight text-[#1A202C]">Master Registry</CardTitle>
 <CardDescription className="text-[#4A5568] font-bold opacity-100">Comprehensive index of all recorded legal proceedings.</CardDescription>
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
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] pl-8 opacity-100">Docket #</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Title</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Category</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Filed</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Status</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] text-right pr-8 opacity-100">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredCases.length > 0 ? (
 filteredCases.map((c) => (
 <TableRow 
 key={c.id} 
 className="border-border hover:bg-muted/30 transition-colors group cursor-pointer" 
 onClick={() => window.location.href = `/dashboard/clerk/cases/${c.id}`}
 >
 <TableCell className="font-mono text-xs font-black text-[#4A5568] pl-8 opacity-100">{c.file_number || "—"}</TableCell>
 <TableCell className="py-6">
 <span className="font-black font-display text-sm tracking-tight group-hover:text-primary transition-colors truncate max-w-[280px] block text-[#1A202C]">{c.title}</span>
 </TableCell>
 <TableCell className="text-[10px] font-black uppercase tracking-widest text-[#4A5568] opacity-100">{c.category_name || "GENERAL"}</TableCell>
 <TableCell className="text-xs font-black text-[#1A202C]">{new Date(c.created_at).toLocaleDateString()}</TableCell>
 <TableCell>
 <Badge className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none", STATUS_COLORS[c.status])}>
 {STATUS_LABELS[c.status] || c.status}
 </Badge>
 </TableCell>
 <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
 <div className="flex justify-end gap-2">
 {(!c.defendant || c.defendant === "PENDING_DEFENDANT") && (c.status === "PAID" || c.status === "APPROVED") ? (
 <Button size="sm" variant="outline" className="rounded-xl font-bold text-[10px] uppercase tracking-tight border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/10 gap-1.5" onClick={(e) => { e.stopPropagation(); handleDefendantClick(c); }}>
 <UserPlus className="h-3.5 w-3.5" /> Defendant
 </Button>
 ) : null}
 
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
 <span className="sr-only">Open menu</span>
 <MoreHorizontal className="h-5 w-5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="bg-card shadow-sm border-border border-border p-2 min-w-[180px]">
 <DropdownMenuItem 
 className="rounded-lg font-bold text-xs uppercase tracking-tight py-2.5 gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors"
 onSelect={(e) => { e.preventDefault(); window.location.href = `/dashboard/clerk/cases/${c.id}`; }}
 >
 <FileSearch className="h-4 w-4 text-primary" /> View Details
 </DropdownMenuItem>
 {(c.status === "PAID" || c.status === "APPROVED" || c.status === "ASSIGNMENT_FAILED") && (
 <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase tracking-tight py-2.5 gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors" onSelect={(e) => { e.preventDefault(); handleAssignClick(c); }}>
 <UserCheck className="h-4 w-4 text-primary" /> Assign Judge
 </DropdownMenuItem>
 )}
 {(!c.defendant || c.defendant === "PENDING_DEFENDANT") && (
 <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase tracking-tight py-2.5 gap-2 cursor-pointer focus:bg-indigo-500/10 focus:text-indigo-500 transition-colors" onSelect={(e) => { e.preventDefault(); handleDefendantClick(c); }}>
 <UserPlus className="h-4 w-4" /> Create Defendant
 </DropdownMenuItem>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={6} className="py-32 text-center text-[#4A5568] font-black uppercase tracking-widest text-xs opacity-100">
 No cases found in the registry.
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
 </Tabs>

 {/* Assign Judge Dialog */}
 <Dialog open={isAssignOpen} onOpenChange={(open) => !assignMutation.isPending && setIsAssignOpen(open)}>
 <DialogContent className="sm:max-w-[480px]">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-xl font-black font-display">
 <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <UserCheck className="h-5 w-5" />
 </div>
 Assign Judge to Case
 </DialogTitle>
 <DialogDescription className="text-[#4A5568] font-bold opacity-100">
 Select an active judge for <span className="font-black text-[#1A202C]">{targetCase?.file_number || targetCase?.title}</span>.
 </DialogDescription>
 </DialogHeader>
 <div className="grid gap-4 py-4">
 <div className="space-y-2">
 <label className="text-xs font-black uppercase tracking-widest text-[#2D3748] ml-1 opacity-100">Select Judge</label>
 <Select value={selectedJudgeId} onValueChange={setSelectedJudgeId}>
 <SelectTrigger className="h-12 bg-background border-border rounded-xl">
 <SelectValue placeholder="-- Select a Judge --" />
 </SelectTrigger>
 <SelectContent>
 {(() => {
  const caseCategory = (targetCase?.category?.name || targetCase?.category_name || "").trim().toLowerCase();
  const filteredJudges = judges.filter(j => 
   j.judge_specializations?.some(s => s.trim().toLowerCase() === caseCategory)
  );
  
  if (filteredJudges.length === 0) {
   return <div className="p-4 text-xs text-center text-muted-foreground font-bold uppercase tracking-widest">No Judges specialized in {targetCase?.category?.name || targetCase?.category_name || "this category"}</div>;
  }
  
  return filteredJudges.map(j => (
   <SelectItem key={j.id} value={j.id}>
    Judge {j.full_name || j.first_name || j.email}
   </SelectItem>
  ));
 })()}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-black uppercase tracking-widest text-[#2D3748] ml-1 opacity-100">Assignment Notes</label>
 <Textarea 
 placeholder="Enter reason or instructions for this assignment..."
 value={assignmentNotes}
 onChange={(e) => setAssignmentNotes(e.target.value)}
 className="min-h-[100px] bg-background border-border rounded-xl resize-none"
 />
 </div>
 </div>
 <DialogFooter className="gap-2 sm:gap-0">
 <Button variant="outline" className="rounded-xl" onClick={() => setIsAssignOpen(false)} disabled={assignMutation.isPending}>
 Cancel
 </Button>
 <Button
 onClick={() => assignMutation.mutate({ 
   caseId: targetCase.id, 
   judgeId: selectedJudgeId,
   notes: assignmentNotes 
 })}
 disabled={!selectedJudgeId || assignMutation.isPending}
 className="rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 text-white shadow-lg shadow-primary/20"
 >
 {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {assignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
 </Button>
 </DialogFooter>
 </DialogContent>
  </Dialog>
 
  {/* Create Defendant Account Dialog */}
 <Dialog open={isDefendantOpen} onOpenChange={(open) => !defendantMutation.isPending && setIsDefendantOpen(open)}>
 <DialogContent className="sm:max-w-[480px]">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-xl font-black font-display">
 <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
 <UserPlus className="h-5 w-5" />
 </div>
 Create Defendant Account
 </DialogTitle>
 <DialogDescription className="text-[#4A5568] font-bold opacity-100">
 Create and link a defendant account for <span className="font-black text-[#1A202C]">{defendantTarget?.title}</span>. An activation OTP will be sent to the provided email.
 </DialogDescription>
 </DialogHeader>
 <div className="grid gap-4 py-4">
 {defendantMutation.isError && (
 <Alert variant="destructive" className="bg-background shadow-sm border-border border-destructive/50">
 <AlertDescription className="font-bold">
 {defendantMutation.error?.message || "Failed to create defendant account."}
 </AlertDescription>
 </Alert>
 )}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-2">
 <label className="text-xs font-black uppercase tracking-widest text-[#2D3748] ml-1 opacity-100">First Name *</label>
 <Input
 placeholder="First name"
 value={defendantForm.first_name}
 onChange={(e) => setDefendantForm({...defendantForm, first_name: e.target.value})}
 className="h-11 bg-background border-border rounded-xl"
 disabled={defendantMutation.isPending}
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black uppercase tracking-widest text-[#2D3748] ml-1 opacity-100">Last Name *</label>
 <Input
 placeholder="Last name"
 value={defendantForm.last_name}
 onChange={(e) => setDefendantForm({...defendantForm, last_name: e.target.value})}
 className="h-11 bg-background border-border rounded-xl"
 disabled={defendantMutation.isPending}
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black uppercase tracking-widest text-[#2D3748] ml-1 flex items-center gap-1.5 opacity-100">
 <Mail className="h-3 w-3" /> Email Address *
 </label>
 <Input
 type="email"
 placeholder="defendant@email.com"
 value={defendantForm.email}
 onChange={(e) => setDefendantForm({...defendantForm, email: e.target.value})}
 className="h-11 bg-background border-border rounded-xl"
 disabled={defendantMutation.isPending}
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black uppercase tracking-widest text-[#2D3748] ml-1 flex items-center gap-1.5 opacity-100">
 <Phone className="h-3 w-3" /> Phone Number *
 </label>
 <Input
 type="tel"
 placeholder="+251900000000"
 value={defendantForm.phone_number}
 onChange={(e) => setDefendantForm({...defendantForm, phone_number: e.target.value})}
 className="h-11 bg-background border-border rounded-xl"
 disabled={defendantMutation.isPending}
 />
 </div>
 </div>
 <DialogFooter className="gap-2 sm:gap-0">
 <Button variant="outline" className="rounded-xl" onClick={() => setIsDefendantOpen(false)} disabled={defendantMutation.isPending}>
 Cancel
 </Button>
 <Button
 onClick={() => defendantMutation.mutate({ caseId: defendantTarget.id, data: defendantForm })}
 disabled={!defendantForm.email || !defendantForm.phone_number || !defendantForm.first_name || !defendantForm.last_name || defendantMutation.isPending}
 className="rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/20"
 >
 {defendantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {defendantMutation.isPending ? "Creating..." : "Create & Send OTP"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
