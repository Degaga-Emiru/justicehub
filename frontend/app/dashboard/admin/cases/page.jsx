"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCases, fetchCategories, getAdminCasesExportUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Loader2, ArrowRight, Filter, X, Calendar as CalendarIcon, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

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

function CasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "ALL",
    category: searchParams.get("category") || "ALL",
    priority: searchParams.get("priority") || "ALL",
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: cases, isLoading } = useQuery({
    queryKey: ["admin-cases", debouncedSearch, filters.status, filters.category, filters.priority],
    queryFn: () => fetchCases({
      search: debouncedSearch,
      status: filters.status !== "ALL" ? filters.status : undefined,
      category: filters.category !== "ALL" ? filters.category : undefined,
      priority: filters.priority !== "ALL" ? filters.priority : undefined,
    }),
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "ALL",
      category: "ALL",
      priority: "ALL",
    });
  };

  const handleExportCSV = () => {
    const currentFilters = {
      search: debouncedSearch,
      status: filters.status !== "ALL" ? filters.status : "",
      category: filters.category !== "ALL" ? filters.category : "",
      priority: filters.priority !== "ALL" ? filters.priority : "",
    };
    
    const url = getAdminCasesExportUrl(currentFilters);
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      toast.error("Authentication required for export.");
      return;
    }

    toast.promise(
      fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `justicehub_cases_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }),
      {
        loading: 'Preparing case registry export...',
        success: 'Cases exported successfully!',
        error: 'Failed to export cases.'
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight">Case Registry</h1>
          <p className="text-foreground font-medium text-sm">
            Centralized index of all judicial proceedings.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                onClick={handleExportCSV}
                variant="outline" 
                className="rounded-xl border-border hover:bg-muted/50 gap-2 font-black text-xs uppercase tracking-widest"
            >
                <Download className="h-4 w-4" /> Export CSV
            </Button>
        </div>
      </div>

      <div className="bg-card/50 border border-border p-4 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground" />
            <Input
              placeholder="Search by title, file number, or parties..."
              className="pl-10 h-10 rounded-xl bg-background/50 border-border focus:ring-primary/20"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>

          <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
            <SelectTrigger className="w-[160px] h-10 rounded-xl bg-background/50 border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.category} onValueChange={(v) => handleFilterChange("category", v)}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-background/50 border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.priority} onValueChange={(v) => handleFilterChange("priority", v)}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background/50 border-border">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priority</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {(filters.search || filters.status !== "ALL" || filters.category !== "ALL" || filters.priority !== "ALL") && (
            <Button 
                variant="ghost" 
                onClick={clearFilters}
                className="h-10 rounded-xl px-3 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
                <X className="h-4 w-4 mr-2" /> Reset
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card/30 border-border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-foreground pl-6">File Number</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-foreground">Title</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-foreground">Status</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-foreground">Priority</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-foreground">Filing Date</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-foreground text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/50" />
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-foreground">Indexing Archives...</p>
                </TableCell>
              </TableRow>
            ) : cases?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-foreground">
                  <div className="flex flex-col items-center justify-center space-y-3 opacity-50">
                    <FileText className="h-10 w-10 mx-auto" />
                    <p className="text-xs font-black uppercase tracking-widest">No matching cases found</p>
                    <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl font-black text-[10px] uppercase tracking-widest">Clear all filters</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              cases?.map((c) => (
                <TableRow 
                  key={c.id} 
                  className="cursor-pointer hover:bg-primary/5 transition-colors group border-border"
                  onClick={() => router.push(`/dashboard/admin/cases/${c.id}`)}
                >
                  <TableCell className="pl-6 font-mono text-sm font-black opacity-100 group-hover:opacity-100">
                    {c.file_number || "PENDING"}
                  </TableCell>
                  <TableCell className="min-w-[240px]">
                    <div className="space-y-0.5">
                        <p className="font-black text-sm group-hover:text-primary transition-colors truncate max-w-[300px]">
                            {c.title}
                        </p>
                        <p className="text-[10px] font-bold text-foreground uppercase tracking-tight">
                            {c.category_name || c.category?.name || "General Litigation"}
                        </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border-none", statusStyles[c.status] || "")}>
                      {(c.status || "").replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", 
                            c.priority === 'URGENT' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                            c.priority === 'HIGH' ? 'bg-orange-500' : 'bg-slate-400'
                        )} />
                        <span className={cn("text-[9px] font-black uppercase tracking-wider", 
                            c.priority === 'URGENT' ? 'text-red-500' : 'text-foreground'
                        )}>
                            {c.priority}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-foreground">
                    {c.created_at ? format(new Date(c.created_at), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-[10px] font-black text-foreground uppercase tracking-widest">
          Found {cases?.length || 0} proceeding{cases?.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

export default function AdminCasesPage() {
  return (
    <Suspense fallback={
        <div className="flex flex-col h-[50vh] items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-black text-foreground uppercase tracking-widest text-center">Loading Registry...</p>
        </div>
    }>
      <CasesContent />
    </Suspense>
  );
}
