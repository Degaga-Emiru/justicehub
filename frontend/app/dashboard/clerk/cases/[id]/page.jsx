"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCaseById, createDefendantAccount } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, FileText, Download, User, Calendar, Scale, 
  Loader2, UserPlus, Mail, Phone, CheckCircle, XCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reviewCase } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const BACKEND_URL = "http://127.0.0.1:8000";

const STATUS_STYLES = {
 PENDING_REVIEW: "bg-amber-500/10 text-amber-600",
 APPROVED: "bg-blue-500/10 text-blue-600",
 PAID: "bg-teal-500/10 text-teal-600",
 ASSIGNED: "bg-indigo-500/10 text-indigo-600",
 IN_PROGRESS: "bg-purple-500/10 text-purple-600",
 CLOSED: "bg-slate-500/10 text-muted-foreground",
};

function getFileUrl(filePath) {
 if (!filePath) return null;
 if (filePath.startsWith("http")) return filePath;
 return `${BACKEND_URL}${filePath}`;
}

export default function ClerkCaseDetailPage() {
 const { id } = useParams();
 const router = useRouter();
 const queryClient = useQueryClient();
 const { user: currentUser } = useAuthStore();
 const isStaff = ["CLERK", "REGISTRAR"].includes(currentUser?.role);

 // Create Defendant Account Modal State
 const [isDefendantOpen, setIsDefendantOpen] = useState(false);
 const [defendantForm, setDefendantForm] = useState({
 email: "",
 phone_number: "",
 first_name: "",
 last_name: "",
 });

 // Decision Section State
 const [reviewAction, setReviewAction] = useState(""); // "accept" or "reject"
 const [rejectionReason, setRejectionReason] = useState("");
 const [courtName, setCourtName] = useState("");
 const [courtRoom, setCourtRoom] = useState("");

 const { data: caseData, isLoading, isError } = useQuery({
 queryKey: ["case-detail", id],
 queryFn: () => fetchCaseById(id),
 enabled: !!id,
 });

 const defendantMutation = useMutation({
 mutationFn: ({ caseId, data }) => createDefendantAccount(caseId, data),
 onSuccess: () => {
 queryClient.invalidateQueries(["case-detail", id]);
 setIsDefendantOpen(false);
 setDefendantForm({ email: "", phone_number: "", first_name: "", last_name: "" });
 toast.success("Defendant account created and linked.");
 },
 onError: (err) => toast.error(err.message || "Failed to create defendant account")
 });

 const reviewMutation = useMutation({
 mutationFn: ({ caseId, action, rejection_reason, court_name, court_room }) => 
 reviewCase(caseId, { action, rejection_reason, court_name, court_room }),
 onSuccess: () => {
 queryClient.invalidateQueries(["case-detail", id]);
 queryClient.invalidateQueries(["clerk-pendingIntake"]);
 queryClient.invalidateQueries(["clerk-cases"]);
 setReviewAction("");
 setRejectionReason("");
 setCourtName("");
 setCourtRoom("");
 toast.success("Case review submitted.");
 },
 onError: (err) => toast.error(err.message || "Failed to submit review")
 });

 const handleDefendantClick = () => {
 if (!caseData) return;
 setDefendantForm({
 email: "",
 phone_number: "",
 first_name: caseData.defendant_name?.split(' ')[0] || "",
 last_name: caseData.defendant_name?.split(' ').slice(1).join(' ') || "",
 });
 setIsDefendantOpen(true);
 };

 if (isLoading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Loading case details...</p>
 </div>
 );
 }

 if (isError || !caseData) {
 return (
 <div className="space-y-4 p-6 animate-fade-up">
 <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
 <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
 </Button>
 <Card className="bg-card shadow-sm border-border border-destructive/30">
 <CardContent className="p-12 text-center space-y-3">
 <div className="h-16 w-16 rounded-[2rem] bg-destructive/10 flex items-center justify-center mx-auto">
 <FileText className="h-8 w-8 text-destructive" />
 </div>
 <p className="text-destructive font-bold">Failed to load case details. The case may not exist or you may not have permission.</p>
 </CardContent>
 </Card>
 </div>
 );
 }

 const documents = caseData.documents || [];

 return (
 <div className="space-y-8 max-w-5xl mx-auto animate-fade-up">
 {/* Back Button */}
 <Button variant="outline" className="rounded-xl border-border hover:bg-primary/10 hover:text-primary transition-all" onClick={() => router.back()}>
 <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cases
 </Button>

 {/* Case Header */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8">
 <div className="flex items-start justify-between">
 <div className="space-y-2">
 <CardTitle className="text-3xl font-black font-display tracking-tight flex items-center gap-3">
 <Scale className="h-7 w-7 text-primary" />
 {caseData.title}
 </CardTitle>
 <CardDescription className="font-medium text-base">
 File Number: <span className="font-mono font-black text-foreground">{caseData.file_number || "PENDING"}</span>
 </CardDescription>
 </div>
 <Badge className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-none", STATUS_STYLES[caseData.status] || "bg-muted/50 text-muted-foreground")}>
 {caseData.status_display || caseData.status}
 </Badge>
 </div>
 </CardHeader>
 <Separator className="bg-muted/30" />
 <CardContent className="p-8 space-y-8">
 <div className="grid gap-8 md:grid-cols-2">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-1.5">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
 <p className="text-sm font-bold">{caseData.category_name || caseData.category?.name || "—"}</p>
 </div>
 <div className="space-y-1.5">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Priority</p>
 <p className="text-sm font-bold">{caseData.priority_display || caseData.priority || "—"}</p>
 </div>
 <div className="space-y-1.5">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filed By</p>
 <div className="flex items-center gap-2">
 <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
 <User className="h-3.5 w-3.5" />
 </div>
 <p className="text-sm font-bold truncate">{caseData.client_name || caseData.created_by?.first_name || "Unknown"}</p>
 </div>
 </div>
 <div className="space-y-1.5">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filing Date</p>
 <div className="flex items-center gap-2">
 <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
 <Calendar className="h-3.5 w-3.5" />
 </div>
 <p className="text-sm font-bold">{caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : "—"}</p>
 </div>
 </div>
 </div>

 {/* Defendant Management Section */}
 <div className="bg-muted/30 rounded-2xl p-5 border border-border space-y-4">
 {(!caseData.defendant || caseData.defendant === "PENDING_DEFENDANT") ? (
 <>
 <div className="space-y-1.5">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Claimed Defendant (Filing)</p>
 <p className="text-sm font-bold">{caseData.defendant_name || "—"}</p>
 </div>
 <Separator className="bg-muted/30" />
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Linked System Account</p>
 </div>
 <div className="flex items-center gap-3">
 <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
 <UserPlus className="h-5 w-5" />
 </div>
 <div className="flex flex-col">
 <p className="text-sm font-bold text-amber-400 italic">Account Required</p>
 {isStaff && (
 <Button 
 size="sm" 
 variant="link" 
 className="h-auto p-0 text-xs font-bold text-primary hover:text-primary/70 justify-start mt-0.5"
 onClick={handleDefendantClick}
 >
 Setup System Account
 </Button>
 )}
 </div>
 </div>
 </div>
 </>
 ) : (
 <>
 <div className="space-y-1.5">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Defendant Name</p>
 <div className="flex items-center gap-2">
 <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
 <User className="h-3.5 w-3.5" />
 </div>
 <p className="text-sm font-bold">{caseData.defendant?.first_name} {caseData.defendant?.last_name || ""}</p>
 </div>
 </div>
 <Separator className="bg-muted/30" />
 <div className="space-y-1.5 pb-1">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Address</p>
 <p className="text-sm font-medium leading-relaxed italic text-muted-foreground">
 {caseData.defendant?.address || "No address on file"}
 </p>
 </div>
 </>
 )}
 </div>
 </div>

 {caseData.description && (
 <div className="space-y-2 pt-2">
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</p>
 <p className="text-sm font-medium leading-relaxed bg-muted/20 p-5 rounded-xl border border-border">{caseData.description}</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Documents Section */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8">
 <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
 <FileText className="h-5 w-5 text-primary" />
 Uploaded Documents
 <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black h-6 px-2">{documents.length}</Badge>
 </CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Documents uploaded by the citizen during case registration.</CardDescription>
 </CardHeader>
 <Separator className="bg-muted/30" />
 <CardContent className="p-8">
 {documents.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 space-y-4">
 <div className="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center -rotate-6 border border-border shadow-inner">
 <FileText className="h-10 w-10 text-muted-foreground/20" />
 </div>
 <p className="text-lg font-bold text-muted-foreground">No documents were uploaded for this case.</p>
 </div>
 ) : (
 <div className="grid gap-3">
 {documents.map((doc, i) => {
 const latestVersion = doc.versions?.[0];
 const fileUrl = getFileUrl(latestVersion?.file || latestVersion?.file_url);

 return (
 <div key={doc.document_id || doc.id || i} className="flex items-center justify-between p-5 border border-border rounded-xl hover:bg-muted/30 transition-colors group">
 <div className="flex items-center gap-4 overflow-hidden">
 <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transform group-hover:-rotate-6 transition-transform duration-500">
 <FileText className="h-6 w-6 text-primary" />
 </div>
 <div className="flex flex-col truncate">
 <span className="text-sm font-bold">{doc.document_type || "Document"}</span>
 {latestVersion?.file_name && (
 <span className="text-xs text-muted-foreground truncate font-medium">{latestVersion.file_name}</span>
 )}
 {latestVersion?.size_display && (
 <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{latestVersion.size_display}</span>
 )}
 </div>
 </div>

 <div className="flex items-center gap-2 shrink-0 ml-4">
 {latestVersion?.status && (
 <Badge className="bg-muted/50 text-muted-foreground border-none text-[9px] font-black uppercase tracking-widest">
 {latestVersion.status_display || latestVersion.status}
 </Badge>
 )}
 {fileUrl ? (
 <Button variant="outline" size="sm" asChild className="rounded-xl border-border hover:bg-primary/10 hover:text-primary transition-all">
 <a href={fileUrl} target="_blank" rel="noopener noreferrer">
 <Download className="h-4 w-4 mr-2" /> View
 </a>
 </Button>
 ) : (
 <Button variant="outline" size="sm" disabled className="rounded-xl">
 No File
 </Button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Decision Section */}
 {isStaff && caseData.status === "PENDING_REVIEW" && (
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
 <CardHeader className="p-8 border-b border-border bg-muted/10">
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
 <Scale className="h-5 w-5 text-primary" />
 Intake Decision
 </CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Review the filing and make a final decision to accept or reject.</CardDescription>
 </div>
 <Badge className="bg-amber-500/20 text-amber-600 border-none text-[10px] font-black h-6 px-2 uppercase tracking-widest">Awaiting Action</Badge>
 </div>
 </CardHeader>
 <CardContent className="p-8 space-y-6">
 {!reviewAction ? (
 <div className="flex gap-4">
 <Button 
 className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95" 
 onClick={() => setReviewAction("accept")}
 >
 <CheckCircle className="mr-2 h-5 w-5" /> Accept Filing
 </Button>
 <Button 
 variant="outline" 
 className="flex-1 h-14 rounded-2xl border-rose-500/20 text-rose-500 hover:bg-rose-500/10 font-black text-xs uppercase tracking-widest transition-all active:scale-95" 
 onClick={() => setReviewAction("reject")}
 >
 <XCircle className="mr-2 h-5 w-5" /> Reject Filing
 </Button>
 </div>
 ) : reviewAction === "accept" ? (
 <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Court Name</label>
 <Input 
 placeholder="e.g. Federal High Court" 
 value={courtName} 
 onChange={(e) => setCourtName(e.target.value)} 
 className="rounded-xl bg-muted/30 h-12 border-border focus:ring-emerald-500/20" 
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Room/Bench</label>
 <Input 
 placeholder="e.g. Bench 04" 
 value={courtRoom} 
 onChange={(e) => setCourtRoom(e.target.value)} 
 className="rounded-xl bg-muted/30 h-12 border-border focus:ring-emerald-500/20" 
 />
 </div>
 </div>
 <div className="flex gap-4">
 <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setReviewAction("")}>Cancel</Button>
 <Button 
 className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20"
 onClick={() => reviewMutation.mutate({ 
 caseId: id, 
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
 ) : (
 <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Rejection Reason <span className="text-rose-500">*</span></label>
 <Textarea 
 placeholder="Detail why this filing is being rejected..." 
 value={rejectionReason} 
 onChange={(e) => setRejectionReason(e.target.value)} 
 className="rounded-xl bg-muted/30 min-h-[120px] border-border focus:ring-rose-500/20" 
 />
 </div>
 <div className="flex gap-4">
 <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setReviewAction("")}>Cancel</Button>
 <Button 
 className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20"
 onClick={() => reviewMutation.mutate({ 
 caseId: id, 
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
 </CardContent>
 </Card>
 )}

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
 <DialogDescription className="text-muted-foreground font-medium">
 Create and link a defendant account for <span className="font-bold text-foreground">{caseData?.title}</span>. An activation OTP will be sent to the provided email.
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
 <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">First Name *</label>
 <Input
 placeholder="First name"
 value={defendantForm.first_name}
 onChange={(e) => setDefendantForm({...defendantForm, first_name: e.target.value})}
 className="h-11 bg-background border-border rounded-xl"
 disabled={defendantMutation.isPending}
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Last Name *</label>
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
 <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
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
 <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
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
 onClick={() => defendantMutation.mutate({ caseId: id, data: defendantForm })}
 disabled={!defendantForm.email || !defendantForm.phone_number || !defendantForm.first_name || !defendantForm.last_name || defendantMutation.isPending}
 className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
 >
 {defendantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {defendantMutation.isPending ? "Creating..." : "Create Account"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
