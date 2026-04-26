"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
 fetchJudgeCases, createDecision, updateDecision,
 finalizeDecision, fetchDecisionsByCase, createImmediateDecision,
 downloadDecisionPdf, publishDecision, fetchDecisionVersions,
 fetchDecisionComments, addDecisionComment, uploadDecisionDocument
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, Gavel, CheckCircle2, AlertCircle, FileText, Zap, Clock, History, Scale, Download, Send, MessageSquare, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_STYLES = {
 PENDING_REVIEW: "bg-amber-500/10 text-amber-600",
 APPROVED: "bg-blue-500/10 text-blue-600",
 PAID: "bg-teal-500/10 text-teal-600",
 ASSIGNED: "bg-indigo-500/10 text-indigo-600",
 IN_PROGRESS: "bg-purple-500/10 text-purple-600",
 CLOSED: "bg-slate-500/10 text-muted-foreground",
 PUBLISHED: "bg-emerald-500/10 text-emerald-600",
 FINALIZED: "bg-blue-500/10 text-blue-600",
 DRAFT: "bg-amber-500/10 text-amber-600",
};

// Backend Decision.DecisionType choices
const DECISION_TYPES = [
 { value: "INTERIM", label: "Interim Order" },
 { value: "FINAL", label: "Final Judgment" },
 { value: "DISMISSAL", label: "Dismissal" },
 { value: "SETTLEMENT", label: "Settlement Approval" },
 { value: "OTHER", label: "Other" },
];

// Backend Decision.ImmediateReason choices — must exactly match backend
const IMMEDIATE_REASONS = [
 { value: "MEDIATED", label: "Solved by mediated" },
 { value: "WITHDRAWN", label: "Withdrawn by the plaintiff" },
];

