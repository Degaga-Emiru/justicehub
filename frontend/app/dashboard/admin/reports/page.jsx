"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDashboardStats, fetchCaseTypeDistribution, fetchUsers } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Loader2 } from "lucide-react";

const PIE_COLORS = [
    "hsl(215, 50%, 45%)",
    "hsl(142, 76%, 36%)",
    "hsl(199, 89%, 48%)",
    "hsl(38, 92%, 50%)",
    "hsl(340, 65%, 50%)",
    "hsl(270, 50%, 50%)",
    "hsl(180, 60%, 40%)",
];

export default function ReportsPage() {
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: fetchDashboardStats,
    });

    const { data: distribution, isLoading: distLoading } = useQuery({
        queryKey: ["case-type-distribution"],
        queryFn: fetchCaseTypeDistribution,
    });

    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ["users"],
        queryFn: () => fetchUsers(),
    });

    const isLoading = statsLoading || distLoading || usersLoading;

    if (isLoading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    const totalCases = stats?.total_cases ?? 0;
    const activeCases = stats?.active_cases ?? 0;
    const pendingCases = stats?.pending_review ?? 0;
    const closedCases = stats?.closed_cases ?? 0;
    const totalUsers = Array.isArray(users) ? users.length : 0;

    // Format distribution data for pie chart
    const pieData = Array.isArray(distribution)
        ? distribution.map((item, i) => ({
              name: item.category__name || item.name || `Category ${i + 1}`,
              value: item.count || item.active + item.pending + item.closed || 0,
              fill: PIE_COLORS[i % PIE_COLORS.length],
          }))
        : [];

    // Status breakdown for bar chart
    const statusData = [
        { name: "Pending", count: pendingCases },
        { name: "Active", count: activeCases },
        { name: "Closed", count: closedCases },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Judicial Analytics</h1>
                <p className="text-muted-foreground">System performance metrics and case statistics.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCases}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Workload</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCases}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCases}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Case Status Breakdown</CardTitle>
                        <CardDescription>Current distribution by status.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                    />
                                    <Bar dataKey="count" name="Cases" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Case Distribution by Category</CardTitle>
                        <CardDescription>Breakdown of legal matter categories.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    No category data available yet.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
