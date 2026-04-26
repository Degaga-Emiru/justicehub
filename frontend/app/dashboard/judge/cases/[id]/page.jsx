"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCaseById, updateCaseStatus, fetchCaseTimeline, downloadJudgeDocument } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, FileText, Download, User, Calendar, Scale, Loader2, Play, Gavel, Clock, MapPin, History, CheckCircle, Shield } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { statusColors, priorityColors } from "@/lib/mock-data";
import { toast } from "sonner";

export default function JudgeCaseDetailPage() {
 const { id } = useParams();
 const router = useRouter();
 const queryClient = useQueryClient();
 const { user } = useAuthStore();

 const { data: caseData, isLoading, isError } = useQuery({
 queryKey: ["case-detail", id],
 queryFn: () => fetchCaseById(id),
 enabled: !!id,
 });

 const { data: timeline, isLoading: timelineLoading } = useQuery({
 queryKey: ["case-timeline", id],
 queryFn: () => fetchCaseTimeline(id),
 enabled: !!id,
 });

 const startCaseMutation = useMutation({
 mutationFn: () => updateCaseStatus(id, { status: "IN_PROGRESS" }),
 onSuccess: () => {
 queryClient.invalidateQueries(["case-detail", id]);
 toast.success("Case marked as In Progress.");
 },
 onError: (err) => toast.error(err.message || "Failed to start case")
 });

 if (isLoading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Loading Judicial Record...</p>
 </div>
 );
 }

 if (isError || !caseData) {
 return (
 <div className="space-y-4 p-6">
 <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
 <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
 </Button>
 <Card className="bg-card shadow-sm border-border border-destructive/30">
 <CardContent className="p-12 text-center space-y-3">
 <p className="text-destructive font-bold">Failed to load case details.</p>
 </CardContent>
 </Card>
 </div>
 );
 }

 return (
 <div className="space-y-8 max-w-6xl mx-auto animate-fade-up pb-20">
 {/* Header Navigation */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <Button variant="outline" className="rounded-xl border-border hover:bg-muted/30" onClick={() => router.back()}>
 <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
 </Button>
 
 <div className="flex items-center gap-3">
 {caseData.status === "ASSIGNED" && (
 <Button 
 onClick={() => startCaseMutation.mutate()}
 disabled={startCaseMutation.isPending}
 className="rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
 >
 <Play className="mr-2 h-4 w-4" />
 {startCaseMutation.isPending ? "Starting..." : "Start Case Intake"}
 </Button>
 )}
 {["ASSIGNED", "IN_PROGRESS"].includes(caseData.status) && (
 <Link href="/dashboard/judge/decisions">
 <Button variant="secondary" className="rounded-xl font-bold">
 <Gavel className="mr-2 h-4 w-4" />
 Issue Judgment
 </Button>
 </Link>
 )}
 </div>
 </div>

 <div className="grid gap-8 lg:grid-cols-3">
 {/* Main Case Info */}
 <div className="lg:col-span-2 space-y-8">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 bg-gradient-to-r from-primary/5 to-transparent">
 <div className="flex flex-col md:flex-row justify-between gap-4">
 <div className="space-y-2">
 <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-2 border-primary/30 text-primary">
 Judicial Record
 </Badge>
 <CardTitle className="text-3xl font-black font-display tracking-tight text-white leading-tight">
 {caseData.title}
 </CardTitle>
 <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mt-2">
 <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" /> {caseData.file_number || "PENDING"}</span>
 <span>•</span>
 <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" /> Filed {format(new Date(caseData.created_at || caseData.filing_date), "MMM d, yyyy")}</span>
 </div>
 </div>
 <div className="flex flex-col items-end gap-2">
 <Badge className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-none h-8 shadow-lg", statusColors[caseData.status])}>
 {caseData.status?.replace("_", " ")}
 </Badge>
 <Badge variant="outline" className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest h-8 border-border bg-background shadow-sm border-border", priorityColors[caseData.priority])}>
 Priority: {caseData.priority}
 </Badge>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-8 space-y-8">
 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
 <div className="space-y-1.5">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
 <p className="text-sm font-bold flex items-center gap-2"><Scale className="h-4 w-4 text-primary" /> {caseData.category?.name || caseData.category || "General Civil"}</p>
 </div>
 <div className="space-y-1.5">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Court Jurisdiction</p>
 <p className="text-sm font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-500" /> {caseData.court_name || "High Court of Justice"}</p>
 </div>
 <div className="space-y-1.5">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Update</p>
 <p className="text-sm font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /> {format(new Date(), "MMM d, h:mm a")}</p>
 </div>
 </div>

 <Separator className="bg-muted/30" />

 <div className="space-y-4">
 <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
 <FileText className="h-4 w-4" /> Comprehensive Description
 </h3>
 <p className="text-sm font-medium leading-relaxed bg-muted/30 p-6 rounded-2xl border border-border text-muted-foreground">
 {caseData.description || "No detailed description provided by the plaintiff."}
 </p>
 </div>

 <Separator className="bg-muted/30" />

 {/* Documents */}
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
 <FileText className="h-4 w-4" /> Evidence & Documentation
 </h3>
 <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black">{caseData.documents?.length || 0} Files</Badge>
 </div>
 
 {caseData.documents?.length > 0 ? (
 <div className="grid gap-3">
 {caseData.documents.map((doc, i) => {
 const docId = doc.document_id || doc.id;
 return (
 <div key={docId || i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/40 hover:bg-muted/30 transition-all group">
 <div className="flex items-center gap-3 min-w-0">
 <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <FileText className="h-5 w-5 text-primary" />
 </div>
 <div className="flex flex-col min-w-0">
 <p className="font-bold text-sm truncate">{doc.description || doc.document_type || "Legal Filing"}</p>
 <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{doc.document_type}</p>
 </div>
 </div>
 <Button 
 variant="ghost" 
 size="sm" 
 className="h-9 px-3 rounded-lg text-primary hover:bg-primary/10 font-bold text-xs"
 onClick={() => downloadJudgeDocument(docId).catch(err => toast.error(err.message))}
 >
 <Download className="h-4 w-4 mr-2" /> Download
 </Button>
 </div>
 );
 })}
 </div>
 ) : (
 <p className="text-sm text-center py-10 italic text-muted-foreground border border-dashed border-border rounded-2xl">No evidentiary documents currently attached.</p>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Timeline */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 pb-4">
 <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
 <History className="h-5 w-5 text-primary" />
 Procedural Timeline
 </CardTitle>
 </CardHeader>
 <CardContent className="p-8">
 {timelineLoading ? (
 <div className="space-y-4 animate-pulse">
 {[1, 2].map(i => <div key={i} className="h-12 bg-muted/30 rounded-xl" />)}
 </div>
 ) : timeline?.length > 0 ? (
 <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-muted/30">
 {timeline.map((event, idx) => (
 <div key={idx} className="relative flex items-start gap-6 group">
 <div className="flex items-center justify-center w-9 h-9 rounded-full border-4 border-[#0f172a] bg-primary/20 text-primary shrink-0 z-10 transition-transform group-hover:scale-110">
 <CheckCircle className="h-4 w-4" />
 </div>
 <div className="flex-1 pt-1 space-y-1">
 <div className="flex items-center justify-between">
 <h4 className="font-bold text-sm text-white">{event.title || event.event_type}</h4>
 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{format(new Date(event.date), "MMM d, yyyy")}</span>
 </div>
 <p className="text-xs text-muted-foreground font-medium italic">{event.description}</p>
 <p className="text-[10px] font-black text-primary/90 uppercase tracking-widest mt-1">Authorized by {event.user_role || "Registrar"}</p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-sm italic text-muted-foreground text-center">No procedural events recorded.</p>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Sidebar Info */}
 <div className="space-y-8">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-6 pb-2">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Litigation Parties</CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-6">
 {/* Plaintiff */}
 <div className="space-y-3">
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest w-fit">
 Plaintiff
 </div>
 <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border group hover:bg-muted/50 transition-all">
 <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
 {(caseData.plaintiff_name || caseData.created_by_name || "P").charAt(0)}
 </div>
 <div className="flex flex-col min-w-0">
 <p className="font-bold text-sm text-white truncate">{caseData.plaintiff_name || caseData.created_by_name || "Verified Plaintiff"}</p>
 <p className="text-xs text-muted-foreground font-medium">Digital Filing ID: {caseData.created_by_id || "7721"}</p>
 </div>
 </div>
 </div>

 <Separator className="bg-muted/30" />

 {/* Defendant */}
 <div className="space-y-3">
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest w-fit">
 Defendant
 </div>
 <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border group hover:bg-muted/50 transition-all">
 <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-600 to-orange-700 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
 {(caseData.defendant_name || "D").charAt(0)}
 </div>
 <div className="flex flex-col min-w-0">
 <p className="font-bold text-sm text-white truncate">{caseData.defendant_name || "Pending Account"}</p>
 {caseData.defendant && caseData.defendant !== "PENDING_DEFENDANT" ? (
 <p className="text-xs text-rose-400 font-bold flex items-center gap-1.5 mt-1">
 <Shield className="h-3 w-3" /> System Account Linked
 </p>
 ) : (
 <p className="text-xs text-amber-400 font-bold flex items-center gap-1.5 mt-1 animate-pulse">
 <Clock className="h-3 w-3" /> Awaiting Link
 </p>
 )}
 </div>
 </div>
 {caseData.defendant?.address && (
 <div className="p-3 rounded-xl bg-black/20 text-[11px] font-medium text-muted-foreground line-clamp-2">
 {caseData.defendant.address}
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Hearing Summary Sidebar */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden bg-primary/5">
 <CardHeader className="p-6">
 <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
 <Calendar className="h-4 w-4" /> Next Session
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 pt-0 space-y-4">
 <div className="p-4 rounded-2xl bg-[#0f172a] border border-primary/20 space-y-4">
 <div className="space-y-1">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Scheduled Date</p>
 <p className="text-base font-black text-white">{caseData.next_hearing_date ? format(new Date(caseData.next_hearing_date), "EEEE, MMM d") : "Not Scheduled"}</p>
 </div>
 {caseData.next_hearing_date && (
 <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase">
 Active Docket
 </Badge>
 )}
 <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold text-xs h-10 shadow-lg shadow-primary/20">
 Modify Docket
 </Button>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}

import Link from "next/link";
