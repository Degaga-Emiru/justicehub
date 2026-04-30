"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDefendantCaseById, fetchCaseTimeline, updateCaseStatus, fetchDefendantDocuments, submitDefendantResponse, downloadDocument } from "@/lib/api";
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
import { ArrowLeft, FileText, Download, User, Calendar, Scale, Loader2, Shield, History, CheckCircle, AlertTriangle, Send, Gavel, UserCheck, Clock, FileUp, ExternalLink, MapPin } from "lucide-react";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/mock-data";
import { toast } from "sonner";
import Link from "next/link";

const safeFormat = (dateStr, formatStr = "PPP") => {
  if (!dateStr) return "TBD";
  const date = new Date(dateStr);
  if (!isValid(date)) return "TBD";
  return format(date, formatStr);
};

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
 queryClient.invalidateQueries(["defendant-cases"]);
 toast.success("Decision acknowledged successfully.");
 }
 });

 const submitResponseMutation = useMutation({
 mutationFn: (formData) => submitDefendantResponse(id, formData),
 onSuccess: () => {
 queryClient.invalidateQueries(["case-detail", id]);
 queryClient.invalidateQueries(["defendant-cases"]);
 queryClient.invalidateQueries(["case-documents-defendant", id]);
 toast.success("Response submitted successfully.");
 setResponseForm({ description: "", document_type: "EVIDENCE", file: null });
 },
 onError: (err) => toast.error(err.message || "Failed to submit response")
 });

 const handleResponseSubmit = () => {
 if (!responseForm.description) {
 toast.error("Description is required.");
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
 <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Accessing Defense Files...</p>
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
 <Button variant="outline" className="rounded-xl border-border hover:bg-muted/30" onClick={() => router.push('/dashboard/defendant/cases')}>
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
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8">
 <div className="flex flex-col md:flex-row justify-between gap-6">
 <div className="space-y-3">
 <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] px-2 mb-1 border-rose-500/30 text-rose-500 bg-rose-500/5">
 Defense Record
 </Badge>
 <CardTitle className="text-3xl font-bold font-display tracking-tight text-[#1A202C]">{caseData.title}</CardTitle>
 <div className="flex items-center gap-4 text-sm font-semibold text-slate-400 pt-1">
 <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-rose-500" /> {caseData.file_number}</span>
 <span className="">•</span>
 <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-rose-500" /> Summons Received {safeFormat(caseData.created_at || caseData.filing_date, "MMM d, yyyy")}</span>
 </div>
 </div>
 <Badge className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border-none shadow-lg h-fit", statusColors[caseData.status])}>
 {STATUS_LABELS[caseData.status] || caseData.status}
 </Badge>
 </div>
 </CardHeader>
 <Separator className="bg-muted/30" />
 <CardContent className="p-8 space-y-8">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-2">
 <div className="space-y-1">
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</p>
 <p className="text-sm font-bold text-slate-400">{caseData.category?.name || caseData.category || "General Civil"}</p>
 </div>
 <div className="space-y-1">
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Court Jurisdiction</p>
 <p className="text-base font-bold text-slate-400 truncate">{caseData.court_name || "Superior Court"}</p>
 </div>
 <div className="space-y-1">
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hearing Status</p>
 <p className="text-sm font-bold text-slate-400">{caseData.next_hearing_date ? "Scheduled" : "Pending Intake"}</p>
 </div>
 <div className="space-y-1">
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Defense ID</p>
 <p className="text-sm font-black text-rose-500 uppercase tracking-tighter">JH-D-{caseData.id}</p>
 </div>
 </div>

 <Separator className="bg-muted/30" />

 <div className="space-y-3">
 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
 <AlertTriangle className="h-4 w-4 text-amber-500" /> Plaintiff's Claims
 </h3>
 <div className="text-base font-semibold leading-relaxed bg-muted/30 p-6 rounded-2xl border border-border text-slate-400 shadow-inner">
 {caseData.description || "The plaintiff has not provided a description."}
 </div>
 </div>

 {/* Defendant Response Section */}
 <div className="space-y-5 pt-4">
 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
 <Send className="h-4 w-4 text-primary" /> Formal Defense Response
 </h3>
 {caseData.has_defendant_responded ? (
 <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
 <div className="flex items-center justify-between">
 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Formal Response Submitted</p>
 <CheckCircle className="h-4 w-4 text-emerald-500" />
 </div>
 <p className="text-sm font-bold text-[#1A202C] opacity-100">You have already submitted a formal response for this case.</p>
 <div className="pt-2">
  <Button 
   variant="outline" 
   size="sm" 
   className="h-9 rounded-xl font-bold text-[10px] uppercase tracking-widest border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white"
   onClick={() => setResponseForm({ ...responseForm, description: "" })}
  >
   Submit Additional Evidence
  </Button>
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-[10px] font-bold uppercase tracking-widest text-[#2D3748] ml-1">Document Type</Label>
 <Select 
 value={responseForm.document_type} 
 onValueChange={(val) => setResponseForm({ ...responseForm, document_type: val })}
 >
 <SelectTrigger className="bg-muted/30 border-border rounded-xl h-11">
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
 <Label className="text-[10px] font-bold uppercase tracking-widest text-[#2D3748] ml-1">Supporting File</Label>
 <div className="relative">
 <Input 
 type="file" 
 className="hidden" 
 id="response-file"
 onChange={(e) => setResponseForm({ ...responseForm, file: e.target.files[0] })}
 />
 <label 
 htmlFor="response-file"
 className="flex items-center justify-between px-4 h-11 bg-muted/30 border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-all text-xs font-bold"
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
 <Label className="text-[10px] font-bold uppercase tracking-widest text-[#2D3748] ml-1">Statement Description</Label>
 <Textarea 
 placeholder="Provide a detailed description of this filing..."
 className="min-h-[140px] bg-muted/30 border-border rounded-2xl focus-visible:ring-primary/40 p-5 font-medium leading-relaxed"
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

  <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
  <CardHeader className="p-8 pb-4">
  <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
  <History className="h-5 w-5 text-[#C53030]" />
  Legal Journey Milestones
  </CardTitle>
  </CardHeader>
  <CardContent className="p-8 pt-0">
  {(() => {
    const milestones = [
      { title: "Summons Issued", date: caseData.filing_date || caseData.created_at, description: "Official summons received by defendant", icon: Shield, color: "text-rose-500" },
      ...(caseData.reviewed_at ? [{ title: "Legal Review Complete", date: caseData.reviewed_at, description: "Filing reviewed by court registrar", icon: CheckCircle, color: "text-emerald-500" }] : []),
      ...(caseData.hearings?.map(h => ({ 
        title: `Hearing ${h.status === "CONDUCTED" ? "Conducted" : "Scheduled"}`, 
        date: h.scheduled_date, 
        description: `${h.hearing_type} - ${h.location || "Online"}`,
        icon: Clock,
        color: h.status === "CONDUCTED" ? "text-emerald-500" : "text-blue-500"
      })) || []),
      ...(caseData.decisions?.map(d => ({ 
        title: "Judgment Delivered", 
        date: d.decision_date, 
        description: `Verdict: ${d.verdict}`,
        icon: Gavel,
        color: "text-purple-500"
      })) || []),
      ...(caseData.closed_date ? [{ title: "Case Archived", date: caseData.closed_date, description: "Final proceedings completed", icon: CheckCircle, color: "text-slate-500" }] : []),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return milestones.length > 0 ? (
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-muted/50 pt-4">
        {milestones.map((m, idx) => (
          <div key={idx} className="relative flex items-center gap-6 group">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0f172a] bg-background shadow shrink-0 z-10 transition-all group-hover:scale-110",
              m.color
            )}>
              <m.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 p-5 rounded-2xl border border-border bg-background group-hover:bg-muted/30 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h4 className="font-bold text-sm text-[#1A202C]">{m.title}</h4>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#4A5568] opacity-100">{safeFormat(m.date)}</span>
              </div>
              <p className="text-xs text-[#4A5568] leading-relaxed font-bold opacity-100">{m.description}</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm italic text-slate-400 text-center py-10">Waiting for legal proceedings to populate timeline...</p>
    );
  })()}
  </CardContent>
  </Card>

  {/* Hearings History */}
  <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
  <CardHeader className="p-8 pb-4">
  <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
  <Clock className="h-5 w-5 text-rose-500" />
  Defense Hearing Log
  </CardTitle>
  </CardHeader>
  <CardContent className="p-8">
  {caseData.hearings?.length > 0 ? (
  <div className="space-y-4">
  {caseData.hearings.map((h, i) => (
  <div key={i} className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
          h.status === "CONDUCTED" ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
        )}>
          <Calendar className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-[#1A202C]">{safeFormat(h.scheduled_date)}</p>
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-rose-500/30 text-rose-600">{h.status}</Badge>
          </div>
          <p className="text-xs text-[#4A5568] font-bold opacity-100">{h.scheduled_time} • {h.hearing_type}</p>
        </div>
      </div>
      <div className="flex flex-col md:items-end">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#2D3748] mb-1 opacity-100">Presiding Judge</p>
        <p className="text-xs font-bold text-[#1A202C]">{h.judge_name || "Honorable Justice"}</p>
        {h.location && <p className="text-[10px] font-bold text-[#4A5568] mt-1 flex items-center gap-1 opacity-100"><MapPin className="h-3 w-3" /> {h.location}</p>}
      </div>
  </div>
  ))}
  </div>
  ) : (
  <p className="text-sm italic text-slate-400 text-center py-6 border border-dashed border-border rounded-xl">No hearings scheduled at this time.</p>
  )}
  </CardContent>
  </Card>

  {/* Decision History (Only if Decided/Closed) */}
  {["DECIDED", "CLOSED"].includes(caseData.status) && (
  <Card className="bg-card shadow-sm border-border border-rose-500/20 shadow-2xl overflow-hidden">
  <CardHeader className="p-8 pb-4 bg-rose-500/5">
  <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3 text-rose-100">
  <Gavel className="h-5 w-5 text-rose-500" />
  Court Judgment
  </CardTitle>
  </CardHeader>
  <CardContent className="p-8 space-y-6">
  {caseData.decisions?.length > 0 ? (
  caseData.decisions.map((d, i) => (
  <div key={i} className="space-y-6 animate-in zoom-in-95 duration-500">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-muted/20 rounded-2xl border border-border">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Verdict</p>
        <h4 className="text-xl font-black font-display text-[#1A202C] tracking-tight">{d.verdict}</h4>
      </div>
      <div className="flex flex-col md:items-end">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#2D3748] mb-1 opacity-100">Decision Date</p>
        <p className="text-sm font-bold text-[#1A202C]">{safeFormat(d.decision_date)}</p>
      </div>
    </div>
    <div className="space-y-3 px-2">
      <p className="text-xs font-black uppercase tracking-widest text-[#2D3748] flex items-center gap-2 opacity-100">
        <FileText className="h-4 w-4" /> Court Remarks & Final Orders
      </p>
      <div className="p-6 rounded-2xl bg-background border border-border italic text-sm text-[#4A5568] leading-relaxed whitespace-pre-line font-bold opacity-100">
        {d.remarks}
      </div>
    </div>
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10 mt-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-black text-primary">{d.judge_name?.charAt(0)}</div>
        <div>
          <p className="text-[10px] font-black text-[#2D3748] uppercase leading-none opacity-100">Delivered By</p>
          <p className="text-sm font-bold mt-1 text-[#1A202C] truncate">{d.judge_name}</p>
        </div>
      </div>
      {d.pdf_document && (
        <Button 
          size="sm" 
          variant="outline" 
          className="h-9 px-4 font-bold text-xs border-primary/20 hover:bg-primary/10"
          onClick={() => downloadDocument(d.pdf_document, `Judgment_${caseData.file_number}`)}
        >
          <Download className="h-4 w-4 mr-2" /> Download PDF
        </Button>
      )}
    </div>
    </div>
  ))
  ) : (
  <p className="text-sm italic text-slate-400 text-center py-6">Official judgment record pending publication.</p>
  )}
  </CardContent>
  </Card>
  )}
  </div>

 {/* Sidebar - Right Column */}
 <div className="space-y-8">
 {/* Plaintiff Info */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-6 pb-2">
 <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3748] opacity-100">Opposing Party</CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-6">
 <div className="space-y-3">
 <Badge className="bg-blue-500/10 text-blue-500 border-none text-[9px] font-black uppercase tracking-widest">Plaintiff (Claimant)</Badge>
 <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border group hover:bg-muted/50 transition-all">
 <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
 {(caseData.plaintiff_name || "P").charAt(0)}
 </div>
 <div className="flex flex-col min-w-0">
 <p className="font-bold text-sm text-[#1A202C] truncate">{caseData.plaintiff_name || "Verified Plaintiff"}</p>
 <p className="text-xs text-[#4A5568] font-bold truncate opacity-100">Represented by State</p>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Documents */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-6 pb-2">
 <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3748] opacity-100">Claim Evidence</CardTitle>
 </CardHeader>  <CardContent className="p-6 space-y-3">
  {docsLoading ? (
  <div className="space-y-2 animate-pulse">
  {[1, 2].map(i => <div key={i} className="h-10 bg-muted/30 rounded-xl" />)}
  </div>
  ) : documents?.length > 0 ? (
  documents.map((doc, i) => (
  <div key={i} className="flex flex-col p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all gap-2">
  <div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
  <FileText className="h-4 w-4" />
  </div>
  <div className="flex flex-col min-w-0">
  <span className="text-[10px] font-black uppercase tracking-widest text-primary/90">{doc.document_type}</span>
  <span className="text-xs font-bold truncate max-w-[120px] text-[#1A202C]">{doc.description || "Untitled File"}</span>
  </div>
  </div>
  <div className="flex items-center gap-1">
  {doc.latest_version ? (
  <>
  <Button 
  variant="ghost" 
  size="icon" 
  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-muted/50"
  onClick={() => window.open(doc.latest_version.file_url, '_blank')}
  title="View"
  >
  <ExternalLink className="h-4 w-4" />
  </Button>
  <Button 
  variant="ghost" 
  size="icon" 
  className="h-8 w-8 text-primary hover:bg-primary/10"
  onClick={() => downloadDocument(doc.latest_version.file_url, doc.description || "legal_document")}
  title="Download"
  >
  <Download className="h-4 w-4" />
  </Button>
  </>
  ) : (
  <span className="text-[9px] text-slate-400 italic">No file</span>
  )}
  </div>
  </div>
  <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
    <div className="flex items-center gap-1">
      <User className="h-2.5 w-2.5" />
      <span className="truncate max-w-[80px]">Uploaded by <span className="text-slate-100">{doc.uploaded_by_name || "Court"}</span></span>
    </div>
    <div className="flex items-center gap-1">
      <Clock className="h-2.5 w-2.5" />
      <span>{safeFormat(doc.created_at, "MMM d")}</span>
    </div>
  </div>
  </div>
  ))
  ) : (
  <p className="text-[11px] italic text-slate-400 text-center py-4">No claim documents attached.</p>
  )}
  </CardContent>
 </Card>

 {/* Next Session */}
 <Card className="bg-card shadow-sm border-border border-border bg-rose-500/5">
 <CardHeader className="p-6 pb-2">
 <CardTitle className="text-sm font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
 <Clock className="h-4 w-4" /> Defense Deadline
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 pt-0 space-y-4">
 <div className="p-5 rounded-2xl bg-[#0f172a] border border-rose-500/20 space-y-3">
 <div className="space-y-1">
 <p className="text-[10px] font-black text-slate-400 uppercase ">Summons Expiry</p>
 <p className="text-base font-black text-slate-400">{safeFormat(caseData.next_hearing_date, "MMM d, yyyy")}</p>
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


