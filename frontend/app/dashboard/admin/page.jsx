"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUsers, fetchDashboardStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, Clock, CheckCircle, AlertTriangle, Gavel, Loader2, ArrowRight, BarChart3, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AdminOverviewPage() {
 const { data: stats, isLoading: statsLoading } = useQuery({
 queryKey: ["dashboard-stats"],
 queryFn: fetchDashboardStats,
 });

 const { data: users, isLoading: usersLoading } = useQuery({
 queryKey: ["users"],
 queryFn: () => fetchUsers(),
 });

 const isLoading = statsLoading || usersLoading;

 if (isLoading) {
 return (
 <div className="flex flex-col h-[50vh] items-center justify-center gap-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Loading Dashboard...</p>
 </div>
 );
 }

 const totalUsers = Array.isArray(users) ? users.length : 0;
 const usersByRole = Array.isArray(users)
 ? users.reduce((acc, u) => {
 acc[u.role] = (acc[u.role] || 0) + 1;
 return acc;
 }, {})
 : {};

 const statCards = [
 {
 title: "Total Users",
 value: totalUsers,
 icon: Users,
 description: `${usersByRole["JUDGE"] || 0} Judges · ${usersByRole["REGISTRAR"] || 0} Registrars`,
 href: "/dashboard/admin/users",
 color: "text-blue-500",
 bg: "bg-blue-500/10",
 glow: "bg-blue-500/5",
 borderHover: "hover:border-blue-500/30",
 },
 {
 title: "Total Cases",
 value: stats?.total_cases ?? 0,
 icon: FileText,
 description: `${stats?.active_cases ?? 0} active · ${stats?.closed_cases ?? 0} closed`,
 href: "/dashboard/admin/cases",
 color: "text-emerald-500",
 bg: "bg-emerald-500/10",
 glow: "bg-emerald-500/5",
 borderHover: "hover:border-emerald-500/30",
 },
 {
 title: "Pending Review",
 value: stats?.pending_review ?? 0,
 icon: Clock,
 description: "Cases awaiting registrar review",
 href: "/dashboard/admin/cases",
 color: "text-amber-500",
 bg: "bg-amber-500/10",
 glow: "bg-amber-500/5",
 borderHover: "hover:border-amber-500/30",
 },
 {
 title: "Active Cases",
 value: stats?.active_cases ?? 0,
 icon: Gavel,
 description: "Assigned & in progress",
 href: "/dashboard/admin/cases",
 color: "text-purple-500",
 bg: "bg-purple-500/10",
 glow: "bg-purple-500/5",
 borderHover: "hover:border-purple-500/30",
 },
 ];

 const quickLinks = [
 {
 title: "User Management",
 description: "Create, update roles, and manage system users.",
 icon: Users,
 color: "text-blue-500",
 bg: "bg-blue-500/10",
 href: "/dashboard/admin/users",
 },
 {
 title: "Audit Logs",
 description: "Monitor system activity and user actions.",
 icon: AlertTriangle,
 color: "text-amber-500",
 bg: "bg-amber-500/10",
 href: "/dashboard/admin/audit-logs",
 },
 {
 title: "Reports & Analytics",
 description: "View case statistics and performance metrics.",
 icon: BarChart3,
 color: "text-emerald-500",
 bg: "bg-emerald-500/10",
 href: "/dashboard/admin/reports",
 },
 ];

 return (
 <div className="space-y-10 animate-fade-up">
 {/* Header */}
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Admin Dashboard</h1>
 <p className="text-muted-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
 <ShieldCheck className="h-5 w-5 text-primary" />
 System overview and key metrics.
 </p>
 </div>

 {/* Stat Cards */}
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
 {statCards.map((card) => {
 const Icon = card.icon;
 return (
 <Link key={card.title} href={card.href}>
 <Card className={`bg-card shadow-sm border-border ${card.borderHover} transition-all duration-500 overflow-hidden relative group cursor-pointer`}>
 <div className={`absolute top-0 right-0 w-24 h-24 ${card.glow} rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700`} />
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{card.title}</CardTitle>
 <div className={`h-10 w-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
 <Icon className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{card.value}</div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mt-1">{card.description}</p>
 </CardContent>
 </Card>
 </Link>
 );
 })}
 </div>

 {/* Quick links */}
 <div className="grid gap-6 md:grid-cols-3">
 {quickLinks.map((link) => {
 const Icon = link.icon;
 return (
 <Link key={link.title} href={link.href}>
 <Card className="bg-card shadow-sm border-border hover:border-primary/30 transition-all duration-500 cursor-pointer group h-full">
 <CardHeader className="pb-3">
 <div className="flex items-center gap-3">
 <div className={`h-10 w-10 rounded-xl ${link.bg} ${link.color} flex items-center justify-center shrink-0 transform group-hover:-rotate-6 transition-transform duration-500`}>
 <Icon className="h-5 w-5" />
 </div>
 <CardTitle className="text-lg font-black font-display tracking-tight group-hover:text-primary transition-colors">{link.title}</CardTitle>
 </div>
 </CardHeader>
 <CardContent>
 <p className="text-sm text-muted-foreground font-medium leading-relaxed">{link.description}</p>
 <div className="flex items-center gap-1 mt-4 text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
 Open <ArrowRight className="h-3 w-3" />
 </div>
 </CardContent>
 </Card>
 </Link>
 );
 })}
 </div>
 </div>
 );
}
