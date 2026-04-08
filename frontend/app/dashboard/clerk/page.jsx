"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPendingCases, fetchCases, reviewCase, fetchTransactions } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { statusColors } from "@/lib/mock-data";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FileCheck, XCircle, Eye, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

const STATUS_LABELS = {
    PENDING_REVIEW: "Pending Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PAID: "Paid",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In Progress",
    CLOSED: "Closed",
};

export default function ClerkDashboard() {
    const queryClient = useQueryClient();
    const [selectedCase, setSelectedCase] = useState(null);
    const [dialogAction, setDialogAction] = useState(null); // 'accept' | 'reject'
    const [rejectionReason, setRejectionReason] = useState("");
    const [courtName, setCourtName] = useState("");
    const [actionError, setActionError] = useState("");

    // Fetch pending cases from the dedicated endpoint
    const { data: pendingCases, isLoading: loadingPending } = useQuery({
        queryKey: ["clerk-pending-cases"],
        queryFn: () => fetchPendingCases(),
    });

    // Fetch all cases for overview counts
    const { data: allCases, isLoading: loadingAll } = useQuery({
        queryKey: ["clerk-all-cases"],
        queryFn: () => fetchCases(),
    });

    const { data: payments, isLoading: loadingPayments } = useQuery({
        queryKey: ["clerk-payments"],
        queryFn: () => fetchTransactions(),
    });

    const reviewMutation = useMutation({
        mutationFn: ({ caseId, data }) => reviewCase(caseId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["clerk-pending-cases"]);
            queryClient.invalidateQueries(["clerk-all-cases"]);
            setSelectedCase(null);
            setDialogAction(null);
            setRejectionReason("");
            setCourtName("");
            setActionError("");
        },
        onError: (error) => {
            setActionError(error.message || "Action failed. Please try again.");
        },
    });

    const handleAction = (c, action) => {
        setSelectedCase(c);
        setDialogAction(action);
        setActionError("");
        setRejectionReason("");
        setCourtName("");
    };

    const confirmAction = () => {
        if (!selectedCase) return;

        if (dialogAction === "accept") {
            if (!courtName.trim()) {
                setActionError("Court name is required to accept a case.");
                return;
            }
            reviewMutation.mutate({
                caseId: selectedCase.id,
                data: { action: "accept", court_name: courtName },
            });
        } else if (dialogAction === "reject") {
            if (!rejectionReason.trim()) {
                setActionError("Rejection reason is required.");
                return;
            }
            reviewMutation.mutate({
                caseId: selectedCase.id,
                data: { action: "reject", rejection_reason: rejectionReason },
            });
        }
    };

    // Count stats
    const approvedCount = allCases?.filter(c => c.status === "APPROVED").length || 0;
    const paidCount = allCases?.filter(c => c.status === "PAID").length || 0;
    const activeCount = allCases?.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(c.status)).length || 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Case Review Queue</h1>
                <p className="text-muted-foreground">Review incoming case filings, accept or reject them.</p>
            </div>

            {/* Status Overview Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card className="bg-yellow-50/50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-yellow-600" />
                            Pending Review
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCases?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                            Awaiting Payment
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedCount}</div>
                    </CardContent>
                </Card>
                <Card className="bg-teal-50/50 border-teal-100 dark:bg-teal-900/10 dark:border-teal-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-teal-600" />
                            Paid
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{paidCount}</div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-green-600" />
                            Active Cases
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="pending">Case Review</TabsTrigger>
                    <TabsTrigger value="payments">Payments ({payments?.filter(p => p.status === 'PENDING').length || 0})</TabsTrigger>
                    <TabsTrigger value="all">All Cases</TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Registrations</CardTitle>
                            <CardDescription>Cases awaiting your review. Accept to proceed with payment, or reject with a reason.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingPending ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>File #</TableHead>
                                                <TableHead>Case Title</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Fee</TableHead>
                                                <TableHead>Filed On</TableHead>
                                                <TableHead>Filed By</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingCases && pendingCases.length > 0 ? (
                                                pendingCases.map((c) => (
                                                    <TableRow key={c.id}>
                                                        <TableCell className="font-mono text-xs">{c.file_number || "—"}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{c.title}</span>
                                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{c.description}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs">{c.category?.name || "—"}</TableCell>
                                                        <TableCell className="text-xs font-medium">{c.category?.fee || c.category_fee || 0} ETB</TableCell>
                                                        <TableCell className="text-xs">
                                                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {c.created_by?.first_name ? `${c.created_by.first_name} ${c.created_by.last_name || ""}`.trim() : c.created_by?.email || "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={statusColors[c.status] || "bg-gray-100 text-gray-800"}>
                                                                {STATUS_LABELS[c.status] || c.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                                        <span className="sr-only">Open menu</span>
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => handleAction(c, "accept")}>
                                                                        <FileCheck className="mr-2 h-4 w-4 text-green-600" /> Accept Case
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleAction(c, "reject")}>
                                                                        <XCircle className="mr-2 h-4 w-4 text-red-600" /> Reject Case
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                                        No pending cases found. All caught up! 🎉
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payments</CardTitle>
                            <CardDescription>View all incoming payments. Payments automatically trigger case assignment upon submission.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingPayments ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>File #</TableHead>
                                                <TableHead>Case Title</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Reference</TableHead>
                                                <TableHead>Submitted By</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Verification Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payments && payments.length > 0 ? (
                                                payments.map((p) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="font-mono text-xs">{p.case_file_number || "—"}</TableCell>
                                                        <TableCell className="text-xs font-medium max-w-[200px] truncate">{p.case_title || "—"}</TableCell>
                                                        <TableCell className="text-xs font-bold">{p.amount} ETB</TableCell>
                                                        <TableCell className="font-mono text-xs text-muted-foreground">{p.transaction_reference}</TableCell>
                                                        <TableCell className="text-xs">{p.sender_name || p.user_name}</TableCell>
                                                        <TableCell className="text-xs">{new Date(p.transaction_date || p.created_at).toLocaleDateString()}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={p.status === 'VERIFIED' ? 'default' : p.status === 'FAILED' ? 'destructive' : 'secondary'}
                                                                className={p.status === 'VERIFIED' ? 'bg-green-100 text-green-800' : ''}>
                                                                {p.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                        No payments found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Cases Master List</CardTitle>
                            <CardDescription>Comprehensive view of all cases and their current status.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingAll ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>File #</TableHead>
                                                <TableHead>Case Title</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Filed On</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allCases && allCases.length > 0 ? (
                                                allCases.map((c) => (
                                                    <TableRow key={c.id}>
                                                        <TableCell className="font-mono text-xs">{c.file_number || "—"}</TableCell>
                                                        <TableCell className="text-xs max-w-[250px] truncate">{c.title}</TableCell>
                                                        <TableCell className="text-xs">{c.category?.name || c.category || "—"}</TableCell>
                                                        <TableCell className="text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</TableCell>
                                                        <TableCell>
                                                            <Badge className={statusColors[c.status] || "bg-gray-100 text-gray-800"}>
                                                                {STATUS_LABELS[c.status] || c.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="outline" size="sm" asChild>
                                                                <Link href={`/dashboard/clerk/cases/${c.id}`} className="flex items-center">
                                                                    <Eye className="mr-2 h-4 w-4" /> View Docs
                                                                </Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                        No cases found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Accept / Reject Dialog */}
            <Dialog open={!!selectedCase} onOpenChange={(open) => { if (!open) { setSelectedCase(null); setActionError(""); } }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {dialogAction === "accept" ? (
                                <><FileCheck className="h-5 w-5 text-green-600" /> Accept Case</>
                            ) : (
                                <><XCircle className="h-5 w-5 text-red-600" /> Reject Case</>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {dialogAction === "accept"
                                ? `Accepting "${selectedCase?.title}" will set it to Approved and notify the client to make payment.`
                                : `Please provide a reason for rejecting "${selectedCase?.title}". This will be visible to the filer.`}
                        </DialogDescription>
                    </DialogHeader>

                    {actionError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{actionError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="py-4 space-y-4">
                        {dialogAction === "accept" && (
                            <div className="space-y-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 flex justify-between items-center">
                                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Required Payment Fee</span>
                                    <span className="font-bold text-blue-700 dark:text-blue-400">
                                        {selectedCase?.category?.fee || selectedCase?.category_fee || 0} ETB
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="court_name">Court Name *</Label>
                                    <Input
                                        id="court_name"
                                        value={courtName}
                                        onChange={(e) => setCourtName(e.target.value)}
                                        placeholder="e.g. Addis Ababa Federal Court"
                                    />
                                </div>
                            </div>
                        )}
                        {dialogAction === "reject" && (
                            <div className="space-y-2">
                                <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                                <Textarea
                                    id="rejection_reason"
                                    placeholder="Explain why this case is being rejected..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={4}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setSelectedCase(null); setActionError(""); }}>Cancel</Button>
                        <Button
                            variant={dialogAction === "reject" ? "destructive" : "default"}
                            onClick={confirmAction}
                            disabled={reviewMutation.isPending}
                            className={dialogAction === "accept" ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                            {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {dialogAction === "accept" ? "Accept Case" : "Reject Case"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
