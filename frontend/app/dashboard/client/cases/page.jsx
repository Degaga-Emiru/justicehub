"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCases, submitPayment } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { statusColors } from "@/lib/mock-data";
import { Eye, CreditCard, CheckCircle, AlertTriangle, XCircle, FileText, Scale, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/components/language-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
    PENDING_REVIEW: "Pending Review",
    APPROVED: "Awaiting Payment",
    REJECTED: "Rejected",
    PAID: "Paid",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In Progress",
    CLOSED: "Closed",
};

const STATUS_STYLES = {
    PENDING_REVIEW: "bg-amber-500/10 text-amber-600",
    APPROVED: "bg-blue-500/10 text-blue-600",
    REJECTED: "bg-rose-500/10 text-rose-600",
    PAID: "bg-teal-500/10 text-teal-600",
    ASSIGNED: "bg-indigo-500/10 text-indigo-600",
    IN_PROGRESS: "bg-purple-500/10 text-purple-600",
    CLOSED: "bg-slate-500/10 text-slate-500",
};

export default function ClientCasesPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedCase, setSelectedCase] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        transaction_reference: "",
        sender_name: "",
        bank_name: "",
        transaction_date: new Date().toISOString().split("T")[0],
    });
    const [paymentError, setPaymentError] = useState("");
    const { t } = useLanguage();

    const { data: cases, isLoading: isLoadingCases } = useQuery({
        queryKey: ["client-cases", user?.id],
        queryFn: () => fetchCases(),
        enabled: !!user,
    });

    const [paymentSuccess, setPaymentSuccess] = useState("");

    const payMutation = useMutation({
        mutationFn: (data) => submitPayment(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries(["client-cases"]);
            setSelectedCase(null);
            setPaymentForm({ transaction_reference: "", sender_name: "", bank_name: "", transaction_date: new Date().toISOString().split("T")[0] });
            setPaymentError("");
            setPaymentSuccess(response?.message || "Bank transfer details submitted! A registrar will verify your payment.");
            setTimeout(() => setPaymentSuccess(""), 8000);
        },
        onError: (error) => {
            setPaymentError(error.message || "Payment submission failed");
        },
    });

    const handlePayClick = (caseItem) => {
        setSelectedCase(caseItem);
        setPaymentError("");
    };

    const confirmPayment = () => {
        if (!selectedCase) return;
        if (!paymentForm.transaction_reference || !paymentForm.sender_name || !paymentForm.bank_name) {
            setPaymentError("Please fill in all required fields.");
            return;
        }
        payMutation.mutate({
            case_id: selectedCase.id,
            amount: parseFloat(selectedCase.category?.fee || selectedCase.category_fee || 0),
            transaction_reference: paymentForm.transaction_reference,
            sender_name: paymentForm.sender_name,
            bank_name: paymentForm.bank_name,
            transaction_date: paymentForm.transaction_date,
            payment_method: "BANK_TRANSFER",
        });
    };

    const allCases = cases || [];
    const needsAction = allCases.filter(c => ["APPROVED", "REJECTED"].includes(c.status));
    const activeCases = allCases.filter(c => ["PAID", "ASSIGNED", "IN_PROGRESS"].includes(c.status));

    return (
        <div className="space-y-10 animate-fade-up">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black font-display tracking-tight text-foreground">{t("myCasesTitle")}</h1>
                    <p className="text-muted-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        {t("myCasesSubtitle")}
                    </p>
                </div>
            </div>

            {paymentSuccess && (
                <Alert className="border-emerald-500/20 bg-emerald-500/10 glass animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-700 dark:text-emerald-300 font-bold">{paymentSuccess}</AlertDescription>
                </Alert>
            )}

            {/* Tabs */}
            <Tabs defaultValue="all" className="w-full space-y-8">
                <TabsList className="h-14 p-1.5 bg-muted/30 border border-white/5 rounded-2xl glass backdrop-blur-xl w-full lg:max-w-xl mx-auto flex">
                    <TabsTrigger value="all" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                        All Cases
                    </TabsTrigger>
                    <TabsTrigger value="action" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 relative gap-2">
                        Needs Action
                        {needsAction.length > 0 && (
                            <Badge className="bg-rose-500/20 text-rose-600 border-none text-[10px] font-black h-5 px-1.5">{needsAction.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="active" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                        Active
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-2xl font-black font-display tracking-tight">{t("cardFilingsTitle")}</CardTitle>
                            <CardDescription className="text-muted-foreground font-medium">{t("cardFilingsDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingCases ? (
                                <div className="p-8 space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
                                </div>
                            ) : (
                                <CaseTable data={allCases} onPayClick={handlePayClick} t={t} emptyMessage={t("emptyFilings")} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="action" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="glass-card border-amber-500/20 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black font-display tracking-tight">Cases Needing Action</CardTitle>
                                    <CardDescription className="text-muted-foreground font-medium">Cases that require payment or have been rejected.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingCases ? (
                                <div className="p-8 space-y-4">
                                    {[1, 2].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
                                </div>
                            ) : (
                                <CaseTable data={needsAction} onPayClick={handlePayClick} t={t} emptyMessage="No cases need attention right now." />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="active" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="glass-card border-emerald-500/20 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black font-display tracking-tight">Active Cases</CardTitle>
                                    <CardDescription className="text-muted-foreground font-medium">Cases currently assigned and in progress.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingCases ? (
                                <div className="p-8 space-y-4">
                                    {[1, 2].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
                                </div>
                            ) : (
                                <CaseTable data={activeCases} onPayClick={handlePayClick} t={t} emptyMessage="No active cases at the moment." />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Payment Dialog */}
            <Dialog open={!!selectedCase} onOpenChange={(open) => { if (!open) { setSelectedCase(null); setPaymentError(""); } }}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black font-display">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            Submit Payment
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium">
                            Submit your bank transfer details for case: <span className="font-bold text-foreground">{selectedCase?.title}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-5">
                        <div className="flex justify-between items-center p-5 bg-gradient-to-r from-blue-500/10 to-primary/5 rounded-2xl border border-blue-500/20">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Required Fee</span>
                            <span className="text-2xl font-black font-display text-blue-600">{selectedCase?.category?.fee || selectedCase?.category_fee || 0} <span className="text-sm font-bold">ETB</span></span>
                        </div>

                        {paymentError && (
                            <Alert variant="destructive" className="glass border-destructive/50 animate-in fade-in slide-in-from-top-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="font-bold">{paymentError}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="sender_name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Sender Name *</Label>
                            <Input
                                id="sender_name"
                                value={paymentForm.sender_name}
                                onChange={(e) => setPaymentForm({ ...paymentForm, sender_name: e.target.value })}
                                placeholder="Full name on bank account"
                                className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bank_name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Bank Name *</Label>
                            <Input
                                id="bank_name"
                                value={paymentForm.bank_name}
                                onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                                placeholder="e.g. Commercial Bank of Ethiopia"
                                className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transaction_reference" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Transaction Reference *</Label>
                            <Input
                                id="transaction_reference"
                                value={paymentForm.transaction_reference}
                                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                                placeholder="Bank receipt/reference number"
                                className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transaction_date" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Transaction Date</Label>
                            <Input
                                id="transaction_date"
                                type="date"
                                value={paymentForm.transaction_date}
                                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_date: e.target.value })}
                                className="h-12 bg-background/50 border-white/20 rounded-xl focus:ring-primary/20 font-medium"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" className="rounded-xl" onClick={() => { setSelectedCase(null); setPaymentError(""); }}>{t("btnCancel")}</Button>
                        <Button
                            onClick={confirmPayment}
                            disabled={payMutation.isPending}
                            className="rounded-xl font-bold bg-gradient-to-r from-blue-600 to-primary hover:from-blue-500 hover:to-primary/90 text-white shadow-lg shadow-blue-500/20"
                        >
                            {payMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {payMutation.isPending ? "Submitting..." : "Submit Payment"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CaseTable({ data, onPayClick, emptyMessage = "No cases found.", t }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center -rotate-6 border border-white/5 shadow-inner">
                    <FileText className="h-10 w-10 text-muted-foreground/20" />
                </div>
                <p className="text-lg font-bold text-muted-foreground">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">File #</TableHead>
                        <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">{t("tblTitle")}</TableHead>
                        <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Category</TableHead>
                        <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Filed</TableHead>
                        <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">{t("tblStatus")}</TableHead>
                        <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">{t("tblActions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.id} className={cn(
                            "border-white/5 hover:bg-white/5 transition-colors group",
                            item.status === "REJECTED" && "bg-rose-500/5"
                        )}>
                            <TableCell className="font-mono text-xs font-bold text-muted-foreground pl-8">
                                {item.file_number || "—"}
                            </TableCell>
                            <TableCell className="py-6">
                                <div className="flex flex-col gap-1">
                                    <span className="font-black font-display text-sm tracking-tight group-hover:text-primary transition-colors">{item.title}</span>
                                    {item.status === "REJECTED" && item.rejection_reason && (
                                        <div className="flex items-start gap-1.5 text-xs text-rose-500 font-medium">
                                            <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                            <span className="italic">{item.rejection_reason}</span>
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.category?.name || "—"}</TableCell>
                            <TableCell className="text-xs font-bold">
                                {item.created_at ? new Date(item.created_at).toLocaleDateString() : item.filing_date ? new Date(item.filing_date).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                                <Badge className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none", STATUS_STYLES[item.status] || "bg-muted/50 text-muted-foreground")}>
                                    {STATUS_LABELS[item.status] || item.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-8">
                                <div className="flex justify-end gap-2">
                                    {item.status === "APPROVED" && (
                                        <Button
                                            size="sm"
                                            className="rounded-xl font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-blue-600 to-primary hover:from-blue-500 hover:to-primary/90 text-white shadow-lg shadow-blue-500/20"
                                            onClick={() => onPayClick(item)}
                                        >
                                            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Pay Fee
                                        </Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
