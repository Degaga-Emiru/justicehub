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
import { cn } from "@/lib/utils";
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
        <div className="space-y-10 animate-fade-up">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Registry Command</h1>
                    <p className="text-muted-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Administrative review and oversight
                    </p>
                </div>
            </div>

            {/* Status Overview Cards - Premium Glass Edition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="glass-card hover:border-amber-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-amber-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Pending Review</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <FileText className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{pendingCases?.length || 0}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">Awaiting attention</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:border-blue-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Awaiting Payment</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{approvedCount}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">Approved pipeline</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:border-teal-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-teal-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Paid Assets</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                            <FileCheck className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{paidCount}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">Verified financial</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:border-emerald-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Active Lifecycle</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{activeCount}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">In judicial process</p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs - Modern Frosted Styled */}
            <Tabs defaultValue="pending" className="w-full space-y-8">
                <TabsList className="h-14 p-1.5 bg-muted/30 border border-white/5 rounded-2xl glass backdrop-blur-xl w-full lg:max-w-xl flex">
                    <TabsTrigger value="pending" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
                        Case Review
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
                        Payments ({payments?.filter(p => p.status === 'PENDING').length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="all" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
                        Case Index
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-2xl font-black font-display tracking-tight">Registration Queue</CardTitle>
                            <CardDescription className="text-muted-foreground font-medium">Verify incoming filings and proceed with procedural intake.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingPending ? (
                                <div className="p-8 space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-white/5">
                                            <TableRow className="border-white/5 hover:bg-transparent">
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">Entry #</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Case Profile</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Categorization</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Filing Info</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Lifecycle</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">Command</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingCases && pendingCases.length > 0 ? (
                                                pendingCases.map((c) => (
                                                    <TableRow key={c.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                        <TableCell className="font-mono text-xs font-bold text-muted-foreground pl-8">{c.file_number || "F-PENDING"}</TableCell>
                                                        <TableCell className="py-6">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-black font-display text-base tracking-tight group-hover:text-primary transition-colors">{c.title}</span>
                                                                <span className="text-xs font-medium text-muted-foreground/60 truncate max-w-[240px] italic">{c.description}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-xs font-black uppercase tracking-widest">{c.category?.name || "UNSPECIFIED"}</span>
                                                                <span className="text-[10px] font-bold text-primary">{c.category?.fee || c.category_fee || 0} ETB</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-xs font-bold">{c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}</span>
                                                                <span className="text-[10px] uppercase font-black tracking-tighter text-muted-foreground/50">
                                                                    By: {c.created_by?.first_name ? `${c.created_by.first_name} ${c.created_by.last_name || ""}` : c.created_by?.email || "—"}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none", statusColors[c.status])}>
                                                                {STATUS_LABELS[c.status] || c.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-8">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                                                                        <MoreHorizontal className="h-5 w-5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="glass-card border-white/10 p-2 min-w-[160px]">
                                                                    <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase tracking-tight py-2.5 gap-2 cursor-pointer focus:bg-green-500/10 focus:text-green-500 transition-colors" onClick={() => handleAction(c, "accept")}>
                                                                        <FileCheck className="h-4 w-4" /> Accept Entry
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase tracking-tight py-2.5 gap-2 cursor-pointer focus:bg-red-500/10 focus:text-red-500 transition-colors" onClick={() => handleAction(c, "reject")}>
                                                                        <XCircle className="h-4 w-4" /> Decline Entry
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="py-32 text-center">
                                                        <div className="flex flex-col items-center justify-center space-y-4">
                                                            <div className="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center -rotate-6 border border-white/5 shadow-inner">
                                                                <FileCheck className="h-10 w-10 text-muted-foreground/20" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xl font-black font-display text-foreground">Clear Registry</p>
                                                                <p className="text-sm font-medium text-muted-foreground">All incoming filings have been processed.</p>
                                                            </div>
                                                        </div>
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

                <TabsContent value="payments" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-2xl font-black font-display tracking-tight">Financial Audits</CardTitle>
                            <CardDescription className="text-muted-foreground font-medium">Verify transaction receipts against case registrations.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingPayments ? (
                                <div className="p-8 space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-white/5">
                                            <TableRow className="border-white/5 hover:bg-transparent">
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">Docket #</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Transaction Detail</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Currency/Value</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Reference</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Authentication</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payments && payments.length > 0 ? (
                                                payments.map((p) => (
                                                    <TableRow key={p.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                        <TableCell className="font-mono text-xs font-bold text-muted-foreground pl-8">{p.case_file_number || "—"}</TableCell>
                                                        <TableCell className="py-6">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-black font-display text-sm tracking-tight group-hover:text-primary transition-colors truncate max-w-[200px]">{p.case_title || "—"}</span>
                                                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Date: {new Date(p.transaction_date || p.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-base font-black font-display text-foreground">{p.amount} <span className="text-[10px] text-muted-foreground">ETB</span></span>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-[11px] font-bold text-primary/70">{p.transaction_reference}</TableCell>
                                                        <TableCell className="text-xs font-black uppercase tracking-tight text-muted-foreground/80">{p.sender_name || p.user_name}</TableCell>
                                                        <TableCell className="text-right pr-8">
                                                            <Badge variant={p.status === 'VERIFIED' ? 'default' : p.status === 'FAILED' ? 'destructive' : 'secondary'}
                                                                className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none", 
                                                                    p.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-500' : 
                                                                    p.status === 'FAILED' ? 'bg-rose-500/20 text-rose-500' : 'bg-muted/50 text-muted-foreground')}>
                                                                {p.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="py-32 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
                                                        No financial records found.
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

                <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-2xl font-black font-display tracking-tight">Master Repository</CardTitle>
                            <CardDescription className="text-muted-foreground font-medium">Comprehensive index of all recorded legal proceedings.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingAll ? (
                                <div className="p-8 space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-white/5">
                                            <TableRow className="border-white/5 hover:bg-transparent">
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">Docket #</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Title</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Jurisdiction</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Timeline</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Security State</TableHead>
                                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">Audit</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allCases && allCases.length > 0 ? (
                                                allCases.map((c) => (
                                                    <TableRow key={c.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                        <TableCell className="font-mono text-xs font-bold text-muted-foreground pl-8">{c.file_number || "—"}</TableCell>
                                                        <TableCell className="py-6">
                                                            <span className="font-black font-display text-sm tracking-tight group-hover:text-primary transition-colors truncate max-w-[280px] block">{c.title}</span>
                                                        </TableCell>
                                                        <TableCell className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c.category?.name || c.category || "GENERAL"}</TableCell>
                                                        <TableCell className="text-xs font-bold">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</TableCell>
                                                        <TableCell>
                                                            <Badge className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none px-2", statusColors[c.status])}>
                                                                {STATUS_LABELS[c.status] || c.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-8">
                                                            <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl border-white/10 glass text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all hover:text-white">
                                                                <Link href={`/dashboard/clerk/cases/${c.id}`} className="flex items-center">
                                                                    <Eye className="mr-2 h-4 w-4" /> Review
                                                                </Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="py-32 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
                                                        Repository index empty.
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