export default function DecisionsPage() {
 const { user } = useAuthStore();
 const queryClient = useQueryClient();
 const [selectedCaseId, setSelectedCaseId] = useState("");
 const [decisionTitle, setDecisionTitle] = useState("");
 const [decisionType, setDecisionType] = useState("FINAL");
 const [currentDecisionId, setCurrentDecisionId] = useState(null);
 const [showImmediateDialog, setShowImmediateDialog] = useState(false);
 const [immediateReason, setImmediateReason] = useState("");
 const [immediateDescription, setImmediateDescription] = useState("");
 const [commentText, setCommentText] = useState("");
 const [uploadingDoc, setUploadingDoc] = useState(false);

 // Content fields — exactly matching backend Decision model fields
 const [introduction, setIntroduction] = useState("");
 const [background, setBackground] = useState("");
 const [analysis, setAnalysis] = useState("");
 const [conclusion, setConclusion] = useState("");
 const [order, setOrder] = useState("");

 const { data: cases } = useQuery({
 queryKey: ["judge-cases-decisions"],
 queryFn: () => fetchJudgeCases(),
 });

 const { data: existingDecisions, isLoading: decisionsLoading } = useQuery({
 queryKey: ["case-decisions", selectedCaseId],
 queryFn: () => fetchDecisionsByCase(selectedCaseId),
 enabled: !!selectedCaseId,
 });

 const selectedCase = cases?.find(c => c.id === selectedCaseId);

 const createMutation = useMutation({
 mutationFn: (data) => createDecision(data),
 onSuccess: (data) => {
 setCurrentDecisionId(data.id);
 queryClient.invalidateQueries({ queryKey: ["case-decisions", selectedCaseId] });
 toast.success("Decision draft created successfully.");
 },
 onError: (err) => toast.error(err.message || "Failed to create decision"),
 });

 const updateMutation = useMutation({
 mutationFn: ({ id, data }) => updateDecision(id, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["case-decisions", selectedCaseId] });
 toast.success("Decision draft saved.");
 },
 onError: (err) => toast.error(err.message || "Failed to save decision"),
 });

 const finalizeMutation = useMutation({
 mutationFn: (id) => finalizeDecision(id),
 onSuccess: (data) => {
 queryClient.invalidateQueries({ queryKey: ["case-decisions", selectedCaseId] });
 queryClient.invalidateQueries({ queryKey: ["judge-cases-decisions"] });
 toast.success(`Decision finalized! ${data.message || "Case has been closed."}`);
 clearForm();
 },
 onError: (err) => toast.error(err.message || "Failed to finalize decision"),
 });

 const immediateMutation = useMutation({
 mutationFn: ({ caseId, data }) => createImmediateDecision(caseId, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["case-decisions", selectedCaseId] });
 queryClient.invalidateQueries({ queryKey: ["judge-cases-decisions"] });
 setShowImmediateDialog(false);
 setImmediateReason("");
 setImmediateDescription("");
 toast.success("Immediate decision issued. Case has been closed.");
 },
 onError: (err) => toast.error(err.message || "Failed to issue immediate decision"),
 });

 // Publish decision mutation
 const publishMutation = useMutation({
 mutationFn: (id) => publishDecision(id),
 onSuccess: (data) => {
 queryClient.invalidateQueries({ queryKey: ["case-decisions", selectedCaseId] });
 queryClient.invalidateQueries({ queryKey: ["judge-cases-decisions"] });
 toast.success(`Decision published! ${data.message || ""}`);
 },
 onError: (err) => toast.error(err.message || "Failed to publish decision"),
 });

 // Fetch version history
 const { data: decisionVersions } = useQuery({
 queryKey: ["decision-versions", currentDecisionId],
 queryFn: () => fetchDecisionVersions(currentDecisionId),
 enabled: !!currentDecisionId,
 });

 // Fetch comments
 const { data: decisionComments, refetch: refetchComments } = useQuery({
 queryKey: ["decision-comments", currentDecisionId],
 queryFn: () => fetchDecisionComments(currentDecisionId),
 enabled: !!currentDecisionId,
 });

 // Add comment mutation
 const commentMutation = useMutation({
 mutationFn: ({ id, text }) => addDecisionComment(id, text),
 onSuccess: () => {
 refetchComments();
 setCommentText("");
 },
 onError: (err) => toast.error(err.message || "Failed to add comment"),
 });

 const clearForm = () => {
 setDecisionTitle("");
 setIntroduction("");
 setBackground("");
 setAnalysis("");
 setConclusion("");
 setOrder("");
 setCurrentDecisionId(null);
 };

 const handleSave = () => {
 // Payload matches backend Decision model fields exactly
 const payload = {
 title: decisionTitle || `Decision for ${selectedCase?.file_number || "Case"}`,
 decision_type: decisionType,
 introduction,
 background,
 analysis,
 conclusion,
 order,
 };

 if (currentDecisionId) {
 updateMutation.mutate({
 id: currentDecisionId,
 data: payload
 });
 } else if (selectedCaseId) {
 createMutation.mutate({
 case: selectedCaseId,
 ...payload
 });
 }
 };

 const handleFinalize = () => {
 if (!currentDecisionId) {
 toast.error("Please save the draft first before finalizing.");
 return;
 }
 if (confirm("Are you sure you want to finalize this decision? This will close the case and notify all parties.")) {
 finalizeMutation.mutate(currentDecisionId);
 }
 };

 const handleLoadDraft = (decision) => {
 setCurrentDecisionId(decision.id);
 setDecisionTitle(decision.title || "");
 setDecisionType(decision.decision_type || "FINAL");
 // Load all 5 backend content fields
 setIntroduction(decision.introduction || "");
 setBackground(decision.background || "");
 setAnalysis(decision.analysis || "");
 setConclusion(decision.conclusion || "");
 setOrder(decision.order || "");
 };

 const activeCases = cases?.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(c.status)) || [];

 // Check if all required content fields have content (for save button state)
 const hasContent = introduction || background || analysis || conclusion || order;

 return (
 <div className="space-y-10 animate-fade-up">
 {/* Header */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Judicial Decisions</h1>
 <p className="text-muted-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
 <Gavel className="h-5 w-5 text-primary" />
 Draft, review, and finalize official verdicts.
 </p>
 </div>
 {selectedCaseId && (
 <Button
 className="rounded-xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-lg shadow-orange-500/20"
 onClick={() => setShowImmediateDialog(true)}
 >
 <Zap className="mr-2 h-4 w-4" />
 Immediate Decision
 </Button>
 )}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Sidebar */}
 <Card className="lg:col-span-1 bg-card shadow-sm border-border border-border shadow-xl h-fit">
 <CardHeader className="p-6 border-b border-border">
 <CardTitle className="text-xl font-black font-display tracking-tight">Select Case</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Choose a case to issue a decision for.</CardDescription>
 </CardHeader>
 <CardContent className="p-6 space-y-6">
 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Case Selection</Label>
 <Select onValueChange={(val) => { setSelectedCaseId(val); clearForm(); }} value={selectedCaseId}>
 <SelectTrigger className="h-12 bg-background border-border rounded-xl focus:ring-primary/20 font-bold">
 <SelectValue placeholder="Select a case..." />
 </SelectTrigger>
 <SelectContent className="bg-card shadow-sm border-border border-border">
 {activeCases.map((c) => (
 <SelectItem key={c.id} value={c.id} className="py-3 font-medium">
 <span className="font-bold text-foreground mr-1">{c.file_number || "Pending"}</span> - <span className="text-muted-foreground truncate ml-1">{c.title}</span>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {selectedCase && (
 <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
 <div className="space-y-1">
 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Title</span>
 <p className="font-bold text-sm leading-snug">{selectedCase.title}</p>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">File Number</span>
 <p className="font-mono font-bold text-sm">{selectedCase.file_number || "Pending"}</p>
 </div>
 <div className="space-y-1">
 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</span>
 <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest">{selectedCase.category?.name || selectedCase.category || "N/A"}</Badge>
 </div>
 <div className="space-y-1">
 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
 <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border-none", STATUS_STYLES[selectedCase.status] || "bg-muted/50 text-muted-foreground")}>
 {selectedCase.status?.replace("_", " ")}
 </Badge>
 </div>
 <div className="space-y-1">
 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Priority</span>
 <p className="font-bold text-sm">{selectedCase.priority}</p>
 </div>
 </div>
 </div>
 )}

 {selectedCaseId && (
 <div className="space-y-3 pt-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Existing Decisions</Label>
 {decisionsLoading ? (
 <div className="space-y-3">
 {[1, 2].map(i => <div key={i} className="h-20 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : existingDecisions?.length > 0 ? (
 <div className="space-y-3">
 {existingDecisions.map(d => (
 <div
 key={d.id}
 className={cn(
 "p-4 border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-all duration-200 group",
 d.id === currentDecisionId && "border-primary bg-primary/5"
 )}
 onClick={() => handleLoadDraft(d)}
 >
 <div className="flex justify-between items-start gap-2 mb-2">
 <span className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{d.title || d.decision_number || "Draft"}</span>
 <Badge className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none shrink-0", STATUS_STYLES[d.status] || "bg-muted/50 text-muted-foreground")}>
 {d.status}
 </Badge>
 </div>
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
 {d.created_at ? format(new Date(d.created_at), "MMM d, yyyy") : ""}
 </p>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-xs font-bold text-muted-foreground text-center py-4 bg-muted/10 rounded-xl border border-dashed border-border">No decisions yet for this case.</p>
 )}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Main Editor */}
 <Card className="lg:col-span-2 bg-card shadow-sm border-border border-border shadow-2xl">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-3">
 <Scale className="h-6 w-6 text-primary" />
 Decision Drafting
 {currentDecisionId && (
 <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase tracking-widest ml-2">
 Editing Draft
 </Badge>
 )}
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8">
 {selectedCase ? (
 <Tabs defaultValue="draft" className="space-y-8">
 <TabsList className="h-14 p-1.5 bg-muted/30 border border-border rounded-2xl bg-background shadow-sm border-border backdrop-blur-xl w-full flex">
 <TabsTrigger value="draft" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Draft Verdict</TabsTrigger>
 <TabsTrigger value="preview" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Preview</TabsTrigger>
 <TabsTrigger value="history" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
 <History className="mr-1.5 h-3.5 w-3.5" />
 Versions
 </TabsTrigger>
 <TabsTrigger value="comments" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
 <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
 Comments
 </TabsTrigger>
 </TabsList>

 <TabsContent value="draft" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Decision Title</Label>
 <Input
 placeholder="e.g. Final Judgment on Property Dispute"
 value={decisionTitle}
 onChange={(e) => setDecisionTitle(e.target.value)}
 className="h-12 bg-background border-border rounded-xl focus:ring-primary/20 font-bold"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Decision Type</Label>
 <Select value={decisionType} onValueChange={setDecisionType}>
 <SelectTrigger className="h-12 bg-background border-border rounded-xl focus:ring-primary/20 font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="bg-card shadow-sm border-border border-border">
 {DECISION_TYPES.map(dt => (
 <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* All 5 backend content fields */}
 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Introduction</Label>
 <Textarea
 className="min-h-[120px] font-serif text-base leading-relaxed p-5 resize-y bg-background border-border rounded-2xl focus:ring-primary/20"
 placeholder="Introduce the case, parties involved, and the matter before the court..."
 value={introduction}
 onChange={(e) => setIntroduction(e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Background</Label>
 <Textarea
 className="min-h-[120px] font-serif text-base leading-relaxed p-5 resize-y bg-background border-border rounded-2xl focus:ring-primary/20"
 placeholder="Facts of the case, procedural history, and evidence presented..."
 value={background}
 onChange={(e) => setBackground(e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Analysis</Label>
 <div className="relative group">
 <Textarea
 className="min-h-[250px] font-serif text-lg leading-relaxed p-6 resize-y bg-background border-border rounded-2xl focus:ring-primary/20"
 placeholder="Legal analysis, application of law to facts, and reasoning..."
 value={analysis}
 onChange={(e) => setAnalysis(e.target.value)}
 />
 <div className="absolute bottom-4 right-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-background/80 px-2 py-1 rounded-md backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
 {analysis.length} chars
 </div>
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Conclusion</Label>
 <Textarea
 className="min-h-[120px] font-serif text-base leading-relaxed p-5 resize-y bg-background border-border rounded-2xl focus:ring-primary/20"
 placeholder="Summary of findings and the court's determination..."
 value={conclusion}
 onChange={(e) => setConclusion(e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Court Order</Label>
 <Textarea
 className="min-h-[150px] font-serif text-base leading-relaxed p-5 resize-y bg-background border-border rounded-2xl focus:ring-primary/20"
 placeholder="Specific orders issued by the court (e.g., damages, injunctions, custody arrangements)..."
 value={order}
 onChange={(e) => setOrder(e.target.value)}
 />
 </div>
 </TabsContent>

 <TabsContent value="preview" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="bg-gradient-to-br from-[#fdfbfb] to-[#ebedee] rounded-2xl p-10 min-h-[500px] text-slate-900 shadow-inner font-serif border border-border">
 <div className="text-center mb-10 border-b-2 border-slate-200 pb-6">
 <h2 className="text-3xl font-black uppercase tracking-[0.3em] mb-2 text-slate-800">Justice Hub Court</h2>
 <h3 className="text-xl font-bold text-slate-600 uppercase tracking-widest">Official {decisionType === "FINAL" ? "Judgment" : decisionType === "INTERIM" ? "Order" : decisionType === "DISMISSAL" ? "Dismissal" : decisionType === "SETTLEMENT" ? "Settlement Approval" : "Decision"}</h3>
 <p className="text-sm font-medium text-muted-foreground mt-3 font-mono tracking-wider">Case No: {selectedCase.file_number || selectedCase.id}</p>
 </div>

 {decisionTitle && (
 <div className="mb-8">
 <p className="text-xl font-black text-center text-slate-800">{decisionTitle}</p>
 </div>
 )}

 <div className="mb-8 text-slate-700">
 <p className="font-bold text-lg mb-1"><span className="text-muted-foreground">Re:</span> {selectedCase.title}</p>
 <p className="font-medium italic"><span className="text-muted-foreground not-italic">Before:</span> Honorable {user?.first_name} {user?.last_name}</p>
 <p className="text-sm mt-1 font-medium"><span className="text-muted-foreground">Date:</span> {format(new Date(), "MMMM do, yyyy")}</p>
 </div>

 {introduction && (
 <div className="mb-10">
 <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-4 text-muted-foreground border-b border-slate-200 pb-2">I. Introduction</h4>
 <div className="whitespace-pre-wrap leading-loose text-slate-800 text-base">
 {introduction}
 </div>
 </div>
 )}

 {background && (
 <div className="mb-10">
 <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-4 text-muted-foreground border-b border-slate-200 pb-2">II. Background</h4>
 <div className="whitespace-pre-wrap leading-loose text-slate-800 text-base">
 {background}
 </div>
 </div>
 )}

 <div className="mb-10">
 <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-4 text-muted-foreground border-b border-slate-200 pb-2">III. Analysis & Reasoning</h4>
 <div className="whitespace-pre-wrap leading-loose text-slate-800 text-lg">
 {analysis || <span className="text-muted-foreground italic">[No content drafted yet]</span>}
 </div>
 </div>

 {conclusion && (
 <div className="mb-10">
 <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-4 text-muted-foreground border-b border-slate-200 pb-2">IV. Conclusion</h4>
 <div className="whitespace-pre-wrap leading-loose text-slate-800 text-base">
 {conclusion}
 </div>
 </div>
 )}

 {order && (
 <div className="mb-10">
 <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-4 text-muted-foreground border-b border-slate-200 pb-2">V. Court Orders</h4>
 <div className="whitespace-pre-wrap leading-relaxed text-slate-800 font-medium">
 {order}
 </div>
 </div>
 )}

 <div className="mt-16 pt-8 border-t-2 border-slate-200 w-1/3">
 <p className="mb-6 font-medium text-muted-foreground italic">Signed,</p>
 <p className="font-black text-3xl text-slate-800 tracking-tight" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{user?.first_name} {user?.last_name}</p>
 <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-3 text-muted-foreground">Presiding Judge</p>
 </div>
 </div>
 </TabsContent>

 <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 {currentDecisionId && decisionVersions?.length > 0 ? (
 <div className="space-y-4">
 {decisionVersions.map((v, i) => (
 <div key={v.id || i} className="p-6 border border-border rounded-2xl bg-muted/10 hover:bg-muted/30 transition-colors">
 <div className="flex justify-between items-start mb-3">
 <div className="space-y-1">
 <h4 className="font-bold text-lg">Version {v.version_number || (decisionVersions.length - i)}</h4>
 <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
 {v.is_major_change ? "Major Change" : "Minor Edit"} · by {v.created_by_name || v.author_name || "Judge"}
 </p>
 </div>
 <Badge className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-none", v.is_major_change ? "bg-orange-500/10 text-orange-600" : "bg-slate-500/10 text-muted-foreground")}>
 {v.is_major_change ? "MAJOR" : "MINOR"}
 </Badge>
 </div>
 {v.snapshot_summary && (
 <p className="text-sm font-medium text-muted-foreground leading-relaxed line-clamp-2 mt-3">{v.snapshot_summary}</p>
 )}
 <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
 <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
 <Clock className="h-3 w-3" />
 {v.created_at ? format(new Date(v.created_at), "MMM d, yyyy 'at' h:mm a") : "N/A"}
 </span>
 </div>
 </div>
 ))}
 </div>
 ) : existingDecisions?.length > 0 ? (
 <div className="space-y-4">
 {existingDecisions.map(d => (
 <div key={d.id} className="p-6 border border-border rounded-2xl bg-muted/10 hover:bg-muted/30 transition-colors">
 <div className="flex justify-between items-start mb-3">
 <div className="space-y-1">
 <h4 className="font-bold text-lg">{d.title || d.decision_number || "Decision"}</h4>
 <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
 {d.decision_number && `No: ${d.decision_number} · `}
 {d.decision_type || "N/A"}
 </p>
 </div>
 <Badge className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-none", STATUS_STYLES[d.status] || "bg-muted/50 text-muted-foreground")}>
 {d.status}
 </Badge>
 </div>
 {d.analysis && (
 <p className="text-sm font-medium text-muted-foreground leading-relaxed line-clamp-2 mt-3">{d.analysis}</p>
 )}
 <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
 <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
 <Clock className="h-3 w-3" />
 {d.created_at ? format(new Date(d.created_at), "MMM d, yyyy 'at' h:mm a") : "N/A"}
 </span>
 {d.published_at && (
 <span className="text-[10px] font-black uppercase tracking-widest text-primary">Published: {format(new Date(d.published_at), "MMM d, yyyy")}</span>
 )}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-20 border border-border rounded-2xl bg-muted/5">
 <div className="h-16 w-16 rounded-[2rem] bg-muted/10 flex items-center justify-center -rotate-6 mb-4">
 <History className="h-8 w-8 text-muted-foreground/30" />
 </div>
 <p className="text-sm font-bold text-muted-foreground">No version history. Save a draft first to start tracking versions.</p>
 </div>
 )}
 </TabsContent>

 {/* COMMENTS TAB */}
 <TabsContent value="comments" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="space-y-6">
 {/* Add comment */}
 {currentDecisionId && (
 <div className="flex gap-3">
 <Textarea
 className="flex-1 min-h-[80px] bg-background border-border rounded-xl focus:ring-primary/20 font-medium p-4"
 placeholder="Add a review comment or note..."
 value={commentText}
 onChange={(e) => setCommentText(e.target.value)}
 />
 <Button
 className="self-end rounded-xl font-bold bg-primary hover:bg-primary/90 h-10 px-5"
 disabled={!commentText.trim() || commentMutation.isPending}
 onClick={() => commentMutation.mutate({ id: currentDecisionId, text: commentText })}
 >
 <Send className="h-4 w-4 mr-1.5" />
 {commentMutation.isPending ? "..." : "Post"}
 </Button>
 </div>
 )}

 {/* Comment list */}
 {decisionComments?.length > 0 ? (
 <div className="space-y-3">
 {decisionComments.map((c, i) => (
 <div key={c.id || i} className="p-5 rounded-2xl border border-border bg-muted/10">
 <div className="flex justify-between items-start mb-2">
 <span className="font-bold text-sm">{c.author_name || c.author?.full_name || "Unknown"}</span>
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
 {c.created_at ? format(new Date(c.created_at), "MMM d, h:mm a") : ""}
 </span>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">{c.text || c.content}</p>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-16 border border-border rounded-2xl bg-muted/5">
 <div className="h-16 w-16 rounded-[2rem] bg-muted/10 flex items-center justify-center -rotate-6 mb-4">
 <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
 </div>
 <p className="text-sm font-bold text-muted-foreground">{currentDecisionId ? "No comments yet. Start a discussion above." : "Select or save a draft to enable comments."}</p>
 </div>
 )}
 </div>
 </TabsContent>
 </Tabs>
 ) : (
 <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border rounded-3xl bg-muted/5">
 <div className="h-20 w-20 rounded-[2.5rem] bg-muted/20 flex items-center justify-center mb-6 shadow-inner">
 <FileText className="h-10 w-10 text-muted-foreground/30" />
 </div>
 <p className="text-lg font-bold text-muted-foreground">Please select a case from the sidebar to begin drafting.</p>
 </div>
 )}
 </CardContent>
 
 {selectedCase && (
 <CardFooter className="flex flex-col sm:flex-row justify-between bg-muted/20 p-6 md:px-8 border-t border-border gap-4">
 <div className="flex gap-2">
 <Button variant="ghost" className="rounded-xl font-bold text-muted-foreground hover:text-foreground" onClick={clearForm}>
 Discard Draft
 </Button>
 {currentDecisionId && (
 <Button
 variant="ghost"
 className="rounded-xl font-bold text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
 onClick={() => downloadDecisionPdf(currentDecisionId).catch(err => toast.error(err.message))}
 >
 <Download className="mr-2 h-4 w-4" />
 PDF
 </Button>
 )}
 {currentDecisionId && (
 <label className="cursor-pointer">
 <input
 type="file"
 accept=".pdf,.docx"
 className="hidden"
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;
 setUploadingDoc(true);
 try {
 await uploadDecisionDocument(currentDecisionId, file);
 toast.success("Decision document uploaded.");
 queryClient.invalidateQueries({ queryKey: ["case-decisions", selectedCaseId] });
 } catch (err) {
 toast.error(err.message);
 } finally {
 setUploadingDoc(false);
 e.target.value = "";
 }
 }}
 />
 <Button variant="ghost" asChild className="rounded-xl font-bold text-muted-foreground hover:text-foreground">
 <span>
 <Upload className="mr-2 h-4 w-4" />
 {uploadingDoc ? "Uploading..." : "Upload Doc"}
 </span>
 </Button>
 </label>
 )}
 </div>
 <div className="flex flex-col sm:flex-row gap-3">
 <Button
 variant="outline"
 className="rounded-xl font-bold bg-background hover:bg-background border-border"
 onClick={handleSave}
 disabled={createMutation.isPending || updateMutation.isPending || !hasContent}
 >
 <Save className="mr-2 h-4 w-4" />
 {createMutation.isPending || updateMutation.isPending ? "Saving..." : currentDecisionId ? "Update Draft" : "Save Draft"}
 </Button>
 <Button
 className="rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20"
 onClick={handleFinalize}
 disabled={finalizeMutation.isPending || !currentDecisionId}
 >
 <CheckCircle2 className="mr-2 h-4 w-4" />
 {finalizeMutation.isPending ? "Finalizing..." : "Finalize & Close Case"}
 </Button>
 </div>
 </CardFooter>
 )}
 </Card>
 </div>

 {/* Immediate Decision Dialog */}
 <Dialog open={showImmediateDialog} onOpenChange={setShowImmediateDialog}>
 <DialogContent className="sm:max-w-[500px] bg-card shadow-sm border-border border-border shadow-2xl p-0 overflow-hidden">
 <DialogHeader className="p-8 border-b border-border bg-orange-500/5">
 <DialogTitle className="flex items-center gap-3 text-2xl font-black font-display tracking-tight text-orange-500">
 <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
 <Zap className="h-5 w-5" />
 </div>
 Issue Immediate Decision
 </DialogTitle>
 <DialogDescription className="text-muted-foreground font-medium pt-2">
 Use this for urgent rulings that don&apos;t require a full drafting process. This will immediately close the case.
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-6 p-8">
 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason for Immediate Decision</Label>
 <Select value={immediateReason} onValueChange={setImmediateReason}>
 <SelectTrigger className="h-12 bg-background border-border rounded-xl focus:ring-primary/20 font-bold">
 <SelectValue placeholder="Select reason..." />
 </SelectTrigger>
 <SelectContent className="bg-card shadow-sm border-border border-border">
 {IMMEDIATE_REASONS.map(r => (
 <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description / Reasoning</Label>
 <Textarea
 className="min-h-[150px] bg-background border-border rounded-2xl focus:ring-primary/20 font-medium p-4"
 placeholder="Provide the reasoning for this immediate decision..."
 value={immediateDescription}
 onChange={(e) => setImmediateDescription(e.target.value)}
 />
 </div>
 </div>
 <DialogFooter className="p-6 border-t border-border bg-muted/10 gap-2 sm:gap-0">
 <Button variant="outline" className="rounded-xl border-border" onClick={() => setShowImmediateDialog(false)}>Cancel</Button>
 <Button
 className="rounded-xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-lg shadow-orange-500/20"
 onClick={() => immediateMutation.mutate({
 caseId: selectedCaseId,
 data: { reason: immediateReason, description: immediateDescription }
 })}
 disabled={immediateMutation.isPending || !immediateReason || !immediateDescription}
 >
 {immediateMutation.isPending ? "Issuing..." : "Issue Immediate Decision"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
