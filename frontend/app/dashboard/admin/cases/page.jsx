"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCases } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Loader2 } from "lucide-react";

const statusStyles = {
    PENDING_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
    APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ASSIGNED: "bg-cyan-100 text-cyan-800 border-cyan-200",
    IN_PROGRESS: "bg-violet-100 text-violet-800 border-violet-200",
    CLOSED: "bg-gray-100 text-gray-800 border-gray-200",
};

const priorityStyles = {
    LOW: "bg-slate-100 text-slate-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
};

export default function AdminCasesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const { data: cases, isLoading } = useQuery({
        queryKey: ["admin-cases"],
        queryFn: () => fetchCases(),
    });

    const filteredCases = (cases || []).filter((c) => {
        const matchesSearch =
            (c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.file_number || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Case Oversight</h1>
                <p className="text-muted-foreground">
                    View and monitor all cases across the system.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title or file number..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>File #</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Filed By</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : filteredCases.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    No cases found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCases.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-mono text-sm">
                                        {c.file_number || "PENDING"}
                                    </TableCell>
                                    <TableCell className="font-medium max-w-[200px] truncate">
                                        {c.title}
                                    </TableCell>
                                    <TableCell>
                                        {c.category_name || c.category?.name || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={statusStyles[c.status] || ""}>
                                            {(c.status || "").replace(/_/g, " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={priorityStyles[c.priority] || ""}>
                                            {c.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {c.created_by_name || c.created_by?.full_name || "—"}
                                    </TableCell>
                                    <TableCell>
                                        {c.filing_date
                                            ? new Date(c.filing_date).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <p className="text-xs text-muted-foreground">
                Showing {filteredCases.length} case{filteredCases.length !== 1 ? "s" : ""}
            </p>
        </div>
    );
}
