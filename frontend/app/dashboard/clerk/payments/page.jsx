"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTransactions, confirmPayment, confirmManualPayment } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Search, Filter, Loader2, AlertCircle, Eye, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RegistrarPaymentsPage() {
 const queryClient = useQueryClient();
 const [statusFilter, setStatusFilter] = useState("All");
 const [searchTerm, setSearchTerm] = useState("");

 // Verification Modal State
 const [isVerifyOpen, setIsVerifyOpen] = useState(false);
 const [selectedPayment, setSelectedPayment] = useState(null);
 const [manualTransactionId, setManualTransactionId] = useState("");
 const [manualNotes, setManualNotes] = useState("");
 const [verifyError, setVerifyError] = useState("");

 const { data: transactions = [], isLoading } = useQuery({
 queryKey: ["clerk-transactions", statusFilter],
 queryFn: () => fetchTransactions(statusFilter === "All" ? {} : { status: statusFilter }),
 });

 // Auto-verify (for Chapa)
 const verifyMutation = useMutation({
 mutationFn: (txRef) => confirmPayment(txRef),
 onSuccess: () => {
 queryClient.invalidateQueries(["clerk-transactions"]);
 setIsVerifyOpen(false);
 setSelectedPayment(null);
 },
 onError: (err) => setVerifyError(err.message || "Auto-verification failed.")
 });

 // Manual-verify (for Bank Transfer)
 const manualVerifyMutation = useMutation({
 mutationFn: (data) => confirmManualPayment(data),
 onSuccess: () => {
 queryClient.invalidateQueries(["clerk-transactions"]);
 setIsVerifyOpen(false);
 setSelectedPayment(null);
 setManualTransactionId("");
 setManualNotes("");
 },
 onError: (err) => setVerifyError(err.message || "Manual confirmation failed.")
 });

 const filteredTransactions = transactions.filter(t =>
 (t.case_file_number && t.case_file_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
 (t.tx_ref && t.tx_ref.toLowerCase().includes(searchTerm.toLowerCase())) ||
 (t.user_name && t.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
 (t.case_title && t.case_title.toLowerCase().includes(searchTerm.toLowerCase()))
 );

 const handleVerifyClick = (payment) => {
 setSelectedPayment(payment);
 setVerifyError("");
 setManualTransactionId("");
 setManualNotes("");
 setIsVerifyOpen(true);
 };

 const confirmVerification = () => {
 if (!selectedPayment) return;

 if (selectedPayment.payment_method === 'BANK_TRANSFER') {
 if (!manualTransactionId.trim()) {
 setVerifyError("Please enter the internal Bank Transaction ID.");
 return;
 }
 manualVerifyMutation.mutate({
 case_id: selectedPayment.case,
 amount: selectedPayment.amount,
 reference_number: selectedPayment.tx_ref,
 transaction_id: manualTransactionId.trim(),
 notes: manualNotes
 });
 } else {
 // Chapa or others
 verifyMutation.mutate(selectedPayment.tx_ref);
 }
 };

 return (
 <div className="space-y-6 p-6 animate-in fade-in duration-500">
 <div className="flex justify-between items-start">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">Payment Verification</h1>
 <p className="text-slate-300">Verify and manage fee payments for case filings.</p>
 </div>
 </div>

 <Card className="border-primary/10 shadow-sm">
 <CardHeader>
 <div className="flex flex-col md:flex-row justify-between gap-4">
 <div>
 <CardTitle className="flex items-center gap-2">
 <CreditCard className="h-5 w-5 text-primary" />
 Transaction History
 </CardTitle>
 <CardDescription>Review pending payments from clients.</CardDescription>
 </div>
 <div className="flex gap-2">
 <div className="relative w-full md:w-64">
 <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-300" />
 <Input
 placeholder="Search Case #, Payer, Ref..."
 className="pl-8"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-[150px]">
 <SelectValue placeholder="Status" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="All">All Statuses</SelectItem>
 <SelectItem value="PENDING">Pending</SelectItem>
 <SelectItem value="SUCCESS">Success</SelectItem>
 <SelectItem value="FAILED">Failed</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="space-y-2 py-4 text-center text-slate-300">
 <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
 Loading transactions...
 </div>
 ) : (
 <div className="rounded-md border overflow-hidden">
 <Table>
 <TableHeader className="bg-muted/50">
 <TableRow>
 <TableHead>Reference (tx_ref)</TableHead>
 <TableHead>Case #</TableHead>
 <TableHead>Case Title</TableHead>
 <TableHead>Payer</TableHead>
 <TableHead>Method</TableHead>
 <TableHead>Amount</TableHead>
 <TableHead>Date</TableHead>
 <TableHead>Status</TableHead>
 <TableHead className="text-right">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredTransactions.length > 0 ? (
 filteredTransactions.map((t) => (
 <TableRow key={t.id} className="hover:bg-muted/30">
 <TableCell className="font-mono text-xs font-medium">{t.tx_ref}</TableCell>
 <TableCell className="text-xs">{t.case_file_number || "PENDING"}</TableCell>
 <TableCell className="text-xs max-w-[150px] truncate">{t.case_title}</TableCell>
 <TableCell className="text-xs">{t.user_name}</TableCell>
 <TableCell>
 <Badge variant="outline" className="text-[10px] uppercase font-bold">
 {t.payment_method?.replace('_', ' ') || 'CHAPA'}
 </Badge>
 </TableCell>
 <TableCell className="font-semibold">{t.amount} ETB</TableCell>
 <TableCell className="text-xs">
 {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
 </TableCell>
 <TableCell>
 <Badge 
 variant={t.status === 'SUCCESS' ? 'default' : 'secondary'}
 className={t.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
 >
 {t.status}
 </Badge>
 </TableCell>
 <TableCell className="text-right">
 {t.status === 'PENDING' && (
 <Button
 size="sm"
 variant="default"
 className="bg-primary hover:bg-primary/90"
 onClick={() => handleVerifyClick(t)}
 >
 <CheckCircle className="mr-2 h-4 w-4" />
 Verify
 </Button>
 )}
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={9} className="h-24 text-center text-slate-300">
 No transactions found matching your filters.
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Verification Dialog */}
 <Dialog open={isVerifyOpen} onOpenChange={(open) => {
 if (!verifyMutation.isPending && !manualVerifyMutation.isPending) setIsVerifyOpen(open);
 }}>
 <DialogContent className="sm:max-w-[480px]">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <CheckCircle className="h-5 w-5 text-green-600" />
 Verify Payment
 </DialogTitle>
 <DialogDescription>
 Confirming this payment will mark the case as <strong>PAID</strong> and trigger judge assignment.
 </DialogDescription>
 </DialogHeader>

 {verifyError && (
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>{verifyError}</AlertDescription>
 </Alert>
 )}

 <div className="py-4 space-y-4">
 <div className="p-4 bg-muted/40 rounded-lg border space-y-2">
 <div className="flex justify-between text-sm">
 <span className="text-slate-300">Case Title:</span>
 <span className="font-medium text-right ml-4">{selectedPayment?.case_title}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-slate-300">Amount:</span>
 <span className="font-bold text-primary">{selectedPayment?.amount} ETB</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-slate-300">Client Ref:</span>
 <span className="font-mono font-medium">{selectedPayment?.tx_ref}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-slate-300">Method:</span>
 <Badge variant="outline">{selectedPayment?.payment_method || "CHAPA"}</Badge>
 </div>
 </div>

 {selectedPayment?.payment_method === 'BANK_TRANSFER' ? (
 <div className="space-y-3">
 <div className="space-y-2">
 <Label htmlFor="manual_tx_id">Internal Bank Transaction ID *</Label>
 <Input 
 id="manual_tx_id"
 placeholder="e.g. CBE-123456789"
 value={manualTransactionId}
 onChange={(e) => setManualTransactionId(e.target.value)}
 />
 <p className="text-[10px] text-slate-300">Enter the unique ID from your bank statement for auditing.</p>
 </div>
 <div className="space-y-2">
 <Label htmlFor="manual_notes">Internal Notes (Optional)</Label>
 <Textarea 
 id="manual_notes"
 placeholder="Add any verification details..."
 rows={2}
 value={manualNotes}
 onChange={(e) => setManualNotes(e.target.value)}
 />
 </div>
 </div>
 ) : (
 <p className="text-sm text-center py-2 px-4 bg-blue-50 text-blue-800 rounded-md border border-blue-100">
 This was an online transaction. Clicking verify will check the transaction status with the payment provider.
 </p>
 )}
 </div>

 <DialogFooter>
 <Button 
 variant="outline" 
 onClick={() => setIsVerifyOpen(false)}
 disabled={verifyMutation.isPending || manualVerifyMutation.isPending}
 >
 Cancel
 </Button>
 <Button
 onClick={confirmVerification}
 disabled={verifyMutation.isPending || manualVerifyMutation.isPending}
 className="bg-green-600 hover:bg-green-700 text-white"
 >
 {(verifyMutation.isPending || manualVerifyMutation.isPending) && (
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 )}
 Confirm Verification
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
