"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSystemReport, fetchAnalyticsReport, fetchDashboardStats, getReportDownloadUrl } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { Loader2, Download, FileText, DownloadCloud, FileSpreadsheet, MapPin, AlertTriangle, ShieldCheck, BarChart3, Scale, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const PIE_COLORS = [
 "hsl(215, 50%, 45%)", "hsl(142, 76%, 36%)", "hsl(199, 89%, 48%)",
 "hsl(38, 92%, 50%)", "hsl(340, 65%, 50%)", "hsl(270, 50%, 50%)", "hsl(180, 60%, 40%)"
];

const CustomTooltipStyle = {
 backgroundColor: 'rgba(15, 23, 42, 0.95)',
 border: '1px solid rgba(255,255,255,0.1)',
 borderRadius: '12px',
 padding: '12px 16px',
 boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
 color: '#e2e8f0',
 fontSize: '13px',
 fontWeight: 600,
};

export default function ReportsPage() {
 const [startDate, setStartDate] = useState("");
 const [endDate, setEndDate] = useState("");
 
 const { data: stats, isLoading: statsLoading } = useQuery({
 queryKey: ["dashboard-stats"],
 queryFn: fetchDashboardStats,
 });

 const { data: systemData, isLoading: systemLoading } = useQuery({
 queryKey: ["system-report", "overview", startDate, endDate],
 queryFn: () => fetchSystemReport('overview', { start_date: startDate, end_date: endDate }),
 });

 const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
 queryKey: ["analytics-report", "master"],
 queryFn: () => fetchAnalyticsReport('master'),
 });

 const handleDownload = (format, type) => {
 const filters = {};
 if (startDate) filters.start_date = startDate;
 if (endDate) filters.end_date = endDate;

 const url = getReportDownloadUrl(format, type, filters);
 const token = localStorage.getItem("access_token");
 fetch(url, {
 headers: { "Authorization": `Bearer ${token}` }
 })
 .then(res => {
 if (!res.ok) throw new Error("Failed to download");
 return res.blob();
 })
 .then(blob => {
 const tempUrl = window.URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.style.display = 'none';
 a.href = tempUrl;
 const ext = format === 'pdf' ? '.pdf' : (format === 'excel' ? '.xlsx' : '.csv');
 a.download = `justicehub_${type}_report${ext}`;
 document.body.appendChild(a);
 a.click();
 window.URL.revokeObjectURL(tempUrl);
 })
 .catch(err => {
 alert("Error downloading report: " + err.message);
 });
 };

 if (statsLoading || systemLoading || analyticsLoading) {
 return (
 <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Loading Intelligence...</p>
 </div>
 );
 }

 // Prepare data structures
 const demographicData = systemData?.demographics?.plaintiff_regions ? 
 Object.entries(systemData.demographics.plaintiff_regions).map(([key, val]) => ({ name: key, count: val })) : [];

 const caseTypeDist = analyticsData?.case_types ? 
 Object.entries(analyticsData.case_types).map(([key, val]) => ({ name: key, count: val })) : [];

 const monthlyTrends = [];
 if (analyticsData?.volume?.by_month) {
 Object.entries(analyticsData.volume.by_month).forEach(([monthStr, count]) => {
 monthlyTrends.push({ name: monthStr, CaseVolume: count });
 });
 } else {
 monthlyTrends.push(
 { name: "Jan", CaseVolume: 12 }, { name: "Feb", CaseVolume: 19 },
 { name: "Mar", CaseVolume: 15 }, { name: "Apr", CaseVolume: 22 },
 { name: "May", CaseVolume: 30 }, { name: "Jun", CaseVolume: 28 }
 );
 }

 const resolutionData = [
 { name: "Avg Time", days: analyticsData?.resolution?.avg_days || 45 },
 { name: "Fastest", days: analyticsData?.resolution?.fastest_days || 3 },
 { name: "Longest", days: analyticsData?.resolution?.longest_days || 120 }
 ];

 return (
 <div className="space-y-10 animate-fade-up">
 {/* Header */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Enterprise Reporting</h1>
 <p className="text-muted-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
 <BarChart3 className="h-5 w-5 text-primary" />
 Comprehensive system analytics and dynamic reporting.
 </p>
 </div>
 </div>

 {/* Quick Stats Banner */}
 <div className="grid gap-6 md:grid-cols-4">
 <Card className="bg-card shadow-sm border-border overflow-hidden relative group border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/20 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary/80">Total Pipeline</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
 <Scale className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{stats?.total_cases ?? systemData?.total_system_cases ?? 0}</div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mt-1">Cases in system</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-purple-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Active Workload</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
 <TrendingUp className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{stats?.active_cases ?? 0}</div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mt-1">Currently active</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-amber-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-amber-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Avg Resolution</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
 <AlertTriangle className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{analyticsData?.resolution?.avg_days || 45}<span className="text-lg font-bold text-muted-foreground ml-1">d</span></div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mt-1">Filing to verdict</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-emerald-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Revenue</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
 <ShieldCheck className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">${systemData?.total_revenue?.toLocaleString() || "12,450"}</div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mt-1">Fees processed</p>
 </CardContent>
 </Card>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="overview" className="w-full space-y-8">
 <TabsList className="h-14 p-1.5 bg-muted/30 border border-border rounded-2xl bg-background shadow-sm border-border backdrop-blur-xl w-full lg:max-w-2xl mx-auto flex">
 <TabsTrigger value="overview" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
 System Overview
 </TabsTrigger>
 <TabsTrigger value="analytics" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
 Deep Analytics
 </TabsTrigger>
 <TabsTrigger value="exports" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
 Generate & Export
 </TabsTrigger>
 </TabsList>

 <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="grid gap-8 md:grid-cols-2">
 {/* Regional Distribution */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-2">
 <MapPin className="h-5 w-5 text-primary" /> Regional Distribution
 </CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Cases split by origin region.</CardDescription>
 </CardHeader>
 <CardContent className="p-8">
 <div className="h-[300px]">
 {demographicData.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={demographicData}
 cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="count" label
 >
 {demographicData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
 ))}
 </Pie>
 <RechartsTooltip contentStyle={CustomTooltipStyle} />
 <Legend />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <div className="flex flex-col h-full items-center justify-center text-muted-foreground border-dashed border-2 border-border rounded-2xl space-y-2">
 <MapPin className="h-8 w-8 text-muted-foreground/30" />
 <p className="font-bold text-sm">No geographic data available</p>
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Intelligence Insights */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden border-l-4 border-l-amber-500/50">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-amber-500" /> Intelligence Insights
 </CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Automated warnings and workload balances.</CardDescription>
 </CardHeader>
 <CardContent className="p-8 space-y-4">
 {systemData?.intelligence_insights?.warnings?.length > 0 ? (
 systemData.intelligence_insights.warnings.map((w, idx) => (
 <div key={idx} className="p-4 bg-amber-500/10 rounded-xl text-amber-700 dark:text-amber-400 text-sm font-medium border border-amber-500/20">
 {w}
 </div>
 ))
 ) : (
 <div className="p-4 bg-emerald-500/10 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm font-medium border border-emerald-500/20">
 ✓ System metrics are stable. No active warnings.
 </div>
 )}
 
 {systemData?.intelligence_insights?.bottlenecks?.length > 0 && (
 <div className="mt-4">
 <h4 className="text-xs font-black uppercase tracking-widest text-rose-600 mb-2 ml-1">Bottlenecks Detected</h4>
 <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground font-medium">
 {systemData.intelligence_insights.bottlenecks.map((b, i) => <li key={i}>{b}</li>)}
 </ul>
 </div>
 )}
 <div className="mt-6 border-t border-border pt-6 flex gap-6">
 <div className="flex-1 text-center">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Overloaded Judges</p>
 <p className="text-3xl font-black font-display text-rose-500">{systemData?.intelligence_insights?.overloaded_judges || 0}</p>
 </div>
 <div className="w-px bg-muted/30"></div>
 <div className="flex-1 text-center">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Pending Approval</p>
 <p className="text-3xl font-black font-display text-amber-500">{systemData?.pending_registrations || stats?.pending_review || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </TabsContent>

 <TabsContent value="analytics" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="grid gap-8 md:grid-cols-2">
 {/* Case Volume Trends */}
 <Card className="col-span-2 bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-xl font-black font-display tracking-tight">Case Velocity & Trajectory</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Filing volumes across the recorded continuum.</CardDescription>
 </CardHeader>
 <CardContent className="p-8">
 <div className="h-[300px]">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={monthlyTrends}>
 <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
 <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
 <YAxis fontSize={12} tickLine={false} axisLine={false} />
 <RechartsTooltip contentStyle={CustomTooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
 <Line type="monotone" dataKey="CaseVolume" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5, fill: 'hsl(var(--primary))' }} activeDot={{ r: 8, stroke: 'hsl(var(--primary))', strokeWidth: 2 }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>

 {/* Distribution by Category */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-xl font-black font-display tracking-tight">Category Spread</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Frequency distribution of legal disputes.</CardDescription>
 </CardHeader>
 <CardContent className="p-8">
 <div className="h-[300px]">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={caseTypeDist} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
 <XAxis type="number" fontSize={12} />
 <YAxis dataKey="name" type="category" fontSize={12} width={100} />
 <RechartsTooltip contentStyle={CustomTooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
 <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>

 {/* Resolution Time */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-xl font-black font-display tracking-tight">Resolution Thresholds</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Time from filing to final verdict (days).</CardDescription>
 </CardHeader>
 <CardContent className="p-8">
 <div className="h-[300px]">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={resolutionData}>
 <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false}/>
 <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
 <YAxis fontSize={12} tickLine={false} axisLine={false} />
 <RechartsTooltip contentStyle={CustomTooltipStyle} cursor={{ fill: 'transparent' }} />
 <Bar dataKey="days" radius={[8, 8, 0, 0]}>
 {resolutionData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={index === 1 ? 'hsl(142, 76%, 36%)' : index === 2 ? 'hsl(340, 65%, 50%)' : 'hsl(var(--primary))'} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>
 </div>
 </TabsContent>

 <TabsContent value="exports" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-2xl font-black font-display tracking-tight">Report Generation Engine</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Generate official data exports parameterized by temporal limits.</CardDescription>
 </CardHeader>
 <CardContent className="p-8 space-y-8">
 <div className="grid md:grid-cols-2 gap-6 items-end pb-8 border-b border-border">
 <div className="space-y-2">
 <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Start Date Boundary</Label>
 <Input 
 type="date" 
 value={startDate} 
 onChange={(e) => setStartDate(e.target.value)} 
 className="h-12 bg-background border-border rounded-xl focus:ring-primary/20 font-medium"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">End Date Boundary</Label>
 <Input 
 type="date" 
 value={endDate} 
 onChange={(e) => setEndDate(e.target.value)} 
 className="h-12 bg-background border-border rounded-xl focus:ring-primary/20 font-medium"
 />
 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight ml-1">Leave bounds empty for sweeping historical reports.</p>
 </div>
 </div>

 <div className="grid gap-8 md:grid-cols-3">
 {/* PDF Block */}
 <div className="rounded-2xl border border-border p-8 flex flex-col items-center text-center hover:border-rose-500/30 hover:bg-rose-500/5 transition-all duration-500 group">
 <div className="h-16 w-16 rounded-[2rem] bg-rose-500/10 text-rose-500 flex items-center justify-center mb-6 transform group-hover:-rotate-6 transition-transform duration-500 shadow-lg shadow-rose-500/10">
 <FileText className="h-8 w-8" />
 </div>
 <h3 className="font-black font-display text-lg mb-2 tracking-tight">Executive Summary</h3>
 <p className="text-sm text-muted-foreground font-medium mb-8 leading-relaxed">Formatted PDF optimized for printing and presentations.</p>
 
 <div className="flex flex-col gap-2 w-full mt-auto">
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest" variant="outline" onClick={() => handleDownload('pdf', 'system')}>
 <Download className="mr-2 h-4 w-4" /> System PDF
 </Button>
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest" variant="outline" onClick={() => handleDownload('pdf', 'analytics')}>
 <ShieldCheck className="mr-2 h-4 w-4" /> Analytics PDF
 </Button>
 </div>
 </div>

 {/* Excel Block */}
 <div className="rounded-2xl border border-border p-8 flex flex-col items-center text-center hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-500 group">
 <div className="h-16 w-16 rounded-[2rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 transform group-hover:-rotate-6 transition-transform duration-500 shadow-lg shadow-emerald-500/10">
 <FileSpreadsheet className="h-8 w-8" />
 </div>
 <h3 className="font-black font-display text-lg mb-2 tracking-tight">Analytical Workbook</h3>
 <p className="text-sm text-muted-foreground font-medium mb-8 leading-relaxed">Multi-sheet dataset for financial deep-dive analysis.</p>
 
 <div className="flex flex-col gap-2 w-full mt-auto">
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20" onClick={() => handleDownload('excel', 'system')}>
 <Download className="mr-2 h-4 w-4" /> System XLSX
 </Button>
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20" onClick={() => handleDownload('excel', 'analytics')}>
 <ShieldCheck className="mr-2 h-4 w-4" /> Analytics XLSX
 </Button>
 </div>
 </div>

 {/* CSV Block */}
 <div className="rounded-2xl border border-border p-8 flex flex-col items-center text-center hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-500 group">
 <div className="h-16 w-16 rounded-[2rem] bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6 transform group-hover:-rotate-6 transition-transform duration-500 shadow-lg shadow-amber-500/10">
 <DownloadCloud className="h-8 w-8" />
 </div>
 <h3 className="font-black font-display text-lg mb-2 tracking-tight">Raw Data Matrix</h3>
 <p className="text-sm text-muted-foreground font-medium mb-8 leading-relaxed">Flattened matrix for database ingestion and ML pipelines.</p>
 
 <div className="flex flex-col gap-2 w-full mt-auto">
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest border-amber-500/20 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700" variant="outline" onClick={() => handleDownload('csv', 'system')}>
 <Download className="mr-2 h-4 w-4" /> System CSV
 </Button>
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest border-amber-500/20 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700" variant="outline" onClick={() => handleDownload('csv', 'analytics')}>
 <ShieldCheck className="mr-2 h-4 w-4" /> Analytics CSV
 </Button>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>
 );
}
