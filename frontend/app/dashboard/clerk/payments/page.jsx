"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTransactions, confirmPayment } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function RegistrarPaymentsPage() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");

    const { data: transactions, isLoading } = useQuery({
        queryKey: ["clerk-transactions", statusFilter],
        queryFn: () => fetchTransactions(statusFilter === "All" ? {} : { status: statusFilter }),
    });

    const verifyMutation = useMutation({
        mutationFn: (id) => confirmPayment(id),
        onSuccess: () => {
            queryClient.invalidateQueries(["clerk-transactions"]);
        },
    });

    const filteredTransactions = transactions?.filter(t =>
        (t.case_file_number && t.case_file_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.transaction_reference && t.transaction_reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.sender_name && t.sender_name.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    const handleVerify = (id) => {
        verifyMutation.mutate(id);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Payment Verification</h1>
                <p className="text-muted-foreground">Verify and manage fee payments for case filings.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>Review pending payments from clients.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search Case ID or Payer..."
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
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Verified">Verified</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Transaction ID</TableHead>
                                        <TableHead>Case ID</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Payer</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTransactions.length > 0 ? (
                                        filteredTransactions.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell className="font-mono text-xs">{t.transaction_reference}</TableCell>
                                                <TableCell className="font-medium">{t.case_file_number || "—"}</TableCell>
                                                <TableCell className="text-xs truncate max-w-[200px]">{t.case_title}</TableCell>
                                                <TableCell>{t.amount} ETB</TableCell>
                                                <TableCell>{t.sender_name || t.user_name}</TableCell>
                                                <TableCell>{t.transaction_date ? new Date(t.transaction_date).toLocaleDateString() : '—'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={t.status === 'VERIFIED' ? 'default' : 'secondary'}
                                                        className={t.status === 'VERIFIED' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                                                        {t.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {t.status === 'PENDING' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleVerify(t.id)}
                                                            disabled={verifyMutation.isPending}
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
                                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
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
        </div>
    );
}
