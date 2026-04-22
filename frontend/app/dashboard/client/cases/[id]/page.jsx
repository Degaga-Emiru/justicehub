"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCaseById, fetchCaseTimeline, initiatePayment, submitPayment } from "@/lib/api";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";

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
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Gathering Case Records...</p>
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
                <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5" onClick={() => router.push('/dashboard/client/cases')}>
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
                <Alert className="border-emerald-500/20 bg-emerald-500/10 glass animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <AlertDescription className="text-emerald-500 font-bold ml-2">{paymentSuccess}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Case File - Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-3">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] px-2 mb-1 border-primary/30 text-primary">
                                        Plaintiff Record
                                    </Badge>
                                    <CardTitle className="text-3xl font-black font-display tracking-tight text-white">{caseData.title}</CardTitle>
                                    <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground pt-1">
                                        <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" /> {caseData.file_number || "Draft No: " + caseData.id}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" /> Registered {format(new Date(caseData.created_at || caseData.filing_date), "MMM d, yyyy")}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border-none shadow-lg", statusColors[caseData.status])}>
                                        {STATUS_LABELS[caseData.status] || caseData.status}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <Separator className="bg-white/5" />
                        <CardContent className="p-8 space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-2">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
                                    <p className="text-sm font-bold text-white">{caseData.category?.name || caseData.category || "General"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Case Priority</p>
                                    <Badge variant="outline" className="text-[10px] font-black border-white/10 uppercase tracking-tighter bg-white/5">{caseData.priority}</Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Court assigned</p>
                                    <p className="text-sm font-bold text-white truncate">{caseData.court_name || "Lideta Federal Court"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Processing Fee</p>
                                    <p className="text-sm font-black text-primary">{caseData.category?.fee || caseData.category_fee || "0"} ETB</p>
                                </div>
                            </div>

                            <Separator className="bg-white/5" />

                            <div className="space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
                                    <FileText className="h-4 w-4" /> Brief Description
                                </h3>
                                <p className="text-sm font-medium leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/5 text-slate-300">
                                    {caseData.description || "No description provided."}
                                </p>
                            </div>

                            {/* Documents */}
                            <div className="space-y-5">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2 pt-4">
                                    <Download className="h-4 w-4" /> Supporting Evidence
                                </h3>
                                <div className="grid gap-3">
                                    {caseData.documents?.length > 0 ? (
                                        caseData.documents.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-background/40 hover:bg-white/5 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                        <FileText className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold truncate max-w-[200px]">{doc.description || doc.document_type}</span>
                                                        <span className="text-[10px] font-black text-muted-foreground uppercase">{doc.document_type}</span>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" className="h-9 px-3 font-bold text-xs hover:text-primary">
                                                    <Download className="h-4 w-4 mr-2" /> Download
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs italic text-muted-foreground border-white/5 border border-dashed rounded-xl p-6 text-center">No evidentiary files recorded for this filing.</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline */}
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
                                <History className="h-5 w-5 text-primary" />
                                Filing Timeline & Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            {timelineLoading ? (
                                <div className="space-y-4 animate-pulse">
                                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl" />)}
                                </div>
                            ) : timeline?.length > 0 ? (
                                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-white/10">
                                    {timeline.map((event, idx) => (
                                        <div key={idx} className="relative flex items-center gap-6 group">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0f172a] bg-primary/20 text-primary shadow shrink-0 z-10 transition-all group-hover:scale-110">
                                                <CheckCircle className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 p-5 rounded-2xl border border-white/5 bg-background/50 group-hover:bg-white/5 transition-colors">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                    <h4 className="font-bold text-sm text-white">{event.title || event.event_type}</h4>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{format(new Date(event.date), "PPP")}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{event.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm italic text-muted-foreground text-center py-10">Waiting for judicial action to populate timeline...</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info - Right Column */}
                <div className="space-y-8">
                    {/* User Info Card */}
                    <Card className="glass-card border-white/5 overflow-hidden">
                        <CardHeader className="p-6 pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Case Involvement</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest w-fit">
                                    You (Plaintiff)
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-black text-primary">{user?.name?.charAt(0)}</div>
                                    <div className="flex flex-col truncate">
                                        <p className="font-bold text-sm">{user?.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase truncate">{user?.email}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <Separator className="bg-white/5" />

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest w-fit">
                                    Defendant
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center font-black text-rose-500">{(caseData.defendant_name || "D").charAt(0)}</div>
                                    <div className="flex flex-col truncate">
                                        <p className="font-bold text-sm truncate">{caseData.defendant_name || "Pending Account"}</p>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">External Non-User</p>
                                    </div>
                                </div>
                                {caseData.defendant?.address && (
                                    <div className="flex items-start gap-2 p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
                                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">{caseData.defendant.address}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Court Info */}
                    <Card className="glass-card border-white/5 bg-primary/5">
                        <CardHeader className="p-6 pb-2">
                             <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Scale className="h-4 w-4" /> Judicial Information
                             </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="p-4 rounded-xl bg-background/50 border border-white/5 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <Gavel className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase leading-none">Judge Assigned</p>
                                    <p className="text-sm font-bold mt-1 text-white truncate">{caseData.judge_name || "Honorable Justice"}</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-background/50 border border-white/5 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <History className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase leading-none">Current Phase</p>
                                    <p className="text-sm font-bold mt-1 text-white">{STATUS_LABELS[caseData.status] || "Filing Approval"}</p>
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
                        <DialogDescription className="text-muted-foreground font-medium">Please select a payment method for case: <span className="text-foreground font-bold">{caseData?.title}</span></DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-5">
                         <div className="flex justify-between items-center p-5 bg-primary/10 rounded-2xl border border-primary/20">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Fee</span>
                            <span className="text-2xl font-black font-display text-primary">{caseData?.category?.fee || caseData?.category_fee || 0} <span className="text-sm font-bold">ETB</span></span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("chapa")}
                                className={cn(
                                    "p-4 rounded-2xl border-2 text-left transition-all duration-300 space-y-1.5",
                                    paymentMethod === "chapa" ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10" : "border-white/10 bg-muted/20 hover:border-white/20"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <CreditCard className={cn("h-5 w-5", paymentMethod === "chapa" ? "text-emerald-500" : "text-slate-400")} />
                                    <span className="font-black text-sm">Chapa Pay</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground font-medium">Instant online (Visa/MC/M-Pesa)</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("bank")}
                                className={cn(
                                    "p-4 rounded-2xl border-2 text-left transition-all duration-300 space-y-1.5",
                                    paymentMethod === "bank" ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10" : "border-white/10 bg-muted/20 hover:border-white/20"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Banknote className={cn("h-5 w-5", paymentMethod === "bank" ? "text-blue-500" : "text-slate-400")} />
                                    <span className="font-black text-sm">Bank Transfer</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground font-medium">Digital receipt verification</p>
                            </button>
                        </div>

                        {paymentMethod === "bank" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reference Number *</Label>
                                    <Input 
                                        placeholder="Enter bank transaction ID" 
                                        className="h-11 bg-background/50 border-white/20 rounded-xl"
                                        value={paymentForm.transaction_reference}
                                        onChange={(e) => setPaymentForm({...paymentForm, transaction_reference: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account Holder Name *</Label>
                                    <Input 
                                        placeholder="Full name on bank account" 
                                        className="h-11 bg-background/50 border-white/20 rounded-xl"
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

import Link from "next/link";
