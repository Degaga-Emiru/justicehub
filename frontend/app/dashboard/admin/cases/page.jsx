"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCases } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
 const router = useRouter();

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
 <div className="space-y-6 animate-fade-up">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
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

 <div className="rounded-md border bg-card/30 bg-background shadow-sm border-border overflow-hidden shadow-sm">
 <Table>
 <TableHeader className="bg-muted/50">
 <TableRow>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">File #</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">Title</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">Priority</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">Filed By</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Action</TableHead>
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
 <FileText className="h-8 w-8 mx-auto mb-2 " />
 No cases found.
 </TableCell>
 </TableRow>
 ) : (
 filteredCases.map((c) => (
 <TableRow 
 key={c.id} 
 className="cursor-pointer hover:bg-primary/5 transition-colors group"
 onClick={() => router.push(`/dashboard/admin/cases/${c.id}`)}
 >
 <TableCell className="font-mono text-sm font-bold opacity-70">
 {c.file_number || "PENDING"}
 </TableCell>
 <TableCell className="font-bold max-w-[200px] truncate group-hover:text-primary transition-colors">
 {c.title}
 </TableCell>
 <TableCell className="text-xs font-medium">
 {c.category_name || c.category?.name || "—"}
 </TableCell>
 <TableCell>
 <Badge variant="outline" className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border-none", statusStyles[c.status] || "")}>
 {(c.status || "").replace(/_/g, " ")}
 </Badge>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider", priorityStyles[c.priority] || "")}>
 {c.priority}
 </Badge>
 </TableCell>
 <TableCell className="text-xs font-medium truncate max-w-[150px]">
 {c.client_name || c.created_by?.full_name || "—"}
 </TableCell>
 <TableCell className="text-right">
 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg group-hover:bg-primary/10 group-hover:text-primary">
 <ArrowRight className="h-4 w-4" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>

 <p className="text-xs text-muted-foreground font-medium">
 Showing {filteredCases.length} case{filteredCases.length !== 1 ? "s" : ""} in system index.
 </p>
 </div>
 );
}
