"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Shield, ChevronLeft, ChevronRight } from "lucide-react";

const actionBadgeColors = {
    LOGIN: "bg-blue-100 text-blue-800",
    LOGOUT: "bg-slate-100 text-slate-800",
    USER_CREATED: "bg-green-100 text-green-800",
    CASE_CREATED: "bg-emerald-100 text-emerald-800",
    CASE_VIEWED: "bg-sky-100 text-sky-800",
    CASE_REVIEWED: "bg-violet-100 text-violet-800",
    DOCUMENT_UPLOADED: "bg-amber-100 text-amber-800",
    DOCUMENT_VIEWED: "bg-cyan-100 text-cyan-800",
    DOCUMENT_DOWNLOADED: "bg-teal-100 text-teal-800",
    DOCUMENT_DELETED: "bg-red-100 text-red-800",
    HEARING_SCHEDULED: "bg-indigo-100 text-indigo-800",
    HEARING_CANCELLED: "bg-rose-100 text-rose-800",
    HEARING_COMPLETED: "bg-green-100 text-green-800",
    HEARING_ATTENDANCE: "bg-purple-100 text-purple-800",
    DECISION_ISSUED: "bg-yellow-100 text-yellow-800",
};

export default function AuditLogsPage() {
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("ALL");
    const [page, setPage] = useState(1);

    const filters = {};
    if (search) filters.search = search;
    if (actionFilter !== "ALL") filters.action_type = actionFilter;
    filters.page = page;

    const { data, isLoading } = useQuery({
        queryKey: ["audit-logs", search, actionFilter, page],
        queryFn: () => fetchAuditLogs(filters),
        keepPreviousData: true,
    });

    const logs = data?.results || (Array.isArray(data) ? data : []);
    const totalCount = data?.count || logs.length;
    const hasNext = data?.next != null;
    const hasPrev = page > 1;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Shield className="h-7 w-7 text-amber-500" />
                    Audit Logs
                </h1>
                <p className="text-muted-foreground">
                    Monitor all system activity and user actions.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search logs..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Actions</SelectItem>
                        <SelectItem value="LOGIN">Login</SelectItem>
                        <SelectItem value="USER_CREATED">User Created</SelectItem>
                        <SelectItem value="CASE_CREATED">Case Created</SelectItem>
                        <SelectItem value="CASE_VIEWED">Case Viewed</SelectItem>
                        <SelectItem value="CASE_REVIEWED">Case Reviewed</SelectItem>
                        <SelectItem value="DOCUMENT_UPLOADED">Document Uploaded</SelectItem>
                        <SelectItem value="DOCUMENT_VIEWED">Document Viewed</SelectItem>
                        <SelectItem value="DOCUMENT_DELETED">Document Deleted</SelectItem>
                        <SelectItem value="HEARING_SCHEDULED">Hearing Scheduled</SelectItem>
                        <SelectItem value="HEARING_CANCELLED">Hearing Cancelled</SelectItem>
                        <SelectItem value="HEARING_COMPLETED">Hearing Completed</SelectItem>
                        <SelectItem value="DECISION_ISSUED">Decision Issued</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead className="hidden md:table-cell">Description</TableHead>
                            <TableHead className="hidden lg:table-cell">IP Address</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No audit logs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {log.timestamp
                                            ? new Date(log.timestamp).toLocaleString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">
                                        {log.user_email || log.user?.email || "System"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={`text-xs ${actionBadgeColors[log.action_type] || "bg-gray-100 text-gray-800"}`}
                                        >
                                            {(log.action_type || "").replace(/_/g, " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[300px] truncate">
                                        {log.description || "—"}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-xs font-mono text-muted-foreground">
                                        {log.ip_address || "—"}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    {totalCount} log{totalCount !== 1 ? "s" : ""} total
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasPrev}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {page}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasNext}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
