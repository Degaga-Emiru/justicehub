"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDefendantCaseById, fetchCaseTimeline, updateCaseStatus, fetchDefendantDocuments, submitDefendantResponse } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Download, User, Calendar, Scale, Loader2, Shield, History, CheckCircle, AlertTriangle, Send, Gavel, UserCheck, Clock, FileUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/mock-data";

const STATUS_LABELS = {
    PENDING_REVIEW: "Case Under Review",
    APPROVED: "Case Approved (Formalizing)",
    REJECTED: "Filing Rejected",
    PAID: "Official Summons Issued",
    ASSIGNED: "Trial Date Pending",
    IN_PROGRESS: "Active Trial",
    DECIDED: "Final Judgment Rendered",
    CLOSED: "Case Archived",
};

export default function DefendantCaseDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [responseForm, setResponseForm] = useState({
        description: "",
        document_type: "EVIDENCE",
        file: null
    });

    const { data: caseData, isLoading, isError } = useQuery({
        queryKey: ["case-detail", id],
        queryFn: () => fetchDefendantCaseById(id),
        enabled: !!id,
    });

    const { data: timeline, isLoading: timelineLoading } = useQuery({
        queryKey: ["case-timeline", id],
        queryFn: () => fetchCaseTimeline(id),
        enabled: !!id,
    });

    const { data: documents, isLoading: docsLoading } = useQuery({
        queryKey: ["case-documents-defendant", id],
        queryFn: () => fetchDefendantDocuments(id),
        enabled: !!id,
    });

    const acknowledgeMutation = useMutation({
        mutationFn: () => updateCaseStatus(id, { is_defendant_acknowledged: true }),
        onSuccess: () => {
            queryClient.invalidateQueries(["case-detail", id]);
            alert("Decision acknowledged successfully.");
        }
    });

    const submitResponseMutation = useMutation({
        mutationFn: (formData) => submitDefendantResponse(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries(["case-detail", id]);
            queryClient.invalidateQueries(["case-documents-defendant", id]);
            alert("Response submitted successfully.");
            setResponseForm({ description: "", document_type: "EVIDENCE", file: null });
        },
        onError: (err) => alert(err.message || "Failed to submit response")
    });

    const handleResponseSubmit = () => {
        if (!responseForm.description) {
            alert("Description is required.");
            return;
        }
        const formData = new FormData();
        formData.append("description", responseForm.description);
        formData.append("document_type", responseForm.document_type);
        if (responseForm.file) {
            formData.append("file", responseForm.file);
        }
        submitResponseMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Accessing Defense Files...</p>
            </div>
        );
    }

    if (isError || !caseData) {
        return (
            <div className="space-y-4 p-6">
                <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
                <Card className="glass-card border-destructive/30">
                    <CardContent className="p-12 text-center">
                        <p className="text-destructive font-bold">Failed to load defense files.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-fade-up pb-20">
            {/* Header Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5" onClick={() => router.push('/dashboard/defendant/cases')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Defense List
                </Button>
                
                <div className="flex items-center gap-3">
                    {caseData.status === "DECIDED" && !caseData.is_defendant_acknowledged && (
                        <Button 
                            onClick={() => acknowledgeMutation.mutate()}
                            disabled={acknowledgeMutation.isPending}
                            className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 h-10 px-6"
                        >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Acknowledge Decision
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Case Details - Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-3">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] px-2 mb-1 border-rose-500/30 text-rose-500 bg-rose-500/5">
                                        Defense Record
                                    </Badge>
                                    <CardTitle className="text-3xl font-black font-display tracking-tight text-white">{caseData.title}</CardTitle>
                                    <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground pt-1">
                                        <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-rose-500" /> {caseData.file_number}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-rose-500" /> Summons Received {format(new Date(caseData.created_at || caseData.filing_date), "MMM d, yyyy")}</span>
                                    </div>
                                </div>
                                <Badge className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border-none shadow-lg h-fit", statusColors[caseData.status])}>
                                    {STATUS_LABELS[caseData.status] || caseData.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <Separator className="bg-white/5" />
                        <CardContent className="p-8 space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-2">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
                                    <p className="text-sm font-bold text-white">{caseData.category?.name || caseData.category || "General Civil"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Court Jurisdiction</p>
                                    <p className="text-sm font-bold text-white truncate">{caseData.court_name || "Superior Court"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hearing Status</p>
                                    <p className="text-sm font-bold text-white">{caseData.next_hearing_date ? "Scheduled" : "Pending Intake"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Defense ID</p>
                                    <p className="text-sm font-black text-rose-500 uppercase tracking-tighter">JH-D-{caseData.id}</p>
                                </div>
                            </div>

                            <Separator className="bg-white/5" />

                            <div className="space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Plaintiff's Claims
                                </h3>
                                <div className="text-sm font-medium leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/5 text-slate-300">
                                    {caseData.description || "The plaintiff has not provided a description."}
                                </div>
                            </div>

                            {/* Defendant Response Section */}
                            <div className="space-y-5 pt-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
                                    <Send className="h-4 w-4 text-primary" /> Formal Defense Response
                                </h3>
                                {caseData.defendant_response ? (
                                    <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Submitted Response</p>
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-200 italic">{caseData.defendant_response}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Document Type</Label>
                                                <Select 
                                                    value={responseForm.document_type} 
                                                    onValueChange={(val) => setResponseForm({ ...responseForm, document_type: val })}
                                                >
                                                    <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-11">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="EVIDENCE">Evidence Upload</SelectItem>
                                                        <SelectItem value="AFFIDAVIT">Sworn Affidavit</SelectItem>
                                                        <SelectItem value="OTHER">General Filing</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Supporting File</Label>
                                                <div className="relative">
                                                    <Input 
                                                        type="file" 
                                                        className="hidden" 
                                                        id="response-file"
                                                        onChange={(e) => setResponseForm({ ...responseForm, file: e.target.files[0] })}
                                                    />
                                                    <label 
                                                        htmlFor="response-file"
                                                        className="flex items-center justify-between px-4 h-11 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all text-xs font-bold"
                                                    >
                                                        <span className="truncate max-w-[150px]">
                                                            {responseForm.file ? responseForm.file.name : "Select Document File"}
                                                        </span>
                                                        <FileUp className="h-4 w-4 text-primary" />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Statement Description</Label>
                                            <Textarea 
                                                placeholder="Provide a detailed description of this filing..."
                                                className="min-h-[140px] bg-white/5 border-white/10 rounded-2xl focus-visible:ring-primary/40 p-5 font-medium leading-relaxed"
                                                value={responseForm.description}
                                                onChange={(e) => setResponseForm({ ...responseForm, description: e.target.value })}
                                            />
                                        </div>

                                        <Button 
                                            onClick={handleResponseSubmit}
                                            disabled={submitResponseMutation.isPending}
                                            className="rounded-xl font-bold bg-primary hover:bg-primary/90 h-11 px-8 w-full md:w-auto"
                                        >
                                            {submitResponseMutation.isPending ? "Submitting Response..." : "Submit Formal Response"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline */}
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
                                <History className="h-5 w-5 text-rose-500" />
                                Legal Progression
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            {timelineLoading ? (
                                <div className="space-y-4 animate-pulse pt-4">
                                    {[1, 2].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl" />)}
                                </div>
                            ) : timeline?.length > 0 ? (
                                <div className="space-y-4 pt-4">
                                    {timeline.map((event, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                                                    <Gavel className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white leading-none mb-1">{event.title || event.event_type}</p>
                                                    <p className="text-[11px] text-muted-foreground font-medium">{event.description}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-rose-500/40 uppercase tracking-widest">{format(new Date(event.date), "MMM d, yyyy")}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs italic text-muted-foreground text-center py-10 border border-dashed border-white/5 rounded-2xl">No legal events recorded yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - Right Column */}
                <div className="space-y-8">
                    {/* Plaintiff Info */}
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-6 pb-2">
                             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Opposing Party</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-3">
                                <Badge className="bg-blue-500/10 text-blue-500 border-none text-[9px] font-black uppercase tracking-widest">Plaintiff (Claimant)</Badge>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
                                        {(caseData.plaintiff_name || "P").charAt(0)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <p className="font-bold text-sm text-white truncate">{caseData.plaintiff_name || "Verified Plaintiff"}</p>
                                        <p className="text-xs text-muted-foreground font-medium truncate">Represented by State</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Documents */}
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-6 pb-2">
                             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Claim Evidence</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-3">
                            {docsLoading ? (
                                <div className="space-y-2 animate-pulse">
                                    {[1, 2].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl" />)}
                                </div>
                            ) : documents?.length > 0 ? (
                                documents.map((doc, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-background/50 hover:bg-white/5 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{doc.document_type}</span>
                                                <span className="text-xs font-bold truncate max-w-[120px]">{doc.description || "Untitled File"}</span>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-primary hover:bg-primary/10"
                                            onClick={() => {
                                                if (doc.latest_version?.file) {
                                                    window.open(doc.latest_version.file, '_blank');
                                                }
                                            }}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[11px] italic text-muted-foreground text-center py-4">No claim documents attached.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Next Session */}
                    <Card className="glass-card border-white/5 bg-rose-500/5">
                        <CardHeader className="p-6 pb-2">
                             <CardTitle className="text-sm font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Defense Deadline
                             </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            <div className="p-5 rounded-2xl bg-[#0f172a] border border-rose-500/20 space-y-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Summons Expiry</p>
                                    <p className="text-base font-black text-white">{caseData.next_hearing_date ? format(new Date(caseData.next_hearing_date), "MMM d, yyyy") : "ASAP"}</p>
                                </div>
                                <Badge variant="outline" className="text-[9px] font-black uppercase border-rose-500/30 text-rose-500">Legal Deadline</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

import Link from "next/link";
