"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSystemReport, fetchAnalyticsReport, fetchDashboardStats, getReportDownloadUrl } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, Brush, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Scatter, ScatterChart, ZAxis, ComposedChart } from "recharts";
import { Loader2, Download, FileText, DownloadCloud, FileSpreadsheet, MapPin, AlertTriangle, ShieldCheck, BarChart3, Scale, TrendingUp, Users, Activity, Clock, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PIE_COLORS = [
 "hsl(215, 50%, 45%)", "hsl(142, 76%, 36%)", "hsl(199, 89%, 48%)",
 "hsl(38, 92%, 50%)", "hsl(340, 65%, 50%)", "hsl(270, 50%, 50%)", "hsl(180, 60%, 40%)"
];

const CustomTooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(var(--primary), 0.2)',
  borderRadius: '16px',
  padding: '12px 16px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  color: 'hsl(var(--foreground))',
  fontSize: '13px',
  fontWeight: 800,
};

const VIBRANT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"
];

const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null; // Hide labels for < 5%
  
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="currentColor" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-[10px] font-black uppercase tracking-tighter opacity-80"
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

const InsightSection = ({ title, question, insight, meaning, action, colorClass = "primary" }) => {
  const colorMap = {
    primary: "text-primary bg-primary/5 border-primary/10",
    amber: "text-amber-600 bg-amber-500/5 border-amber-500/10",
    emerald: "text-emerald-600 bg-emerald-500/5 border-emerald-500/10",
    purple: "text-purple-600 bg-purple-500/5 border-purple-500/10",
    rose: "text-rose-600 bg-rose-500/5 border-rose-500/10",
  };
  
  const accentColor = colorMap[colorClass] || colorMap.primary;

  return (
    <div className={`mt-10 p-8 rounded-[2.5rem] ${accentColor} border relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-48 h-48 bg-current opacity-[0.03] rounded-full blur-3xl -mr-24 -mt-24 group-hover:opacity-[0.06] transition-opacity`} />
      <div className="relative space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-current opacity-50" />
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">{title}</h4>
        </div>
        
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase opacity-40 mb-2 tracking-[0.2em]">Analytical Inquiry</p>
            <p className="text-lg font-bold text-foreground leading-tight tracking-tight">{question}</p>
          </div>
          
          <div className="p-6 bg-background/40 backdrop-blur-md rounded-3xl border border-current/5 shadow-inner">
            <p className="text-[10px] font-black uppercase text-primary mb-2 tracking-[0.2em]">Strategic Insight</p>
            <p className="text-xl font-black text-foreground leading-tight italic tracking-tight">“{insight}”</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-3xl bg-background/20 border border-current/5">
              <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em] flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" /> Meaning
              </p>
              <p className="text-xs font-bold text-foreground/80 leading-relaxed">{meaning}</p>
            </div>
            <div className="p-5 rounded-3xl bg-background/20 border border-current/5">
              <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Action
              </p>
              <p className="text-xs font-bold text-foreground/80 leading-relaxed">{action}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default function ReportsPage() {
 const [exportStartDate, setExportStartDate] = useState("");
 const [exportEndDate, setExportEndDate] = useState("");
 const [isDownloading, setIsDownloading] = useState(false);
 const [downloadFormat, setDownloadFormat] = useState("");
 const [downloadType, setDownloadType] = useState("");
 const [predefinedRange, setPredefinedRange] = useState("custom");
 
 const { data: stats, isLoading: statsLoading } = useQuery({
 queryKey: ["dashboard-stats"],
 queryFn: fetchDashboardStats,
 });

 const { data: systemData, isLoading: systemLoading } = useQuery({
 queryKey: ["system-report", "overview"],
 queryFn: () => fetchSystemReport('overview'),
 });

 const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
 queryKey: ["analytics-report", "master"],
 queryFn: () => fetchAnalyticsReport('master'),
 });

 const handlePredefinedRange = (value) => {
 setPredefinedRange(value);
 if (value === "custom") return;
 
 const end = new Date();
 let start = new Date();
 
 switch (value) {
 case "today": break;
 case "last_2_days": start.setDate(end.getDate() - 1); break;
 case "last_3_days": start.setDate(end.getDate() - 2); break;
 case "1_week": start.setDate(end.getDate() - 7); break;
 case "2_weeks": start.setDate(end.getDate() - 14); break;
 case "1_month": start.setMonth(end.getMonth() - 1); break;
 case "3_months": start.setMonth(end.getMonth() - 3); break;
 case "6_months": start.setMonth(end.getMonth() - 6); break;
 case "1_year": start.setFullYear(end.getFullYear() - 1); break;
 default:
 setExportStartDate("");
 setExportEndDate("");
 return;
 }
 
 setExportStartDate(start.toISOString().split('T')[0]);
 setExportEndDate(end.toISOString().split('T')[0]);
 };

 const handleDownload = (format, type) => {
 let effectiveStartDate = exportStartDate;
 let effectiveEndDate = exportEndDate;

 if (exportStartDate && exportEndDate && new Date(exportEndDate) < new Date(exportStartDate)) {
 toast.error("End date cannot be earlier than start date.");
 return;
 }
 if (exportStartDate && !exportEndDate) effectiveEndDate = exportStartDate;
 if (!exportStartDate && exportEndDate) effectiveStartDate = exportEndDate;

 const filters = {};
 if (effectiveStartDate) filters.start_date = effectiveStartDate;
 if (effectiveEndDate) filters.end_date = effectiveEndDate;

 setIsDownloading(true);
 setDownloadFormat(format);
 setDownloadType(type);

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

 if (predefinedRange && predefinedRange !== "custom") {
 const rangeText = predefinedRange.replace(/_/g, ' ');
 toast.success(`Report generated successfully for ${rangeText}`);
 } else if (effectiveStartDate && effectiveEndDate) {
 toast.success(`Report generated successfully from ${effectiveStartDate} to ${effectiveEndDate}`);
 } else {
 toast.success("Report generated successfully");
 }
 })
 .catch(err => {
 toast.error("Error downloading report: " + err.message);
 })
 .finally(() => {
 setIsDownloading(false);
 setDownloadFormat("");
 setDownloadType("");
 });
 };

 if (statsLoading || systemLoading || analyticsLoading) {
 return (
 <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-sm font-black text-foreground uppercase tracking-widest">Loading Intelligence...</p>
 </div>
 );
 }

 // Prepare data structures
 const demographicData = systemData?.demographics?.subcity_distribution ? 
  Object.entries(systemData.demographics.subcity_distribution).map(([key, val]) => ({ name: key, count: val })) : [];

 const caseTypeDist = analyticsData?.case_type_analysis?.distribution ? 
  analyticsData.case_type_analysis.distribution.map((item) => ({ name: item.case_type, count: item.total })) : [];

 const monthlyTrends = [];
 if (analyticsData?.volume_by_month) {
  Object.entries(analyticsData.volume_by_month).forEach(([monthStr, count]) => {
  monthlyTrends.push({ name: monthStr, CaseVolume: count });
  });
 }

 const resolutionData = [
  { subject: "Avg Time", value: analyticsData?.resolution_time_metrics?.average || 0, fullMark: Math.max(analyticsData?.resolution_time_metrics?.slowest || 100, 30) },
  { subject: "Fastest", value: analyticsData?.resolution_time_metrics?.fastest || 0, fullMark: Math.max(analyticsData?.resolution_time_metrics?.slowest || 100, 30) },
  { subject: "Longest", value: analyticsData?.resolution_time_metrics?.slowest || 0, fullMark: Math.max(analyticsData?.resolution_time_metrics?.slowest || 100, 30) }
 ];

 const judgePerformanceData = analyticsData?.judge_metrics?.map(j => ({
  name: j.name,
  active: j.active_cases,
  avg_res: j.avg_resolution_days,
  total: j.total_resolved,
  efficiency: j.total_resolved > 0 ? Number((j.total_resolved / (j.active_cases + j.total_resolved) * 100).toFixed(0)) : 0
 })) || [];

 const ageData = analyticsData?.demographics?.age_distribution ? 
  Object.entries(analyticsData.demographics.age_distribution).map(([key, val]) => ({ name: key, value: val })) : [];

 const sexData = analyticsData?.demographics?.sex_distribution ? 
  Object.entries(analyticsData.demographics.sex_distribution).map(([key, val]) => ({ name: key, value: parseFloat(val) })) : [];

 const educationData = analyticsData?.demographics?.education_distribution ? 
  Object.entries(analyticsData.demographics.education_distribution).map(([key, val]) => ({ name: key, value: val })) : [];

 const occupationData = analyticsData?.demographics?.occupation_distribution ? 
  Object.entries(analyticsData.demographics.occupation_distribution).map(([key, val]) => ({ name: key, count: val })) : [];

 const decisionData = analyticsData?.decision_analysis?.distribution ? 
  Object.entries(analyticsData.decision_analysis.distribution).map(([key, val]) => ({ name: key, value: val })) : [];

 const revenueTrendData = analyticsData?.payment_analytics?.revenue_trend || [];
 const categoryRevenueData = analyticsData?.payment_analytics?.category_revenue || [];
 const totalRevenue = analyticsData?.payment_analytics?.total_revenue || 0;

 return (
 <div className="space-y-10 animate-fade-up">
 {/* Header */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Enterprise Reporting</h1>
 <p className="text-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
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
 <p className="text-xs font-bold text-foreground uppercase tracking-tight mt-1">Cases in system</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-purple-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Active Workload</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
 <TrendingUp className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{stats?.active_cases ?? 0}</div>
 <p className="text-xs font-bold text-foreground uppercase tracking-tight mt-1">Currently active</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-amber-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-amber-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Avg Resolution</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
 <AlertTriangle className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{analyticsData?.resolution_time_metrics?.average || 0}<span className="text-lg font-bold text-foreground ml-1">d</span></div>
 <p className="text-xs font-bold text-foreground uppercase tracking-tight mt-1">Filing to verdict</p>
 </CardContent>
 </Card>

 <Card className="bg-card shadow-sm border-border hover:border-emerald-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors" />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Revenue</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
 <ShieldCheck className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">${totalRevenue?.toLocaleString() || systemData?.total_revenue?.toLocaleString() || "0"}</div>
 <p className="text-xs font-bold text-foreground uppercase tracking-tight mt-1">Fees processed</p>
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
 <CardDescription className="text-foreground font-medium">Cases split by origin region.</CardDescription>
 </CardHeader>
 <CardContent className="p-8">
 <div className="h-[300px]">
 {demographicData.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
  <Pie
  data={demographicData}
  cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="count" 
  label={renderCustomizedPieLabel}
  labelLine={{ stroke: 'currentColor', strokeWidth: 1, opacity: 0.2 }}
  stroke="none"
  >
  {demographicData.map((entry, index) => (
  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
  ))}
  </Pie>
  <RechartsTooltip contentStyle={CustomTooltipStyle} />
  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{fontWeight: 900, fontSize: '11px', paddingTop: '20px'}} />

 </PieChart>
 </ResponsiveContainer>
 ) : (
 <div className="flex flex-col h-full items-center justify-center text-foreground border-dashed border-2 border-border rounded-2xl space-y-2">
 <MapPin className="h-8 w-8 text-foreground/30" />
 <p className="font-bold text-sm">No geographic data available</p>
 </div>
 )}
 </div>
 </CardContent>
 {demographicData.length > 0 && (
    <div className="px-8 pb-8">
      <InsightSection 
        title="Regional Distribution Insight"
        question="Case distribution by region?"
        insight={`${demographicData.sort((a,b) => b.count - a.count)[0]?.name || 'N/A'} has the highest concentration of legal activity, accounting for ${((demographicData.sort((a,b) => b.count - a.count)[0]?.count / demographicData.reduce((acc, c) => acc + c.count, 0)) * 100).toFixed(0)}% of regional volume.`}
        meaning="Specific sub-cities are emerging as significant legal hotspots, potentially straining local registry resources."
        action="Allocate additional legal aid resources and registrar support to high-volume hotspots to maintain processing speed."
        colorClass="primary"
      />
    </div>
  )}
 </Card>

 {/* Intelligence Insights */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden border-l-4 border-l-amber-500/50">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-amber-500" /> Intelligence Insights
 </CardTitle>
 <CardDescription className="text-foreground font-medium">Automated warnings and workload balances.</CardDescription>
 </CardHeader>
 <CardContent className="p-8 space-y-4">
 {systemData?.intelligence_insights?.warnings?.length > 0 ? (
 systemData.intelligence_insights.warnings.map((w, idx) => (
 <div key={idx} className="p-4 bg-amber-500/10 rounded-xl text-foreground font-black text-sm font-medium border border-amber-500/20">
 {w}
 </div>
 ))
 ) : (
 <div className="p-4 bg-emerald-500/10 rounded-xl text-foreground font-black text-sm font-medium border border-emerald-500/20">
 ✓ System metrics are stable. No active warnings.
 </div>
 )}
 
 {systemData?.intelligence_insights?.bottlenecks?.length > 0 && (
 <div className="mt-4">
 <h4 className="text-xs font-black uppercase tracking-widest text-rose-600 mb-2 ml-1">Bottlenecks Detected</h4>
 <ul className="list-disc pl-5 text-sm space-y-1 text-foreground font-medium">
 {systemData.intelligence_insights.bottlenecks.map((b, i) => <li key={i}>{b}</li>)}
 </ul>
 </div>
 )}
 <div className="mt-6 border-t border-border pt-6 flex gap-4">
 <div className="flex-1 text-center">
 <p className="text-[10px] font-black text-foreground uppercase tracking-widest mb-2">Overloaded Judges</p>
 <p className="text-3xl font-black font-display text-rose-500">{systemData?.intelligence_insights?.overloaded_judges || 0}</p>
 </div>
 <div className="w-px bg-muted/30"></div>
 <div className="flex-1 text-center">
 <p className="text-[10px] font-black text-foreground uppercase tracking-widest mb-2">Pending Approval</p>
 <p className="text-3xl font-black font-display text-amber-500">{systemData?.intelligence_insights?.pending_registrations || 0}</p>
 </div>
 <div className="w-px bg-muted/30"></div>
 <div className="flex-1 text-center">
 <p className="text-[10px] font-black text-foreground uppercase tracking-widest mb-2">System Backlog</p>
 <p className="text-3xl font-black font-display text-purple-500">{systemData?.intelligence_insights?.system_backlog || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </TabsContent>

 <TabsContent value="analytics" className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
  <div className="grid gap-8 lg:grid-cols-3">
  {/* Case Volume Trends */}
  <Card className="lg:col-span-2 bg-card/60 backdrop-blur-xl border-border shadow-2xl overflow-hidden relative group">
  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
  <CardHeader className="p-8 border-b border-border/50">
  <div className="flex justify-between items-start">
  <div className="space-y-1">
  <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
  <Activity className="h-6 w-6 text-primary" /> Case Velocity & Trajectory
  </CardTitle>
  <CardDescription className="text-foreground font-bold opacity-100">Longitudinal filing volumes with temporal zoom control.</CardDescription>
  </div>
  <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-3 py-1">REAL-TIME</Badge>
  </div>
  </CardHeader>
  <CardContent className="p-8">
  <div className="h-[400px] w-full">
  <ResponsiveContainer width="100%" height="100%">
  <AreaChart data={monthlyTrends}>
  <defs>
  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
  </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(99,102,241,0.12)" />
  <XAxis 
  dataKey="name" 
  fontSize={11} 
  fontWeight={800}
  tickLine={false} 
  axisLine={false} 
  tick={{fill: 'currentColor'}}
  />
  <YAxis 
  fontSize={11} 
  fontWeight={800}
  tickLine={false} 
  axisLine={false} 
  tick={{fill: 'currentColor'}}
  />
  <RechartsTooltip 
  contentStyle={CustomTooltipStyle} 
  cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }} 
  />
  <Area 
  type="monotone" 
  dataKey="CaseVolume" 
  stroke="#6366f1" 
  strokeWidth={4} 
  fillOpacity={1} 
  fill="url(#colorVolume)" 
  animationDuration={2000}
  />
  <Brush 
  dataKey="name" 
  height={30} 
  stroke="#6366f1" 
  fill="rgba(99,102,241,0.08)"
  travellerWidth={10}
  />
  </AreaChart>
  </ResponsiveContainer>
  </div>
  <InsightSection 
    title="Growth Trend Insight"
    question="System usage and filing trajectory?"
    insight={`Case filings have shown a stable presence with ${monthlyTrends[monthlyTrends.length-1]?.CaseVolume || 0} filings this month, reflecting consistent system utilization.`}
    meaning="Ongoing system usage indicates steady public trust and increasing reliance on digital judicial processes."
    action="Scale server infrastructure and support staff to accommodate the forecasted volume growth in the coming quarter."
    colorClass="primary"
  />

  </CardContent>
  </Card>

  {/* Justice Efficiency Radar */}
  <Card className="bg-card/60 backdrop-blur-xl border-border shadow-2xl overflow-hidden border-t-4 border-t-emerald-500/50">
  <CardHeader className="p-8 border-b border-border/50">
  <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-2">
  <Clock className="h-5 w-5 text-emerald-500" /> Efficiency Radar
  </CardTitle>
  <CardDescription className="text-foreground font-bold opacity-100">Comparing resolution thresholds (Days).</CardDescription>
  </CardHeader>
  <CardContent className="p-8">
  <div className="h-[300px] w-full flex items-center justify-center">
  <ResponsiveContainer width="100%" height="100%">
  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={resolutionData}>
  <PolarGrid stroke="rgba(245,158,11,0.2)" />
  <PolarAngleAxis dataKey="subject" tick={{fill: 'currentColor', fontSize: 10, fontWeight: 900}} />
  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{fill: 'currentColor', fontSize: 8}} />
  <Radar
  name="Resolution Time"
  dataKey="value"
  stroke="#f59e0b"
  fill="#f59e0b"
  fillOpacity={0.4}
  animationDuration={2500}
  />
  <RechartsTooltip contentStyle={CustomTooltipStyle} />
  </RadarChart>
  </ResponsiveContainer>
  </div>
  <InsightSection 
    title="Justice Efficiency Insight"
    question="How consistent is the resolution speed?"
    insight={`The system average resolution time is ${analyticsData?.resolution_time_metrics?.average || 0} days, with the most complex cases peaking at ${analyticsData?.resolution_time_metrics?.slowest || 0} days.`}
    meaning="A balanced radar indicates uniform service delivery across case types, while sharp peaks signify specialized procedural bottlenecks."
    action="Implement fast-track protocols for case types identified as outliers in the efficiency radar to normalize overall bench speed."
    colorClass="amber"
  />

  </CardContent>
  </Card>

  {/* Judge Performance Matrix */}
  <Card className="lg:col-span-3 bg-card/60 backdrop-blur-xl border-border shadow-2xl overflow-hidden relative">
  <CardHeader className="p-8 border-b border-border/50 flex flex-row items-center justify-between">
  <div className="space-y-1">
  <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
  <Users className="h-6 w-6 text-purple-500" /> Judicial Performance Matrix
  </CardTitle>
  <CardDescription className="text-foreground font-bold opacity-100">Comparing active caseload vs. resolution efficiency across the bench.</CardDescription>
  </div>
  </CardHeader>
  <CardContent className="p-8">
  <div className="h-[400px] w-full">
  <ResponsiveContainer width="100%" height="100%">
  <ComposedChart data={judgePerformanceData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(20,184,166,0.15)" />
  <XAxis 
  dataKey="name" 
  fontSize={11} 
  fontWeight={800} 
  tickLine={false} 
  axisLine={false} 
  tick={{fill: 'currentColor'}}
  />
  <YAxis 
  yAxisId="left"
  fontSize={11} 
  fontWeight={800} 
  tickLine={false} 
  axisLine={false} 
  tick={{fill: 'currentColor'}}
  label={{ value: 'Active Cases', angle: -90, position: 'insideLeft', style: {fill: 'currentColor', fontWeight: 900, fontSize: 10} }}
  />
  <YAxis 
  yAxisId="right" 
  orientation="right" 
  fontSize={11} 
  fontWeight={800} 
  tickLine={false} 
  axisLine={false} 
  tick={{fill: 'currentColor'}}
  label={{ value: 'Efficiency %', angle: 90, position: 'insideRight', style: {fill: 'currentColor', fontWeight: 900, fontSize: 10} }}
  />
  <RechartsTooltip contentStyle={CustomTooltipStyle} />
  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{fontWeight: 900, fontSize: '11px', paddingTop: '20px'}} />
  <Bar yAxisId="left" dataKey="active" name="Active Caseload" fill="#14b8a6" radius={[8, 8, 0, 0]} barSize={40} />
  <Line yAxisId="right" type="monotone" dataKey="efficiency" name="Clearance Rate %" stroke="#f43f5e" strokeWidth={4} dot={{r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2}} />
  </ComposedChart>
  </ResponsiveContainer>
  </div>
  <InsightSection 
    title="Judicial Performance Insight"
    question="Bench workload vs efficiency balance?"
    insight={`The aggregate bench efficiency is ${(judgePerformanceData.reduce((acc, curr) => acc + curr.efficiency, 0) / (judgePerformanceData.length || 1)).toFixed(0)}%, managing a total of ${judgePerformanceData.reduce((acc, curr) => acc + curr.active, 0)} active cases.`}
    meaning="High active caseload combined with low clearance rates indicates a need for judicial resource expansion or automated mediation tools."
    action="Review caseload distribution for judges in the low-efficiency quadrant and consider temporary file reassignments."
    colorClass="purple"
  />

  </CardContent>
  </Card>

  {/* Category Distribution (Moved up and expanded) */}
  <Card className="lg:col-span-3 bg-card/60 backdrop-blur-xl border-border shadow-2xl overflow-hidden group">
  <CardHeader className="p-8 border-b border-border/50">
  <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-2">
  <Scale className="h-5 w-5 text-primary" /> Category Distribution
  </CardTitle>
  <CardDescription className="text-foreground font-bold opacity-100">Frequency distribution of legal disputes across sectors.</CardDescription>
  </CardHeader>
  <CardContent className="p-8">
  <div className="h-[400px] w-full">
  <ResponsiveContainer width="100%" height="100%">
  <BarChart data={caseTypeDist} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
  <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} stroke="rgba(99,102,241,0.15)" />
  <XAxis type="number" fontSize={11} fontWeight={800} tick={{fill: 'currentColor'}} />
  <YAxis dataKey="name" type="category" fontSize={11} fontWeight={800} width={150} tick={{fill: 'currentColor'}} />
  <RechartsTooltip contentStyle={CustomTooltipStyle} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={35}>
  {caseTypeDist.map((entry, index) => (
  <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
  ))}
  </Bar>
  </BarChart>
  </ResponsiveContainer>
  </div>
  <p className="mt-8 text-sm font-bold text-foreground leading-relaxed border-l-4 border-primary pl-4 bg-primary/5 p-4 rounded-r-xl">
  <span className="text-primary font-black uppercase tracking-wider">Strategic Insight:</span> The data indicates that <span className="font-black">{(caseTypeDist[0]?.name || "N/A")}</span> is the dominant category, representing the largest portion of the current judicial workload.
  </p>
  </CardContent>
  </Card>

  <Card className="lg:col-span-3 bg-card/60 backdrop-blur-xl border-border shadow-2xl overflow-hidden border-t-4 border-t-amber-500/50">
  <CardHeader className="p-8 border-b border-border/50">
  <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
  <Layers className="h-6 w-6 text-amber-500" /> Structural Composition Matrix
  </CardTitle>
  <CardDescription className="text-foreground font-bold opacity-100">Exhaustive demographic breakdown and decision logic distribution.</CardDescription>
  </CardHeader>
  <CardContent className="p-8">
  <div className="grid lg:grid-cols-2 gap-16">
  {/* Age Demographics */}
  <div className="space-y-6">
  <h4 className="text-sm font-black uppercase tracking-[0.3em] text-center text-amber-600 bg-amber-500/5 py-2 rounded-lg">Age Demographics</h4>
  <div className="h-[350px] w-full">
  {ageData.some(d => d.value > 0) ? (
  <ResponsiveContainer width="100%" height="100%">
  <PieChart>
  <Pie 
    data={ageData} 
    cx="50%" cy="50%" 
    innerRadius={70} 
    outerRadius={100} 
    paddingAngle={5} 
    dataKey="value" 
    label={renderCustomizedPieLabel}
    labelLine={{ stroke: 'currentColor', strokeWidth: 1, opacity: 0.2 }}
    stroke="none"
  >
  {ageData.map((entry, index) => <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />)}
  </Pie>
  <RechartsTooltip contentStyle={CustomTooltipStyle} />
  <Legend verticalAlign="bottom" height={40} iconType="diamond" wrapperStyle={{fontWeight: 900, fontSize: '11px', paddingTop: '20px'}} />
  </PieChart>
  </ResponsiveContainer>
  ) : (
  <div className="flex flex-col h-full items-center justify-center text-foreground border-dashed border-2 border-border/50 rounded-3xl space-y-4 bg-amber-500/5">
  <Users className="h-12 w-12 text-amber-500/30" />
  <p className="font-black text-sm uppercase tracking-widest">No Age Data Available</p>
  </div>
  )}
  </div>
  
  {ageData.some(d => d.value > 0) && (
    <InsightSection 
      title="Age Group Insight"
      question="Which age group has the most cases?"
      insight={`${ageData.sort((a,b) => b.value - a.value)[0]?.name || 'N/A'} is the most legally active demographic, accounting for a significant portion of active litigation.`}
      meaning="This specific age range typically represents the core workforce, facing higher exposure to business and civil disputes."
      action="Develop targeted legal awareness campaigns and simplified self-service tools tailored for this active age group."
      colorClass="amber"
    />
  )}

  </div>

  {/* Sex Demographics */}
  <div className="space-y-6">
  <h4 className="text-sm font-black uppercase tracking-[0.3em] text-center text-primary bg-primary/5 py-2 rounded-lg">Sex Demographics</h4>
  <div className="h-[350px] w-full">
  {sexData.some(d => d.value > 0) ? (
  <ResponsiveContainer width="100%" height="100%">
  <PieChart>
  <Pie 
    data={sexData} 
    cx="50%" cy="50%" 
    innerRadius={70} 
    outerRadius={100} 
    paddingAngle={5} 
    dataKey="value" 
    label={renderCustomizedPieLabel}
    labelLine={{ stroke: 'currentColor', strokeWidth: 1, opacity: 0.2 }}
    stroke="none"
  >
  {sexData.map((entry, index) => <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[(index + 2) % VIBRANT_COLORS.length]} />)}
  </Pie>
  <RechartsTooltip contentStyle={CustomTooltipStyle} />
  <Legend verticalAlign="bottom" height={40} iconType="diamond" wrapperStyle={{fontWeight: 900, fontSize: '11px', paddingTop: '20px'}} />
  </PieChart>
  </ResponsiveContainer>
  ) : (
  <div className="flex flex-col h-full items-center justify-center text-foreground border-dashed border-2 border-border/50 rounded-3xl space-y-4 bg-primary/5">
  <Users className="h-12 w-12 text-primary/30" />
  <p className="font-black text-sm uppercase tracking-widest">No Sex Data Available</p>
  </div>
  )}
  </div>
  
  {sexData.some(d => d.value > 0) && (
    <InsightSection 
      title="Gender (Sex) Insight"
      question="Legal representation by gender?"
      insight={`${sexData.sort((a,b) => b.value - a.value)[0]?.name || 'N/A'} users currently lead case filings, highlighting gender-specific patterns in legal system usage.`}
      meaning="The data suggests a possible imbalance in legal system access or different types of legal exposure across genders."
      action="Implement gender-sensitive outreach programs to ensure equitable access to justice for all citizens."
      colorClass="primary"
    />
  )}

  </div>

  {/* Education Demographics */}
  <div className="space-y-6">
  <h4 className="text-sm font-black uppercase tracking-[0.3em] text-center text-emerald-600 bg-emerald-500/5 py-2 rounded-lg">Education Demographics</h4>
  <div className="h-[350px] w-full">
  {educationData.some(d => d.value > 0) ? (
  <ResponsiveContainer width="100%" height="100%">
  <PieChart>
  <Pie 
    data={educationData} 
    cx="50%" cy="50%" 
    innerRadius={70} 
    outerRadius={100} 
    paddingAngle={5} 
    dataKey="value" 
    label={renderCustomizedPieLabel}
    labelLine={{ stroke: 'currentColor', strokeWidth: 1, opacity: 0.2 }}
    stroke="none"
  >
  {educationData.map((entry, index) => <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[(index + 4) % VIBRANT_COLORS.length]} />)}
  </Pie>
  <RechartsTooltip contentStyle={CustomTooltipStyle} />
  <Legend verticalAlign="bottom" height={40} iconType="diamond" wrapperStyle={{fontWeight: 900, fontSize: '11px', paddingTop: '20px'}} />
  </PieChart>
  </ResponsiveContainer>
  ) : (
  <div className="flex flex-col h-full items-center justify-center text-foreground border-dashed border-2 border-border/50 rounded-3xl space-y-4 bg-emerald-500/5">
  <Users className="h-12 w-12 text-emerald-500/30" />
  <p className="font-black text-sm uppercase tracking-widest">No Education Data Available</p>
  </div>
  )}
  </div>
  
  {educationData.some(d => d.value > 0) && (
    <InsightSection 
      title="Education Level Insight"
      question="Education level vs legal engagement?"
      insight={`${educationData.sort((a,b) => b.value - a.value)[0]?.name || 'N/A'} holders represent the largest block, often involved in specialized litigation.`}
      meaning="Different education levels exhibit distinct legal needs, with higher education levels correlating with complex contractual disputes."
      action="Customize legal educational materials and portal guides to match the literacy and complexity needs of different education tiers."
      colorClass="emerald"
    />
  )}

  </div>

  {/* Occupation Demographics */}
  <div className="space-y-6">
  <h4 className="text-sm font-black uppercase tracking-[0.3em] text-center text-purple-600 bg-purple-500/5 py-2 rounded-lg">Occupation Distribution</h4>
  <div className="h-[350px] w-full">
  {occupationData.some(d => d.count > 0) ? (
  <ResponsiveContainer width="100%" height="100%">
  <BarChart data={occupationData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
  <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} stroke="rgba(168,85,247,0.15)" />
  <XAxis type="number" fontSize={11} fontWeight={800} tick={{fill: 'currentColor'}} />
  <YAxis dataKey="name" type="category" fontSize={11} fontWeight={800} width={100} tick={{fill: 'currentColor'}} />
  <RechartsTooltip contentStyle={CustomTooltipStyle} cursor={{ fill: 'rgba(168,85,247,0.06)' }} />
  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={25}>
  {occupationData.map((entry, index) => (
  <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[(index + 1) % VIBRANT_COLORS.length]} />
  ))}
  </Bar>
  </BarChart>
  </ResponsiveContainer>
  ) : (
  <div className="flex flex-col h-full items-center justify-center text-foreground border-dashed border-2 border-border/50 rounded-3xl space-y-4 bg-purple-500/5">
  <Users className="h-12 w-12 text-purple-500/30" />
  <p className="font-black text-sm uppercase tracking-widest">No Occupation Data Available</p>
  </div>
  )}
  </div>
  
  {occupationData.some(d => d.count > 0) && (
    <InsightSection 
      title="Occupation Insight"
      question="Which occupation has more legal disputes?"
      insight={`${occupationData.sort((a,b) => b.count - a.count)[0]?.name || 'N/A'} group contributes the highest volume of cases, predominantly in civil and commercial sectors.`}
      meaning="The dominance of this occupation group suggests high legal exposure in business-related or labor-intensive roles."
      action="Deploy specialized contract templates and dispute prevention tools specifically for this high-exposure occupation group."
      colorClass="purple"
    />
  )}

  </div>

  </div>
  <div className="mt-16 p-8 bg-gradient-to-br from-amber-500/5 via-transparent to-primary/5 rounded-3xl border border-border/50 relative overflow-hidden">
  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-primary to-amber-500 opacity-30" />
  <p className="text-sm font-bold text-foreground leading-loose text-center uppercase tracking-[0.1em]">
  * This structural analysis is synchronized with real-time system metrics. Use these insights to identify under-served demographics and optimize resolution pipelines for maximum court efficiency.
  </p>
  </div>
  </CardContent>
  </Card>
  {/* Financial Intelligence Section */}
  <Card className="lg:col-span-3 bg-card/60 backdrop-blur-xl border-border shadow-2xl overflow-hidden border-t-4 border-t-emerald-500/50">
  <CardHeader className="p-8 border-b border-border/50">
  <div className="flex flex-wrap justify-between items-center gap-4">
  <div className="space-y-1">
  <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
  <ShieldCheck className="h-6 w-6 text-emerald-500" /> Financial Intelligence
  </CardTitle>
  <CardDescription className="text-foreground font-bold opacity-100">
  Revenue trajectory and judicial fee collection — sourced live from verified payment records.
  </CardDescription>
  </div>
  <div className="flex items-center gap-6">
  <div className="text-center px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Total Verified Revenue</p>
  <p className="text-3xl font-black font-display text-emerald-500">
  {totalRevenue > 0 ? `$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'}
  </p>
  </div>
  <div className="text-center px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20">
  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Sectors Tracked</p>
  <p className="text-3xl font-black font-display text-foreground">{categoryRevenueData.length}</p>
  </div>
  <div className="text-center px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-1">Data Points</p>
  <p className="text-3xl font-black font-display text-foreground">{revenueTrendData.length}</p>
  </div>
  </div>
  </div>
  </CardHeader>
  <CardContent className="p-8">
  {(revenueTrendData.length === 0 && categoryRevenueData.length === 0) ? (
  <div className="flex flex-col items-center justify-center py-24 gap-6 border-dashed border-2 border-emerald-500/20 rounded-3xl bg-emerald-500/5">
  <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center">
  <ShieldCheck className="h-10 w-10 text-emerald-500/40" />
  </div>
  <div className="text-center space-y-2">
  <p className="font-black text-lg uppercase tracking-widest text-foreground">No Financial Data Available</p>
  <p className="text-sm font-medium text-muted-foreground max-w-md">
  Revenue charts will populate once payments reach <span className="font-bold text-emerald-500">SUCCESS</span> or <span className="font-bold text-emerald-500">VERIFIED</span> status in the system.
  </p>
  </div>
  </div>
  ) : (
  <div className="grid lg:grid-cols-2 gap-12">
  {/* Monthly Revenue Trend Bar Chart */}
  <div className="space-y-4">
  <div className="flex items-center justify-between">
  <h4 className="text-sm font-black uppercase tracking-[0.25em] text-emerald-600">Monthly Revenue Trend</h4>
  <span className="text-xs font-bold text-muted-foreground bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
  {revenueTrendData.length} months
  </span>
  </div>
  <div className="h-[320px] w-full">
  {revenueTrendData.length > 0 ? (
  <ResponsiveContainer width="100%" height="100%">
  <BarChart
  data={revenueTrendData}
  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
  barCategoryGap="30%"
  >
  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(16,185,129,0.1)" />
  <XAxis
  dataKey="month"
  fontSize={11}
  fontWeight={700}
  tickLine={false}
  axisLine={false}
  tick={{ fill: 'currentColor' }}
  />
  <YAxis
  fontSize={11}
  fontWeight={700}
  tickLine={false}
  axisLine={false}
  tick={{ fill: 'currentColor' }}
  tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`}
  width={55}
  />
  <RechartsTooltip
  contentStyle={CustomTooltipStyle}
  formatter={(value) => [`$${Number(value).toLocaleString('en-US', {minimumFractionDigits: 2})}`, 'Revenue']}
  />
  <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={60} />
  </BarChart>
  </ResponsiveContainer>
  ) : (
  <div className="flex flex-col h-full items-center justify-center border-dashed border-2 border-emerald-500/20 rounded-2xl bg-emerald-500/5 gap-3">
  <TrendingUp className="h-10 w-10 text-emerald-500/30" />
  <p className="font-black text-sm uppercase tracking-widest text-muted-foreground">No Monthly Data Yet</p>
  </div>
  )}
  </div>
  </div>

  {/* Fee Distribution Donut Chart */}
  <div className="space-y-4">
  <div className="flex items-center justify-between">
  <h4 className="text-sm font-black uppercase tracking-[0.25em] text-primary">Fee Distribution by Sector</h4>
  <span className="text-xs font-bold text-muted-foreground bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
  {categoryRevenueData.length} categories
  </span>
  </div>
  <div className="h-[320px] w-full">
  {categoryRevenueData.length > 0 ? (
  <ResponsiveContainer width="100%" height="100%">
  <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
  <Pie
  data={categoryRevenueData}
  cx="50%"
  cy="45%"
  innerRadius={75}
  outerRadius={115}
  paddingAngle={4}
  dataKey="value"
  label={renderCustomizedPieLabel}
  labelLine={{ stroke: 'currentColor', strokeWidth: 1, opacity: 0.2 }}
  stroke="none"
  >
  {categoryRevenueData.map((entry, index) => (
  <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
  ))}
  </Pie>
  <RechartsTooltip
  contentStyle={CustomTooltipStyle}
  formatter={(value) => [`$${Number(value).toLocaleString('en-US', {minimumFractionDigits: 2})}`, 'Revenue']}
  />
  <Legend
  verticalAlign="bottom"
  height={40}
  iconType="circle"
  iconSize={10}
  wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 800 }}
  formatter={(value) => <span className="font-black">{value}</span>}
  />

  </PieChart>
  </ResponsiveContainer>
  ) : (
  <div className="flex flex-col h-full items-center justify-center border-dashed border-2 border-primary/20 rounded-2xl bg-primary/5 gap-3">
  <Layers className="h-10 w-10 text-primary/30" />
  <p className="font-black text-sm uppercase tracking-widest text-muted-foreground">No Category Data Yet</p>
  </div>
  )}
  </div>
  </div>
  </div>
  )}

  {/* Category breakdown table */}
  {categoryRevenueData.length > 0 && (
  <div className="mt-10 border-t border-border/50 pt-8">
  <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
  <Layers className="h-4 w-4 text-primary" /> Revenue Breakdown by Legal Category
  </h4>
  <div className="grid gap-3">
  {categoryRevenueData.map((item, i) => {
  const pct = totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) : 0;
  return (
  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/20 border border-border/30">
  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: VIBRANT_COLORS[i % VIBRANT_COLORS.length] }} />
  <span className="text-sm font-black flex-1 text-foreground">{item.name}</span>
  <div className="flex-1 h-2 bg-border/40 rounded-full overflow-hidden">
  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: VIBRANT_COLORS[i % VIBRANT_COLORS.length] }} />
  </div>
  <span className="text-xs font-black text-muted-foreground w-12 text-right">{pct}%</span>
  <span className="text-sm font-black text-foreground w-28 text-right">
  ${Number(item.value).toLocaleString('en-US', {minimumFractionDigits: 2})}
  </span>
  </div>
  );
  })}
  </div>
  </div>
  )}

  {totalRevenue > 0 && (
    <InsightSection 
      title="Financial Intelligence Insight"
      question="What is the primary revenue driver?"
      insight={`The system has collected $${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})} in judicial fees, with ${categoryRevenueData[0]?.name || "N/A"} contributing ${((categoryRevenueData[0]?.value / totalRevenue) * 100).toFixed(0)}% of total revenue.`}
      meaning="Revenue concentration in specific case types suggests high commercial or civil litigation volume which drives fiscal sustainability."
      action="Review fee structures for high-volume sectors to ensure they remain competitive yet reflective of administrative overhead."
      colorClass="rose"
    />
  )}

  </CardContent>
  </Card>
  </div>
 </TabsContent>

 <TabsContent value="exports" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-2xl font-black font-display tracking-tight">Report Generation Engine</CardTitle>
 <CardDescription className="text-foreground font-medium">Generate official data exports parameterized by temporal limits.</CardDescription>
 </CardHeader>
 <CardContent className="p-8 space-y-8">
 <div className="grid md:grid-cols-3 gap-6 items-end pb-8 border-b border-border">
 <div className="space-y-2">
 <Label className="text-xs font-black uppercase tracking-widest text-foreground ml-1">Predefined Range</Label>
 <Select value={predefinedRange} onValueChange={handlePredefinedRange}>
 <SelectTrigger className="h-12 bg-background border-border rounded-xl">
 <SelectValue placeholder="Custom Range" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="custom">Custom Range</SelectItem>
 <SelectItem value="today">Today</SelectItem>
 <SelectItem value="last_2_days">Last 2 Days</SelectItem>
 <SelectItem value="last_3_days">Last 3 Days</SelectItem>
 <SelectItem value="1_week">Last 1 Week</SelectItem>
 <SelectItem value="2_weeks">Last 2 Weeks</SelectItem>
 <SelectItem value="1_month">Last 1 Month</SelectItem>
 <SelectItem value="3_months">Last 3 Months</SelectItem>
 <SelectItem value="6_months">Last 6 Months</SelectItem>
 <SelectItem value="1_year">Last 1 Year</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-black uppercase tracking-widest text-foreground ml-1">Start Date Boundary</Label>
 <Input 
 type="date" 
 value={exportStartDate} 
 onChange={(e) => { setExportStartDate(e.target.value); setPredefinedRange("custom"); }} 
 className="h-12 bg-background border-border rounded-xl focus:ring-primary/20 font-medium"
 />
 </div>
 <div className="space-y-2 relative">
 <Label className="text-xs font-black uppercase tracking-widest text-foreground ml-1">End Date Boundary</Label>
 <Input 
 type="date" 
 value={exportEndDate} 
 onChange={(e) => { setExportEndDate(e.target.value); setPredefinedRange("custom"); }} 
 className="h-12 bg-background border-border rounded-xl focus:ring-primary/20 font-medium"
 />
 <p className="absolute -bottom-5 left-1 text-[9px] font-bold text-foreground uppercase tracking-tight">Leave bounds empty for historical data.</p>
 </div>
 </div>

 <div className="grid gap-8 md:grid-cols-3">
 {/* PDF Block */}
 <div className="rounded-2xl border border-border p-8 flex flex-col items-center text-center hover:border-rose-500/30 hover:bg-rose-500/5 transition-all duration-500 group">
 <div className="h-16 w-16 rounded-[2rem] bg-rose-500/10 text-rose-500 flex items-center justify-center mb-6 transform group-hover:-rotate-6 transition-transform duration-500 shadow-lg shadow-rose-500/10">
 <FileText className="h-8 w-8" />
 </div>
 <h3 className="font-black font-display text-lg mb-2 tracking-tight">Executive Summary</h3>
 <p className="text-sm text-foreground font-medium mb-8 leading-relaxed">Formatted PDF optimized for printing and presentations.</p>
 
 <div className="flex flex-col gap-2 w-full mt-auto">
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest" variant="outline" onClick={() => handleDownload('pdf', 'system')} disabled={isDownloading}>
 {isDownloading && downloadFormat === 'pdf' && downloadType === 'system' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Download className="mr-2 h-4 w-4" /> System PDF</>}
 </Button>
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest" variant="outline" onClick={() => handleDownload('pdf', 'analytics')} disabled={isDownloading}>
 {isDownloading && downloadFormat === 'pdf' && downloadType === 'analytics' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Analytics PDF</>}
 </Button>
 </div>
 </div>

 {/* Excel Block */}
 <div className="rounded-2xl border border-border p-8 flex flex-col items-center text-center hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-500 group">
 <div className="h-16 w-16 rounded-[2rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 transform group-hover:-rotate-6 transition-transform duration-500 shadow-lg shadow-emerald-500/10">
 <FileSpreadsheet className="h-8 w-8" />
 </div>
 <h3 className="font-black font-display text-lg mb-2 tracking-tight">Analytical Workbook</h3>
 <p className="text-sm text-foreground font-medium mb-8 leading-relaxed">Multi-sheet dataset for financial deep-dive analysis.</p>
 
 <div className="flex flex-col gap-2 w-full mt-auto">
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20" onClick={() => handleDownload('excel', 'system')} disabled={isDownloading}>
 {isDownloading && downloadFormat === 'excel' && downloadType === 'system' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Download className="mr-2 h-4 w-4" /> System XLSX</>}
 </Button>
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20" onClick={() => handleDownload('excel', 'analytics')} disabled={isDownloading}>
 {isDownloading && downloadFormat === 'excel' && downloadType === 'analytics' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Analytics XLSX</>}
 </Button>
 </div>
 </div>

 {/* CSV Block */}
 <div className="rounded-2xl border border-border p-8 flex flex-col items-center text-center hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-500 group">
 <div className="h-16 w-16 rounded-[2rem] bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6 transform group-hover:-rotate-6 transition-transform duration-500 shadow-lg shadow-amber-500/10">
 <DownloadCloud className="h-8 w-8" />
 </div>
 <h3 className="font-black font-display text-lg mb-2 tracking-tight">Raw Data Matrix</h3>
 <p className="text-sm text-foreground font-medium mb-8 leading-relaxed">Flattened matrix for database ingestion and ML pipelines.</p>
 
 <div className="flex flex-col gap-2 w-full mt-auto">
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest border-amber-500/20 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700" variant="outline" onClick={() => handleDownload('csv', 'system')} disabled={isDownloading}>
 {isDownloading && downloadFormat === 'csv' && downloadType === 'system' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Download className="mr-2 h-4 w-4" /> System CSV</>}
 </Button>
 <Button className="w-full rounded-xl font-bold text-xs uppercase tracking-widest border-amber-500/20 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700" variant="outline" onClick={() => handleDownload('csv', 'analytics')} disabled={isDownloading}>
 {isDownloading && downloadFormat === 'csv' && downloadType === 'analytics' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Analytics CSV</>}
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
