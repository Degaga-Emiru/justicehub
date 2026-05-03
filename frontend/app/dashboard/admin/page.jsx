"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUsers, fetchDashboardStats, fetchDetailedAnalytics, fetchSystemHealth, fetchHearings } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, FileText, Clock, CheckCircle, AlertTriangle, Gavel, 
  Loader2, ArrowRight, BarChart3, ShieldCheck, Activity, 
  Server, Calendar, TrendingUp, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, Cell, AreaChart, Area
} from "recharts";
import { format } from "date-fns";

export default function AdminOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["detailed-analytics"],
    queryFn: () => fetchDetailedAnalytics(),
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["system-health"],
    queryFn: () => fetchSystemHealth(),
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: todayHearings, isLoading: hearingsLoading } = useQuery({
    queryKey: ["today-hearings"],
    queryFn: () => fetchHearings({ date: format(new Date(), "yyyy-MM-dd") }),
  });

  const isLoading = statsLoading || usersLoading || analyticsLoading || healthLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-[50vh] items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-black text-foreground uppercase tracking-widest">Generating Insights...</p>
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
      color: "text-foreground",
      bg: "bg-blue-500/10",
      glow: "bg-blue-500/5",
    },
    {
      title: "Active Cases",
      value: stats?.active_cases ?? 0,
      icon: Gavel,
      description: `${stats?.pending_review ?? 0} awaiting review`,
      href: "/dashboard/admin/cases",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      glow: "bg-purple-500/5",
    },
    {
        title: "Resolution Rate",
        value: stats?.total_cases ? `${((stats?.closed_cases / (stats?.total_cases || 1)) * 100).toFixed(1)}%` : "0%",
        icon: CheckCircle,
        description: "Overall case closure rate",
        href: "/dashboard/admin/reports",
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        glow: "bg-emerald-500/5",
    },
    {
        title: "System Health",
        value: health?.status === "HEALTHY" ? "Optimal" : health?.status || "Unknown",
        icon: Server,
        description: `${health?.performance?.avg_response_ms || 0}ms avg response`,
        href: "/dashboard/admin/settings",
        color: health?.status === "HEALTHY" ? "text-emerald-500" : "text-foreground",
        bg: health?.status === "HEALTHY" ? "bg-emerald-500/10" : "bg-amber-500/10",
        glow: health?.status === "HEALTHY" ? "bg-emerald-500/5" : "bg-amber-500/5",
    },
  ];

  const caseFlowData = analytics?.case_flow_trends || [];
  const judgeData = analytics?.judge_metrics || [];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Analytics Command Center</h1>
          <p className="text-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            JusticeHub System Intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/dashboard/admin/reports">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
                    Generate Full Audit
                </button>
            </Link>
        </div>
      </div>

      {/* System Alerts Section (If any) */}
      {health?.alerts?.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {health.alerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border ${
              alert.level === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-amber-500/10 border-amber-500/20 text-foreground'
            }`}>
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest">System {alert.level}</p>
                <p className="text-sm font-bold leading-tight">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className={`bg-card shadow-sm border-border hover:border-primary/30 transition-all duration-500 overflow-hidden relative group cursor-pointer`}>
                <div className={`absolute top-0 right-0 w-24 h-24 ${card.glow} rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">{card.title}</CardTitle>
                  <div className={`h-8 w-8 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black font-display text-foreground">{card.value}</div>
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-tight mt-1">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Case Flow Trends */}
        <Card className="lg:col-span-2 bg-card border-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black font-display">Case Flow Trends</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-tight">Last 30 Days: Created vs. Closed</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Created</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Closed</div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={caseFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 700, fill: 'currentColor'}}
                    tickFormatter={(val) => {
                        try {
                            return format(new Date(val), "MMM d");
                        } catch (e) {
                            return val;
                        }
                    }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 700, fill: 'currentColor'}}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', fontSize: '10px', fontWeight: '900', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="created" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCreated)" />
                  <Area type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorClosed)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Today's Hearings */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl font-black font-display">Hearings</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-tight">Scheduled for Today</CardDescription>
            </div>
            <Calendar className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayHearings?.length > 0 ? (
                todayHearings.map((h, i) => {
                  const hearingDate = h.scheduled_date ? new Date(h.scheduled_date) : null;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-primary">
                          {hearingDate ? format(hearingDate, "HH") : '00'}
                        </span>
                        <span className="text-[8px] font-black text-foreground uppercase">
                          {hearingDate ? format(hearingDate, "mm") : '00'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black truncate">{h.case_details?.title || h.title || "Court Hearing"}</p>
                        <p className="text-[10px] font-bold text-foreground uppercase tracking-tight truncate">
                          {h.location || "Main Courtroom"} • {h.hearing_type || 'General'}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-90">
                    <Calendar className="h-10 w-10 text-foreground" />
                    <p className="text-xs font-black uppercase tracking-widest text-foreground">No hearings today</p>
                </div>
              )}
              <Link href="/dashboard/admin/hearings">
                <button className="w-full mt-2 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors">
                    View Full Calendar <ArrowRight className="h-3 w-3" />
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
          {/* Judge Load Intelligence */}
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    <CardTitle className="text-xl font-black font-display">Judge Load Intelligence</CardTitle>
                </div>
                <CardDescription className="text-xs font-bold uppercase tracking-tight">Active Case Load & Performance Ranking</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={judgeData} layout="vertical" margin={{ left: 40, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 10, fontWeight: 700, fill: 'currentColor'}}
                            />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', fontSize: '10px', fontWeight: '900', color: '#fff' }}
                            />
                            <Bar dataKey="active_cases" radius={[0, 4, 4, 0]} barSize={20}>
                                {judgeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.active_cases > 5 ? '#f43f5e' : entry.active_cases > 3 ? '#a855f7' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
          </Card>

          {/* Intelligence Insights */}
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-foreground" />
                    <CardTitle className="text-xl font-black font-display">Judicial Insights</CardTitle>
                </div>
                <CardDescription className="text-xs font-bold uppercase tracking-tight text-foreground">Smart alerts and system trends</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {analytics?.intelligence_insights?.warnings?.map((warning, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                            <AlertTriangle className="h-4 w-4 text-foreground shrink-0" />
                            <p className="text-xs font-bold text-foreground leading-relaxed">{warning}</p>
                        </div>
                    ))}
                    {analytics?.intelligence_insights?.bottlenecks?.map((bottleneck, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <Activity className="h-4 w-4 text-foreground shrink-0" />
                            <p className="text-xs font-bold text-foreground leading-relaxed">{bottleneck}</p>
                        </div>
                    ))}
                    <div className="pt-2 grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground mb-1">Avg Resolution</p>
                            <p className="text-2xl font-black font-display">{analytics?.resolution_time_metrics?.average || 0}d</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground mb-1">Backlog</p>
                            <p className="text-2xl font-black font-display text-red-500">{analytics?.intelligence_insights?.system_backlog || 0}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
