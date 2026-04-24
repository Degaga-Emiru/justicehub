"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCases } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RefreshCw, Eye } from "lucide-react";
import { statusColors } from "@/lib/mock-data";
import { format } from "date-fns";

export default function SearchCasesPage() {
 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState("all");

 const { data: cases, isLoading, refetch } = useQuery({
 queryKey: ["cases-search", searchTerm, statusFilter],
 queryFn: () => {
 const filters = {};
 if (searchTerm) filters.search = searchTerm;
 if (statusFilter !== "all") filters.status = statusFilter;
 return fetchCases(filters);
 },
 });

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">Case Search</h1>
 <p className="text-slate-300">Search and filter your assigned cases.</p>
 </div>

 {/* Search & Filters */}
 <Card>
 <CardContent className="pt-6">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="md:col-span-2 relative">
 <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-300" />
 <Input
 placeholder="Search by File Number, Title, or Description..."
 className="pl-9"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>

 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger>
 <SelectValue placeholder="Status" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Statuses</SelectItem>
 <SelectItem value="ASSIGNED">Assigned</SelectItem>
 <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
 <SelectItem value="CLOSED">Closed</SelectItem>
 <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
 <SelectItem value="APPROVED">Approved</SelectItem>
 <SelectItem value="PAID">Paid</SelectItem>
 </SelectContent>
 </Select>

 <Button variant="outline" size="default" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
 <RefreshCw className="mr-2 h-3 w-3" /> Reset Filters
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Results Table */}
 <Card>
 <CardHeader>
 <CardTitle>Results {cases ? `(${cases.length})` : ""}</CardTitle>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="space-y-2">
 {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
 </div>
 ) : (
 <div className="rounded-md border">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>File Number</TableHead>
 <TableHead>Title</TableHead>
 <TableHead>Category</TableHead>
 <TableHead>Filed On</TableHead>
 <TableHead>Priority</TableHead>
 <TableHead>Status</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {cases?.length > 0 ? (
 cases.map((c) => (
 <TableRow key={c.id}>
 <TableCell className="font-medium font-mono">
 {c.file_number || "Pending"}
 </TableCell>
 <TableCell>
 <div className="flex flex-col">
 <span className="font-medium">{c.title}</span>
 <span className="text-xs text-slate-300">
 {c.created_by_name || ""}{c.defendant_name ? ` vs ${c.defendant_name}` : ""}
 </span>
 </div>
 </TableCell>
 <TableCell>{c.category?.name || c.category || "N/A"}</TableCell>
 <TableCell>
 {c.filing_date ? format(new Date(c.filing_date), "MMM d, yyyy") : "N/A"}
 </TableCell>
 <TableCell>
 <Badge variant="outline" className={
 c.priority === "HIGH" ? "bg-orange-100 text-orange-700" :
 c.priority === "URGENT" ? "bg-red-100 text-red-700" :
 c.priority === "LOW" ? "bg-slate-100 text-slate-700" :
 "bg-amber-100 text-amber-700"
 }>
 {c.priority}
 </Badge>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className={statusColors[c.status] || ""}>
 {c.status?.replace("_", " ")}
 </Badge>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={6} className="h-24 text-center">
 No results found.
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
