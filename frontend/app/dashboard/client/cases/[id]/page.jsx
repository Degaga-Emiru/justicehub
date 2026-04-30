"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCaseById, fetchCaseTimeline, initiatePayment, submitPayment, downloadDocument } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Download, User, Calendar, Scale, Loader2, CreditCard, Banknote, ExternalLink, CheckCircle, Clock, History, Mail, Phone, MapPin, Gavel } from "lucide-react";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";
import Link from "next/link";

const safeFormat = (dateStr, formatStr = "PPP") => {
  if (!dateStr) return "TBD";
  const date = new Date(dateStr);
  if (!isValid(date)) return "TBD";
  return format(date, formatStr);
};

const STATUS_LABELS = {
 PENDING_REVIEW: "Awaiting Court Approval",
 APPROVED: "Fee Payment Required",
 REJECTED: "Filing Rejected",
 PAID: "Payment Verified",
 ASSIGNED: "Case Assigned to Judge",
 IN_PROGRESS: "Hearing in Progress",
 DECIDED: "Judgment Rendered",
 CLOSED: "Case Closed",
};

export default function ClientCaseDetailPage() {
 const { id } = useParams();
 const router = useRouter();
 const { t } = useLanguage();
 const queryClient = useQueryClient();
 const { user } = useAuthStore();

 // Payment States
 const [isPaymentOpen, setIsPaymentOpen] = useState(false);
 const [paymentMethod, setPaymentMethod] = useState("chapa");
 const [paymentError, setPaymentError] = useState("");
 const [paymentSuccess, setPaymentSuccess] = useState("");
 const [paymentForm, setPaymentForm] = useState({
 transaction_reference: "",
 sender_name: "",
 bank_name: "",
 transaction_date: new Date().toISOString().split("T")[0],
 });

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

 const chapaMutation = useMutation({
 mutationFn: () => initiatePayment(id),
 onSuccess: (response) => {
 const paymentUrl = response?.data?.payment_url;
 if (paymentUrl) {
 window.location.href = paymentUrl;
 } else {
 setPaymentSuccess("Payment initiated! Check your email for details.");
 setIsPaymentOpen(false);
 }
 },
 onError: (err) => setPaymentError(err.message || "Failed to initiate Chapa payment"),
 });

 const payMutation = useMutation({
 mutationFn: (data) => submitPayment(data),
 onSuccess: () => {
 queryClient.invalidateQueries(["case-detail", id]);
 setIsPaymentOpen(false);
 setPaymentSuccess("Bank transfer submitted! Awaiting verification.");
 setTimeout(() => setPaymentSuccess(""), 8000);
 },
 onError: (err) => setPaymentError(err.message || "Payment submission failed"),
 });

 if (isLoading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Gathering Case Records...</p>
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
 <p className="text-destructive font-bold text-lg">Unable to locate this case record.</p>
 </CardContent>
 </Card>
 </div>
 );
 }

 return (
 <div className="space-y-8 max-w-6xl mx-auto animate-fade-up pb-20">
 {/* Header Navigation */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <Button variant="outline" className="rounded-xl border-border hover:bg-muted/30" onClick={() => router.push('/dashboard/client/cases')}>
 <ArrowLeft className="mr-2 h-4 w-4" /> My Filings
 </Button>
 
  {caseData.status === "APPROVED" && (
  <Button 
  onClick={() => setIsPaymentOpen(true)}
  className="rounded-xl font-bold bg-gradient-to-r from-blue-600 to-primary hover:from-blue-500 hover:to-primary text-white shadow-xl shadow-blue-500/20 px-8 h-12"
  >
  <CreditCard className="mr-2 h-5 w-5" />
  Pay Filing Fee
  </Button>
  )}
 </div>

 {paymentSuccess && (
 <Alert className="border-emerald-500/20 bg-emerald-500/10 bg-background shadow-sm border-border animate-in fade-in slide-in-from-top-2">
 <CheckCircle className="h-4 w-4 text-emerald-500" />
 <AlertDescription className="text-emerald-500 font-bold ml-2">{paymentSuccess}</AlertDescription>
 </Alert>
 )}

 <div className="grid gap-8 lg:grid-cols-3">
 {/* Case File - Left Column */}
 <div className="lg:col-span-2 space-y-8">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8">
 <div className="flex flex-col md:flex-row justify-between gap-6">
 <div className="space-y-3">
 <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] px-2 mb-1 border-primary/30 text-primary">
 Plaintiff Record
 </Badge>
 <CardTitle className="text-3xl font-black font-display tracking-tight text-[#1A202C]">{caseData.title}</CardTitle>
 <div className="flex items-center gap-4 text-sm font-bold text-[#4A5568] pt-1 opacity-100">
 <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary/80" /> {caseData.file_number || "Draft No: " + caseData.id}</span>
 <span>•</span>
 <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary/80" /> Registered {(caseData.created_at || caseData.filing_date) ? format(new Date(caseData.created_at || caseData.filing_date), "MMM d, yyyy") : "N/A"}</span>
 </div>
 </div>
 <div className="flex flex-col items-end gap-2">
 <Badge className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border-none shadow-lg", statusColors[caseData.status])}>
 {STATUS_LABELS[caseData.status] || caseData.status}
 </Badge>
 </div>
 </div>
 </CardHeader>
 <Separator className="bg-muted/30" />
 <CardContent className="p-8 space-y-8">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-2">
 <div className="space-y-1">
 <p className="text-[10px] font-black uppercase tracking-widest text-[#2D3748] opacity-100">Category</p>
 <p className="text-sm font-bold text-[#1A202C]">{caseData.category?.name || caseData.category || "General"}</p>
 </div>
 <div className="space-y-1">
 <p className="text-[10px] font-black uppercase tracking-widest text-[#2D3748] opacity-100">Case Priority</p>
 <Badge variant="outline" className="text-[10px] font-black border-border uppercase tracking-tighter bg-muted/30 text-[#1A202C]">{caseData.priority}</Badge>
 </div>
 <div className="space-y-1">
 <p className="text-[10px] font-black uppercase tracking-widest text-[#2D3748] opacity-100">Court assigned</p>
 <p className="text-sm font-bold text-[#1A202C] truncate">{caseData.court_name || "Lideta Federal Court"}</p>
 </div>
 <div className="space-y-1">
 <p className="text-[10px] font-black uppercase tracking-widest text-[#2D3748] opacity-100">Processing Fee</p>
 <p className="text-sm font-black text-primary">{caseData.category?.fee || caseData.category_fee || "0"} ETB</p>
 </div>
 </div>

 <Separator className="bg-muted/30" />

 <div className="space-y-3">
 <h3 className="text-xs font-black uppercase tracking-widest text-[#2D3748] flex items-center gap-2 px-2 opacity-100">
 <FileText className="h-4 w-4" /> Brief Description
 </h3>
 <p className="text-sm font-bold leading-relaxed bg-muted/30 p-6 rounded-2xl border border-border text-[#4A5568] opacity-100">
 {caseData.description || "No description provided."}
 </p>
 </div>

 {/* Documents */}
 <div className="space-y-5">
  <h3 className="text-xs font-black uppercase tracking-widest text-[#2D3748] flex items-center gap-2 px-2 pt-4 opacity-100">
  <Download className="h-4 w-4" /> Supporting Evidence
  </h3>
 <div className="grid gap-3">
 {caseData.documents?.length > 0 ? (
 caseData.documents.map((doc, i) => (
  <div key={i} className="flex flex-col p-4 rounded-xl border border-border bg-background/40 hover:bg-muted/30 transition-all group gap-4">
  <div className="flex items-center justify-between">
  <div className="flex items-center gap-4">
  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
  <FileText className="h-5 w-5 text-primary" />
  </div>
   <div className="flex flex-col">
   <span className="text-sm font-black text-[#1A202C] truncate max-w-[200px]">{doc.description || doc.document_type}</span>
   <span className="text-[10px] font-black text-[#4A5568] uppercase opacity-100">{doc.document_type}</span>
   </div>
  </div>
  <Button 
    size="sm" 
    variant="ghost" 
    className="h-9 px-3 font-bold text-xs hover:text-primary"
    onClick={() => doc.latest_version?.file_url ? downloadDocument(doc.latest_version.file_url, doc.description || doc.document_type) : window.open(doc.file, '_blank')}
  >
  <Download className="h-4 w-4 mr-2" /> Download
  </Button>
  </div>
   <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-widest text-[#2D3748] opacity-100">
     <div className="flex items-center gap-2">
       <User className="h-3 w-3 text-primary/80" />
       <span>Uploaded by <span className="text-[#1A202C]">{doc.uploaded_by_name || "System"}</span> ({doc.uploaded_by_role || "User"})</span>
     </div>
     <div className="flex items-center gap-2">
       <Clock className="h-3 w-3 text-primary/80" />
       <span>{safeFormat(doc.created_at, "MMM d, yyyy")}</span>
     </div>
   </div>
  </div>
 ))
 ) : (
 <p className="text-xs italic text-slate-400 border-border border border-dashed rounded-xl p-6 text-center">No evidentiary files recorded for this filing.</p>
 )}
 </div>
 </div>
 </CardContent>
 </Card>

  {/* Case Timeline */}
  <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
  <CardHeader className="p-8 pb-4">
  <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
  <History className="h-5 w-5 text-primary" />
  Case Journey Milestones
  </CardTitle>
  </CardHeader>
  <CardContent className="p-8">
  {(() => {
    const milestones = [
      { title: "Case Filed", date: caseData.filing_date || caseData.created_at, description: "Official case registration", icon: FileText, color: "text-blue-500" },
      ...(caseData.reviewed_at ? [{ title: "Accepted by Registrar", date: caseData.reviewed_at, description: "Filing reviewed and accepted", icon: CheckCircle, color: "text-emerald-500" }] : []),
      ...(caseData.hearings?.map(h => ({ 
        title: `Hearing ${h.status === "CONDUCTED" ? "Conducted" : "Scheduled"}`, 
        date: h.scheduled_date, 
        description: `${h.hearing_type} - ${h.location || "Online"}`,
        icon: Clock,
        color: h.status === "CONDUCTED" ? "text-emerald-500" : "text-blue-500"
      })) || []),
      ...(caseData.decisions?.map(d => ({ 
        title: "Decision Issued", 
        date: d.decision_date, 
        description: `Verdict: ${d.verdict}`,
        icon: Gavel,
        color: "text-purple-500"
      })) || []),
      ...(caseData.closed_date ? [{ title: "Case Closed", date: caseData.closed_date, description: "Final proceedings completed", icon: CheckCircle, color: "text-slate-500" }] : []),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return milestones.length > 0 ? (
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-muted/50">
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
                 <h4 className="font-black text-sm text-[#1A202C]">{m.title}</h4>
                 <span className="text-[10px] font-black uppercase tracking-widest text-[#4A5568] opacity-100">{safeFormat(m.date)}</span>
               </div>
               <p className="text-xs text-[#4A5568] leading-relaxed font-black opacity-100">{m.description}</p>
             </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm italic text-[#4A5568] text-center py-10 opacity-100 font-bold">Waiting for judicial action to populate timeline...</p>
    );
  })()}
  </CardContent>
  </Card>

  {/* Hearings History */}
  <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
  <CardHeader className="p-8 pb-4">
  <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3 text-[#1A202C]">
  <Clock className="h-5 w-5 text-primary" />
  Hearing History
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
        h.status === "CONDUCTED" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
      )}>
        <Calendar className="h-6 w-6" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-black text-sm text-[#1A202C]">{safeFormat(h.scheduled_date)}</p>
          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-primary border-primary/20">{h.status}</Badge>
        </div>
        <p className="text-xs text-[#4A5568] font-bold opacity-100">{h.scheduled_time} • {h.hearing_type}</p>
      </div>
    </div>
    <div className="flex flex-col md:items-end">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#2D3748] mb-1 opacity-100">Presided by</p>
      <p className="text-xs font-black text-[#1A202C]">{h.judge_name || "Assigned Judge"}</p>
      {h.location && <p className="text-[10px] font-bold text-[#4A5568] mt-1 flex items-center gap-1 opacity-100"><MapPin className="h-3 w-3 text-primary/80" /> {h.location}</p>}
    </div>
  </div>
  ))}
  </div>
  ) : (
  <p className="text-sm italic text-[#4A5568] text-center py-6 border border-dashed border-border rounded-xl font-bold opacity-100">No hearings recorded for this case yet.</p>
  )}
  </CardContent>
  </Card>

  {/* Decision History (Only if Decided/Closed) */}
  {["DECIDED", "CLOSED"].includes(caseData.status) && (
  <Card className="bg-card shadow-sm border-border border-primary/20 shadow-2xl overflow-hidden">
  <CardHeader className="p-8 pb-4 bg-primary/5">
  <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3 text-[#1A202C]">
  <Gavel className="h-5 w-5 text-primary" />
  Final Decision & Judgment
  </CardTitle>
  </CardHeader>
  <CardContent className="p-8 space-y-6">
  {caseData.decisions?.length > 0 ? (
  caseData.decisions.map((d, i) => (
  <div key={i} className="space-y-6 animate-in zoom-in-95 duration-500">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-muted/20 rounded-2xl border border-border">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Verdict</p>
        <h4 className="text-xl font-black font-display text-[#1A202C]">{d.verdict}</h4>
      </div>
      <div className="flex flex-col md:items-end">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#2D3748] mb-1 opacity-100">Decision Date</p>
        <p className="text-sm font-black text-[#1A202C]">{safeFormat(d.decision_date)}</p>
      </div>
    </div>
    <div className="space-y-3 px-2">
      <p className="text-xs font-black uppercase tracking-widest text-[#2D3748] flex items-center gap-2 opacity-100">
        <FileText className="h-4 w-4" /> Judge's Remarks & Orders
      </p>
      <div className="p-6 rounded-2xl bg-background border border-border italic text-sm text-[#4A5568] leading-relaxed whitespace-pre-line font-bold opacity-100">
        {d.remarks}
      </div>
    </div>
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-black text-primary">{d.judge_name?.charAt(0)}</div>
        <div>
          <p className="text-[10px] font-black text-[#2D3748] uppercase leading-none opacity-100">Delivered By</p>
          <p className="text-sm font-black mt-1 text-[#1A202C] truncate">{d.judge_name}</p>
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
  <p className="text-sm italic text-[#4A5568] text-center py-6 font-bold opacity-100">Judgment record is pending finalized filing.</p>
  )}
  </CardContent>
  </Card>
  )}
  </div>

 {/* Sidebar Info - Right Column */}
 <div className="space-y-8">
 {/* User Info Card */}
 <Card className="bg-card shadow-sm border-border border-border overflow-hidden">
  <CardHeader className="p-6 pb-2">
  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3748] opacity-100">Case Involvement</CardTitle>
  </CardHeader>
 <CardContent className="p-6 space-y-6">
 <div className="space-y-4">
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest w-fit">
 You (Plaintiff)
 </div>
  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-black text-primary">{user?.name?.charAt(0)}</div>
  <div className="flex flex-col truncate">
  <p className="font-black text-sm text-[#1A202C]">{user?.name}</p>
  <p className="text-[10px] text-[#4A5568] font-black uppercase truncate opacity-100">{user?.email}</p>
  </div>
  </div>
 </div>
 
 <Separator className="bg-muted/30" />

 <div className="space-y-4">
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest w-fit">
 Defendant
 </div>
  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
  <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center font-black text-rose-500">{(caseData.defendant_name || "D").charAt(0)}</div>
  <div className="flex flex-col truncate">
  <p className="font-black text-sm truncate text-[#1A202C]">{caseData.defendant_name || "Pending Account"}</p>
  <p className="text-[10px] text-[#4A5568] font-black uppercase tracking-tight opacity-100">External Non-User</p>
  </div>
  </div>
 {caseData.defendant?.address && (
  <div className="flex items-start gap-2 p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
  <p className="text-[11px] font-bold text-[#4A5568] leading-relaxed opacity-100">{caseData.defendant.address}</p>
  </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Court Info */}
 <Card className="bg-card shadow-sm border-border border-border bg-primary/5">
 <CardHeader className="p-6 pb-2">
 <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
 <Scale className="h-4 w-4" /> Judicial Information
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-4">
  <div className="p-4 rounded-xl bg-background border border-border flex items-center gap-3">
  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
  <Gavel className="h-5 w-5 text-emerald-500" />
  </div>
  <div>
  <p className="text-[10px] font-black text-[#4A5568] uppercase leading-none opacity-100">Judge Assigned</p>
  <p className="text-sm font-black mt-1 text-[#1A202C] truncate">{caseData.judge_name || "Honorable Justice"}</p>
  </div>
  </div>
  <div className="p-4 rounded-xl bg-background border border-border flex items-center gap-3">
  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
  <History className="h-5 w-5 text-blue-500" />
  </div>
  <div>
  <p className="text-[10px] font-black text-[#4A5568] uppercase leading-none opacity-100">Current Phase</p>
  <p className="text-sm font-black mt-1 text-[#1A202C]">{STATUS_LABELS[caseData.status] || "Filing Approval"}</p>
  </div>
  </div>
  </CardContent>
 </Card>
 </div>
 </div>

 {/* Payment Dialog - Reusing logic from cases/page.jsx */}
 <Dialog open={isPaymentOpen} onOpenChange={(open) => !open && setIsPaymentOpen(false)}>
 <DialogContent className="sm:max-w-[560px]">
 <DialogHeader>
 <DialogTitle className="text-xl font-black font-display flex items-center gap-2">
 <CreditCard className="h-5 w-5 text-primary" /> Case Filing Fee
 </DialogTitle>
  <DialogDescription className="text-[#4A5568] font-bold opacity-100">Please select a payment method for case: <span className="text-[#1A202C] font-black">{caseData?.title}</span></DialogDescription>
 </DialogHeader>
 
 <div className="py-4 space-y-5">
            {paymentError && (
                <Alert variant="destructive" className="rounded-2xl border-rose-500/20 bg-rose-500/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-bold text-xs">{paymentError}</AlertDescription>
                </Alert>
            )}

  <div className="flex justify-between items-center p-5 bg-primary/10 rounded-2xl border border-primary/20">
  <span className="text-xs font-black uppercase tracking-widest text-[#2D3748] opacity-100">Total Fee</span>
  <span className="text-2xl font-black font-display text-primary">{caseData?.category?.fee || caseData?.category_fee || 0} <span className="text-sm font-black">ETB</span></span>
  </div>

 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => setPaymentMethod("chapa")}
 className={cn(
 "p-4 rounded-2xl border-2 text-left transition-all duration-300 space-y-1.5",
 paymentMethod === "chapa" ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10" : "border-border bg-muted/20 hover:border-border"
 )}
 >
 <div className="flex items-center gap-2">
 <CreditCard className={cn("h-5 w-5", paymentMethod === "chapa" ? "text-emerald-500" : "text-muted-foreground")} />
 <span className="font-black text-sm">Chapa Pay</span>
 </div>
 <p className="text-[11px] text-muted-foreground font-medium">Instant online (Visa/MC/M-Pesa)</p>
 </button>
 <button
 type="button"
 onClick={() => setPaymentMethod("bank")}
 className={cn(
 "p-4 rounded-2xl border-2 text-left transition-all duration-300 space-y-1.5",
 paymentMethod === "bank" ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10" : "border-border bg-muted/20 hover:border-border"
 )}
 >
 <div className="flex items-center gap-2">
 <Banknote className={cn("h-5 w-5", paymentMethod === "bank" ? "text-blue-500" : "text-muted-foreground")} />
 <span className="font-black text-sm">Bank Transfer</span>
 </div>
 <p className="text-[11px] text-muted-foreground font-medium">Digital receipt verification</p>
 </button>
 </div>

 {paymentMethod === "bank" && (
 <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
    <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Bank Name *</Label>
            <Input 
                placeholder="e.g. CBE, Dashen..." 
                className="h-11 bg-background border-border rounded-xl"
                value={paymentForm.bank_name}
                onChange={(e) => setPaymentForm({...paymentForm, bank_name: e.target.value})}
            />
        </div>
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reference Number *</Label>
            <Input 
                placeholder="Transaction ID" 
                className="h-11 bg-background border-border rounded-xl"
                value={paymentForm.transaction_reference}
                onChange={(e) => setPaymentForm({...paymentForm, transaction_reference: e.target.value})}
            />
        </div>
    </div>
 <div className="space-y-2">
 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account Holder Name *</Label>
 <Input 
 placeholder="Full name on bank account" 
 className="h-11 bg-background border-border rounded-xl"
 value={paymentForm.sender_name}
 onChange={(e) => setPaymentForm({...paymentForm, sender_name: e.target.value})}
 />
 </div>
 </div>
 )}
 </div>

 <DialogFooter className="gap-2 sm:gap-0">
 <Button variant="outline" className="rounded-xl" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
 <Button
 onClick={() => paymentMethod === "chapa" ? chapaMutation.mutate() : payMutation.mutate({ ...paymentForm, case_id: id })}
 disabled={chapaMutation.isPending || payMutation.isPending}
 className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-white min-w-[140px]"
 >
 {(chapaMutation.isPending || payMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {paymentMethod === "chapa" ? "Proceed to Chapa" : "Submit Receipt"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}


