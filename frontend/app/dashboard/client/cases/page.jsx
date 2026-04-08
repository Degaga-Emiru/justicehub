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
import { Eye, CreditCard, CheckCircle, ShieldAlert, AlertTriangle, XCircle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/components/language-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STATUS_LABELS = {
    PENDING_REVIEW: "Pending Review",
    APPROVED: "Awaiting Payment",
    REJECTED: "Rejected",
    PAID: "Paid",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In Progress",
    CLOSED: "Closed",
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

    const payMutation = useMutation({
        mutationFn: (data) => submitPayment(data),
        onSuccess: () => {
            queryClient.invalidateQueries(["client-cases"]);
            setSelectedCase(null);
            setPaymentForm({ transaction_reference: "", sender_name: "", bank_name: "", transaction_date: new Date().toISOString().split("T")[0] });
            setPaymentError("");
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary">{t("myCasesTitle")}</h1>
                <p className="text-muted-foreground">{t("myCasesSubtitle")}</p>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
                    <TabsTrigger value="all">All Cases</TabsTrigger>
                    <TabsTrigger value="action" className="relative">
                        Needs Action
                        {allCases.filter(c => ["APPROVED", "REJECTED"].includes(c.status)).length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                    <Card className="border-primary/10 shadow-md">
                        <CardHeader>
                            <CardTitle>{t("cardFilingsTitle")}</CardTitle>
                            <CardDescription>{t("cardFilingsDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingCases ? (
                                <div className="text-center py-4">Loading cases...</div>
                            ) : (
                                <CaseTable
                                    data={allCases}
                                    onPayClick={handlePayClick}
                                    t={t}
                                    emptyMessage={t("emptyFilings")}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="action" className="mt-6">
                    <Card className="border-amber-200 shadow-md">
                        <CardHeader>
                            <div className="flex items-center gap-2 text-amber-700">
                                <AlertTriangle className="h-5 w-5" />
                                <CardTitle className="text-amber-700">Cases Needing Action</CardTitle>
                            </div>
                            <CardDescription>Cases that require payment or have been rejected.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingCases ? (
                                <div className="text-center py-4">Loading cases...</div>
                            ) : (
                                <CaseTable
                                    data={allCases.filter(c => ["APPROVED", "REJECTED"].includes(c.status))}
                                    onPayClick={handlePayClick}
                                    t={t}
                                    emptyMessage="No cases need attention right now."
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="active" className="mt-6">
                    <Card className="border-green-200 shadow-md">
                        <CardHeader>
                            <div className="flex items-center gap-2 text-green-700">
                                <CheckCircle className="h-5 w-5" />
                                <CardTitle className="text-green-700">Active Cases</CardTitle>
                            </div>
                            <CardDescription>Cases currently assigned and in progress.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingCases ? (
                                <div className="text-center py-4">Loading cases...</div>
                            ) : (
                                <CaseTable
                                    data={allCases.filter(c => ["PAID", "ASSIGNED", "IN_PROGRESS"].includes(c.status))}
                                    onPayClick={handlePayClick}
                                    t={t}
                                    emptyMessage="No active cases at the moment."
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Payment Dialog */}
            <Dialog open={!!selectedCase} onOpenChange={(open) => { if (!open) { setSelectedCase(null); setPaymentError(""); } }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            Submit Payment
                        </DialogTitle>
                        <DialogDescription>
                            Submit your bank transfer details for case: <strong>{selectedCase?.title}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                            <span className="font-medium">Required Fee:</span>
                            <span className="font-bold text-lg text-blue-700">{selectedCase?.category?.fee || selectedCase?.category_fee || 0} ETB</span>
                        </div>

                        {paymentError && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{paymentError}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="sender_name">Sender Name *</Label>
                            <Input
                                id="sender_name"
                                value={paymentForm.sender_name}
                                onChange={(e) => setPaymentForm({ ...paymentForm, sender_name: e.target.value })}
                                placeholder="Full name on bank account"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bank_name">Bank Name *</Label>
                            <Input
                                id="bank_name"
                                value={paymentForm.bank_name}
                                onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                                placeholder="e.g. Commercial Bank of Ethiopia"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transaction_reference">Transaction Reference *</Label>
                            <Input
                                id="transaction_reference"
                                value={paymentForm.transaction_reference}
                                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                                placeholder="Bank receipt/reference number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transaction_date">Transaction Date</Label>
                            <Input
                                id="transaction_date"
                                type="date"
                                value={paymentForm.transaction_date}
                                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setSelectedCase(null); setPaymentError(""); }}>{t("btnCancel")}</Button>
                        <Button onClick={confirmPayment} disabled={payMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
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
        return <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>File #</TableHead>
                    <TableHead>{t("tblTitle")}</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Filed</TableHead>
                    <TableHead>{t("tblStatus")}</TableHead>
                    <TableHead className="text-right">{t("tblActions")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((item) => (
                    <TableRow key={item.id} className={item.status === "REJECTED" ? "bg-red-50/50 dark:bg-red-900/5" : ""}>
                        <TableCell className="font-medium font-mono text-xs">
                            {item.file_number || "—"}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span>{item.title}</span>
                                {item.status === "REJECTED" && item.rejection_reason && (
                                    <div className="flex items-start gap-1 mt-1 text-xs text-destructive">
                                        <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                        <span>{item.rejection_reason}</span>
                                    </div>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-xs">{item.category?.name || "—"}</TableCell>
                        <TableCell className="text-xs">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : item.filing_date ? new Date(item.filing_date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[item.status] || "bg-gray-100 text-gray-800"}`}>
                                {STATUS_LABELS[item.status] || item.status}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                {item.status === "APPROVED" && (
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                        onClick={() => onPayClick(item)}
                                    >
                                        <CreditCard className="h-3 w-3 mr-1" /> Pay Fee
                                    </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
