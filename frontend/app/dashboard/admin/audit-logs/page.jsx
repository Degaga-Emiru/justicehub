"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAuditLogs, deleteAuditLog, purgeAuditLogs } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Search, Loader2, Shield, ChevronLeft, ChevronRight, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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
 const [isPurgeOpen, setIsPurgeOpen] = useState(false);
 const [purgeDays, setPurgeDays] = useState("30");
 const queryClient = useQueryClient();

 const filters = {};
 if (search) filters.search = search;
 if (actionFilter !== "ALL") filters.action_type = actionFilter;
 filters.page = page;

 const { data, isLoading } = useQuery({
 queryKey: ["audit-logs", search, actionFilter, page],
 queryFn: () => fetchAuditLogs(filters),
 placeholderData: (previousData) => previousData,
 });

 const deleteMutation = useMutation({
 mutationFn: deleteAuditLog,
 onSuccess: () => {
 toast.success("Log entry deleted");
 queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
 },
 onError: (err) => toast.error(err.message)
 });

 const purgeMutation = useMutation({
 mutationFn: purgeAuditLogs,
 onSuccess: (data) => {
 toast.success(`Successfully purged ${data.deleted_count} logs`);
 queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
 setIsPurgeOpen(false);
 },
 onError: (err) => toast.error(err.message)
 });

 const logs = data?.results || (Array.isArray(data) ? data : []);
 const totalCount = data?.count || logs.length;
 const hasNext = data?.next != null;
 const hasPrev = page > 1;

 const handleDelete = (id) => {
 if (confirm("Permanently delete this log entry?")) {
 deleteMutation.mutate(id);
 }
 };

 return (
 <div className="space-y-6 animate-fade-up">
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
 <div>
 <h1 className="text-4xl font-black font-display tracking-tight flex items-center gap-3 text-foreground">
 <Shield className="h-10 w-10 text-primary" />
 Audit Trail
 </h1>
 <p className="text-slate-300 font-medium text-lg mt-1">
 Monitor system activity and compliance logs.
 </p>
 </div>
 
 <Dialog open={isPurgeOpen} onOpenChange={setIsPurgeOpen}>
 <DialogTrigger asChild>
 <Button variant="outline" className="h-12 px-6 rounded-xl font-bold border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all gap-2">
 <Trash2 className="h-4 w-4" />
 Purge Old Logs
 </Button>
 </DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-rose-500">
 <AlertTriangle className="h-5 w-5" />
 Purge Audit History
 </DialogTitle>
 <DialogDescription>
 This will permanently delete logs older than the selected period. This action cannot be undone.
 </DialogDescription>
 </DialogHeader>
 <div className="py-6 space-y-4">
 <div className="space-y-2">
 <label className="text-xs font-black uppercase tracking-widest text-slate-300">Retention Period</label>
 <Select value={purgeDays} onValueChange={setPurgeDays}>
 <SelectTrigger className="h-12 rounded-xl bg-muted/50">
 <SelectValue placeholder="Select period" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="5">Older than 5 days</SelectItem>
 <SelectItem value="10">Older than 10 days</SelectItem>
 <SelectItem value="30">Older than 30 days (1 month)</SelectItem>
 <SelectItem value="90">Older than 90 days (3 months)</SelectItem>
 <SelectItem value="365">Older than 1 year</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <DialogFooter>
 <Button variant="ghost" onClick={() => setIsPurgeOpen(false)} disabled={purgeMutation.isPending}>Cancel</Button>
 <Button 
 variant="destructive" 
 className="rounded-xl font-bold"
 onClick={() => purgeMutation.mutate(parseInt(purgeDays))}
 disabled={purgeMutation.isPending}
 >
 {purgeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
 Purge Now
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>

 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1 max-w-sm group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
 <Input
 placeholder="Search logs..."
 className="pl-11 h-12 bg-muted/30 border-white/5 rounded-2xl glass focus-visible:ring-primary/50 font-medium"
 value={search}
 onChange={(e) => { setSearch(e.target.value); setPage(1); }}
 />
 </div>
 <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
 <SelectTrigger className="w-[240px] h-12 bg-muted/30 border-white/5 rounded-2xl glass font-medium">
 <SelectValue placeholder="Filter by action" />
 </SelectTrigger>
 <SelectContent className="glass-card border-white/10">
 <SelectItem value="ALL">All System Actions</SelectItem>
 <SelectItem value="LOGIN">Auth: Login</SelectItem>
 <SelectItem value="USER_CREATED">Users: Created</SelectItem>
 <SelectItem value="CASE_CREATED">Cases: Created</SelectItem>
 <SelectItem value="CASE_REVIEWED">Cases: Reviewed</SelectItem>
 <SelectItem value="DOCUMENT_UPLOADED">Files: Uploaded</SelectItem>
 <SelectItem value="HEARING_SCHEDULED">Events: Scheduled</SelectItem>
 <SelectItem value="DECISION_ISSUED">Judgments: Issued</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="rounded-2xl border border-white/5 bg-card/30 glass overflow-hidden shadow-2xl">
 <Table>
 <TableHeader className="bg-white/5">
 <TableRow className="border-white/5 hover:bg-transparent">
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300 pl-8 w-[180px]">Timestamp</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300">Identity</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300">Action Type</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300 hidden md:table-cell">Operation Details</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300 text-right pr-8">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={5} className="py-32 text-center">
 <div className="flex flex-col items-center justify-center gap-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-sm font-black uppercase tracking-widest text-slate-300">Decrypting logs...</p>
 </div>
 </TableCell>
 </TableRow>
 ) : logs.length === 0 ? (
 <TableRow>
 <TableCell colSpan={5} className="py-32 text-center">
 <div className="flex flex-col items-center justify-center space-y-4">
 <div className="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center -rotate-6 border border-white/5 shadow-inner">
 <Shield className="h-10 w-10 text-slate-300/20" />
 </div>
 <p className="text-xl font-black font-display text-foreground">No Logs Found</p>
 <p className="text-sm font-medium text-slate-300">Refine your search or clear filters.</p>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 logs.map((log) => (
 <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors group">
 <TableCell className="pl-8 py-5">
 <div className="flex flex-col">
 <span className="text-sm font-bold text-foreground">
 {log.timestamp ? new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "—"}
 </span>
 <span className="text-[10px] font-mono text-slate-300">
 {log.timestamp ? new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ""}
 </span>
 </div>
 </TableCell>
 <TableCell>
 <div className="flex flex-col">
 <span className="text-sm font-black font-display truncate max-w-[200px]">
 {log.user_email || log.user?.email || "System"}
 </span>
 <span className="text-[10px] font-bold text-slate-200 tracking-widest uppercase">
 IP: {log.ip_address || "Internal"}
 </span>
 </div>
 </TableCell>
 <TableCell>
 <Badge
 variant="outline"
 className={`text-[9px] font-black uppercase px-2.5 py-0.5 border-transparent ${actionBadgeColors[log.action_type] || "bg-gray-500/10 text-gray-400"}`}
 >
 {(log.action_type || "").replace(/_/g, " ")}
 </Badge>
 </TableCell>
 <TableCell className="hidden md:table-cell">
 <p className="text-sm text-slate-300 max-w-[400px] truncate group-hover:text-foreground transition-colors">
 {log.description || "—"}
 </p>
 </TableCell>
 <TableCell className="text-right pr-8">
 <Button 
 variant="ghost" 
 size="sm" 
 className="h-9 w-9 p-0 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
 onClick={() => handleDelete(log.id)}
 disabled={deleteMutation.isPending}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>

 <div className="flex items-center justify-between px-2">
 <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
 Showing {logs.length} of {totalCount} records
 </p>
 <div className="flex items-center gap-4">
 <Button
 variant="outline"
 size="sm"
 className="h-10 w-10 rounded-xl glass border-white/5 disabled:opacity-30"
 disabled={!hasPrev}
 onClick={() => setPage((p) => p - 1)}
 >
 <ChevronLeft className="h-5 w-5" />
 </Button>
 <div className="h-10 px-4 rounded-xl glass border border-white/5 flex items-center justify-center font-bold text-sm">
 Page {page}
 </div>
 <Button
 variant="outline"
 size="sm"
 className="h-10 w-10 rounded-xl glass border-white/5 disabled:opacity-30"
 disabled={!hasNext}
 onClick={() => setPage((p) => p + 1)}
 >
 <ChevronRight className="h-5 w-5" />
 </Button>
 </div>
 </div>
 </div>
 );
}
