"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchCaseById, fetchCaseTimeline } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
 ArrowLeft, FileText, User, Scale, Loader2, 
 Shield, History, MapPin, Gavel, Briefcase, 
 Clock, AlertTriangle, Download, Activity, Info
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusStyles = {
 PENDING_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
 APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
 REJECTED: "bg-red-100 text-red-800 border-red-200",
 PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
 ASSIGNED: "bg-cyan-100 text-cyan-800 border-cyan-200",
 IN_PROGRESS: "bg-violet-100 text-violet-800 border-violet-200",
 CLOSED: "bg-slate-100 text-slate-800 border-slate-200",
};

export default function AdminCaseDetailPage() {
 const { id } = useParams();
 const router = useRouter();

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

 if (isLoading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-sm font-medium text-muted-foreground">Loading case details...</p>
 </div>
 );
 }

 if (isError || !caseData) {
 return (
 <div className="max-w-xl mx-auto mt-12 p-8 text-center space-y-4 bg-rose-50 rounded-xl border border-rose-100">
 <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
 <h2 className="text-2xl font-bold text-slate-800">Case Not Found</h2>
 <p className="text-slate-600">The requested case could not be located in the system.</p>
 <Button variant="outline" className="mt-4" onClick={() => router.back()}>
 <ArrowLeft className="mr-2 h-4 w-4" /> Return to Cases
 </Button>
 </div>
 );
 }

 const plaintiffName = caseData.plaintiff?.full_name || caseData.created_by?.full_name || "Anonymous Entity";
 const defendantName = caseData.defendant === "PENDING_DEFENDANT" ? (caseData.defendant_name || "Pending Registration") : (caseData.defendant?.full_name || caseData.defendant_name || "Unidentified");
 const defendantAddress = caseData.defendant === "PENDING_DEFENDANT" ? caseData.defendant_address : (caseData.defendant?.address || caseData.defendant_address);

 return (
 <div className="max-w-[1200px] mx-auto space-y-6 pb-16 animate-in fade-in">
 {/* Header Actions */}
 <div className="flex items-center gap-2 mb-4">
 <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
 <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cases
 </Button>
 </div>

 {/* Header Title & Status */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-3 mb-1">
 <span className="text-sm font-semibold text-primary uppercase tracking-wider">
 {caseData.file_number || "PENDING FILE NUMBER"}
 </span>
 <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", statusStyles[caseData.status])}>
 {caseData.status_display || caseData.status?.replace("_", " ")}
 </Badge>
 </div>
 <h1 className="text-3xl font-bold text-foreground tracking-tight">
 {caseData.title}
 </h1>
 </div>
 <Button className="shadow-sm">
 <Download className="mr-2 h-4 w-4" /> Export Report
 </Button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
 {/* Main Content Column */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* Case Information Card */}
 <Card className="shadow-sm border-border">
 <CardHeader className="border-b bg-muted/20 pb-4">
 <CardTitle className="text-lg flex items-center gap-2">
 <Info className="h-5 w-5 text-primary" /> Case Information
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
 <InfoBlock label="Category" value={caseData.category?.name || "Unclassified"} />
 <InfoBlock label="Priority" value={caseData.priority_display || caseData.priority} />
 <InfoBlock label="Filing Date" value={format(new Date(caseData.filing_date), "MMM d, yyyy")} />
 <InfoBlock label="Days Active" value={`${caseData.days_pending || 0} Days`} />
 </div>

 <div className="space-y-6">
 <div>
 <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
 <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
 {caseData.description || "No formal description provided."}
 </p>
 </div>

 {caseData.case_summary && (
 <div>
 <h4 className="text-sm font-semibold text-foreground mb-2">Executive Summary</h4>
 <div className="bg-muted/30 p-4 rounded-lg border text-sm text-muted-foreground leading-relaxed">
 {caseData.case_summary}
 </div>
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Parties Involved Card */}
 <Card className="shadow-sm border-border">
 <CardHeader className="border-b bg-muted/20 pb-4">
 <CardTitle className="text-lg flex items-center gap-2">
 <User className="h-5 w-5 text-primary" /> Parties Involved
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <div className="divide-y">
 <PartyRow 
 role="Plaintiff / Petitioner" 
 name={plaintiffName} 
 lawyer={caseData.plaintiff_lawyer?.full_name} 
 />
 <PartyRow 
 role="Defendant / Respondent" 
 name={defendantName} 
 lawyer={caseData.defendant_lawyer?.full_name} 
 address={defendantAddress}
 />
 </div>
 </CardContent>
 </Card>

 {/* Documents Table */}
 <Card className="shadow-sm border-border">
 <CardHeader className="border-b bg-muted/20 pb-4">
 <CardTitle className="text-lg flex items-center gap-2">
 <FileText className="h-5 w-5 text-primary" /> Documents
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 {caseData.documents && caseData.documents.length > 0 ? (
 <div className="divide-y">
 {caseData.documents.map((doc, idx) => (
 <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
 <div className="flex flex-col min-w-0">
 <p className="text-sm font-semibold text-foreground truncate">
 {doc.latest_version?.file_name || doc.document_type_display || doc.document_type}
 </p>
 <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
 <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase font-medium">{doc.document_type_display || doc.document_type}</Badge>
 {doc.latest_version?.uploaded_at && (
 <span>Uploaded: {format(new Date(doc.latest_version.uploaded_at), "MMM d, yyyy")}</span>
 )}
 </div>
 </div>
 <Button 
 variant="ghost" 
 size="sm" 
 className="shrink-0 text-primary hover:bg-primary/10"
 onClick={() => {
 if (doc.latest_version?.file) window.open(doc.latest_version.file, '_blank');
 }}
 disabled={!doc.latest_version?.file}
 >
 <Download className="h-4 w-4 mr-2" /> Download
 </Button>
 </div>
 ))}
 </div>
 ) : (
 <div className="p-8 text-center text-muted-foreground">
 <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
 <p className="text-sm">No documents have been uploaded yet.</p>
 </div>
 )}
 </CardContent>
 </Card>

 </div>

 {/* Right Column */}
 <div className="space-y-6">
 {/* Judicial Assignment */}
 <Card className="shadow-sm border-border">
 <CardHeader className="border-b bg-muted/20 pb-4">
 <CardTitle className="text-lg flex items-center gap-2">
 <Gavel className="h-5 w-5 text-primary" /> Judicial Assignment
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6">
 {caseData.current_assignment ? (
 <div className="space-y-4">
 <div>
 <p className="text-sm font-semibold text-foreground">Judge {caseData.current_assignment.judge_name}</p>
 <p className="text-xs text-muted-foreground mt-1">Presiding Officer</p>
 </div>
 <Separator />
 <div className="space-y-2 text-xs">
 <div className="flex justify-between">
 <span className="text-muted-foreground">Assigned On</span>
 <span className="font-medium text-foreground">{format(new Date(caseData.current_assignment.assigned_at), "MMM d, yyyy")}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Assigned By</span>
 <span className="font-medium text-foreground">{caseData.current_assignment.assigned_by || "System Admin"}</span>
 </div>
 </div>
 </div>
 ) : (
 <div className="text-center py-4 text-muted-foreground">
 <p className="text-sm">Pending Assignment</p>
 <p className="text-xs mt-1">No presiding officer designated.</p>
 </div>
 )}
 
 {caseData.court_name && (
 <div className="mt-4 pt-4 border-t space-y-2">
 <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
 <MapPin className="h-4 w-4 text-muted-foreground" /> {caseData.court_name}
 </div>
 <p className="text-xs text-muted-foreground pl-6">Chamber {caseData.court_room || "N/A"}</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Timeline */}
 <Card className="shadow-sm border-border">
 <CardHeader className="border-b bg-muted/20 pb-4">
 <CardTitle className="text-lg flex items-center gap-2">
 <History className="h-5 w-5 text-primary" /> Activity & Timeline
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6">
 {timelineLoading ? (
 <div className="space-y-4">
 {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted/50 rounded-md animate-pulse" />)}
 </div>
 ) : timeline && timeline.length > 0 ? (
 <div className="space-y-6 relative before:absolute before:inset-0 before:left-[11px] before:w-px before:bg-border">
 {timeline.map((event, idx) => (
 <div key={idx} className="relative flex gap-4">
 <div className="relative z-10 h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0 mt-0.5">
 <div className="h-1.5 w-1.5 rounded-full bg-primary" />
 </div>
 <div className="flex flex-col pb-2">
 <p className="text-xs text-muted-foreground font-medium mb-1">
 {format(new Date(event.date), "MMM d, yyyy • HH:mm")}
 </p>
 <p className="text-sm font-semibold text-foreground">
 {event.title || event.event_type}
 </p>
 {event.description && (
 <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
 {event.description}
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-6 text-muted-foreground">
 <p className="text-sm">No activity recorded yet.</p>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}

function InfoBlock({ label, value }) {
 return (
 <div>
 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
 <p className="text-sm font-semibold text-foreground">{value}</p>
 </div>
 );
}

function PartyRow({ role, name, lawyer, address }) {
 return (
 <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
 <div>
 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{role}</p>
 <p className="text-base font-semibold text-foreground">{name}</p>
 {address && <p className="text-xs text-muted-foreground mt-1 italic">{address}</p>}
 </div>
 <div className="sm:text-right">
 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Legal Counsel</p>
 {lawyer ? (
 <p className="text-sm font-medium flex items-center sm:justify-end gap-1.5 text-foreground">
 <Scale className="h-3.5 w-3.5 text-primary" /> {lawyer}
 </p>
 ) : (
 <p className="text-sm text-muted-foreground italic">Self-Represented</p>
 )}
 </div>
 </div>
 );
}
