"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchCases } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Search, FileText, CheckCircle, Eye, Calendar, User, 
  ArrowRight, Filter, Download, History, Scale, TrendingUp
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ClosedCasesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases", "CLOSED"],
    queryFn: () => fetchCases({ status: "CLOSED" }),
  });

  const closedCases = cases.filter(c => 
    String(c.file_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(c.title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight text-[#1A202C] flex items-center gap-3">
            <CheckCircle className="h-10 w-10 text-primary" />
            Closed Cases
          </h1>
          <p className="text-[#4A5568] font-bold mt-1 opacity-100">
            Archived legal proceedings and finalized judicial decisions.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="rounded-xl border-primary/20 text-primary hover:bg-primary/5 h-12 px-6 font-bold"
            onClick={() => router.push('/dashboard/registrar/closed-cases/analytics')}
          >
            <TrendingUp className="mr-2 h-4 w-4" /> Archive Analytics
          </Button>
          <div className="relative flex-1 md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568] group-focus-within:text-primary transition-colors opacity-100" />
            <Input 
              placeholder="Search by Docket # or Title..." 
              className="pl-11 h-12 rounded-2xl bg-card border-border shadow-sm focus-visible:ring-primary/20 font-bold text-[#1A202C]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-muted/20 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] pl-8 opacity-100">Docket #</TableHead>
                    <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Case Title</TableHead>
                    <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Category</TableHead>
                    <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Decision Date</TableHead>
                    <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Assigned Judge</TableHead>
                    <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] text-right pr-8 opacity-100">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedCases.length > 0 ? (
                    closedCases.map((c) => (
                      <TableRow 
                        key={c.id} 
                        className="border-border hover:bg-muted/30 transition-colors group cursor-pointer" 
                        onClick={() => router.push(`/dashboard/registrar/closed-cases/${c.id}`)}
                      >
                        <TableCell className="font-mono text-xs font-black text-[#4A5568] pl-8 opacity-100">{c.file_number}</TableCell>
                        <TableCell className="py-6">
                          <span className="font-black font-display text-base tracking-tight group-hover:text-primary transition-colors text-[#1A202C]">{c.title}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#2D3748] bg-muted/50 px-2 py-1 rounded-md opacity-100">
                            {c.category_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-black text-[#1A202C]">
                          {c.closed_date ? format(new Date(c.closed_date), "MMM d, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                              {c.assigned_judge?.name?.charAt(0) || "J"}
                            </div>
                            <span className="text-xs font-black text-[#1A202C] truncate max-w-[120px]">
                              {c.assigned_judge?.name || "Unassigned"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 hover:text-primary group/btn"
                          >
                            <Eye className="mr-2 h-3.5 w-3.5 transition-transform group-hover/btn:scale-110" />
                            Archive View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-40 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="h-20 w-20 rounded-[2.5rem] bg-muted/10 flex items-center justify-center rotate-6 border border-border shadow-inner">
                            <History className="h-10 w-10 text-[#4A5568] opacity-20" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xl font-black font-display text-[#1A202C]">Archive is Empty</p>
                            <p className="text-sm text-[#4A5568] font-bold max-w-[300px] opacity-100">No closed cases match your current search criteria.</p>
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
    </div>
  );
}
