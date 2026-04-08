"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUsers, fetchDashboardStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Clock, CheckCircle, AlertTriangle, Gavel, Loader2 } from "lucide-react";
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
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            href: "/dashboard/admin",
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            title: "Total Cases",
            value: stats?.total_cases ?? 0,
            icon: FileText,
            description: `${stats?.active_cases ?? 0} active · ${stats?.closed_cases ?? 0} closed`,
            href: "/dashboard/admin/cases",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
        },
        {
            title: "Pending Review",
            value: stats?.pending_review ?? 0,
            icon: Clock,
            description: "Cases awaiting registrar review",
            href: "/dashboard/admin/cases",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
        },
        {
            title: "Active Cases",
            value: stats?.active_cases ?? 0,
            icon: Gavel,
            description: "Assigned & in progress",
            href: "/dashboard/admin/cases",
            color: "text-violet-500",
            bg: "bg-violet-500/10",
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">System overview and key metrics.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link key={card.title} href={card.href}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {card.title}
                                    </CardTitle>
                                    <div className={`p-2 rounded-lg ${card.bg}`}>
                                        <Icon className={`h-4 w-4 ${card.color}`} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{card.value}</div>
                                    <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {/* Quick links */}
            <div className="grid gap-4 md:grid-cols-3">
                <Link href="/dashboard/admin">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                User Management
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Create, update roles, and manage system users.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/admin/audit-logs">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Audit Logs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Monitor system activity and user actions.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/admin/reports">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                                Reports & Analytics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                View case statistics and performance metrics.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
