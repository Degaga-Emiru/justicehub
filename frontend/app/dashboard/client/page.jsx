"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCases, fetchHearings } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, ArrowRight, Clock, PlusCircle, AlertTriangle, CreditCard, CheckCircle } from "lucide-react";
import Link from "next/link";
import { statusColors } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";

const STATUS_LABELS = {
    PENDING_REVIEW: "Pending Review",
    APPROVED: "Awaiting Payment",
    REJECTED: "Rejected",
    PAID: "Pending Payment Verification",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In Progress",
    CLOSED: "Closed",
};

export default function ClientDashboard() {
    const { user } = useAuthStore();
    const { t } = useLanguage();
    const { data: cases, isLoading: loadingCases } = useQuery({
        queryKey: ["cases", user?.id],
        queryFn: () => fetchCases(),
        enabled: !!user,
    });

    const { data: hearings, isLoading: loadingHearings } = useQuery({
        queryKey: ["hearings"],
        queryFn: () => fetchHearings(),
    });

    const myHearings = hearings?.slice(0, 3) || [];

    // Count cases by backend statuses
    const activeCases = cases?.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(c.status)) || [];
    const pendingCases = cases?.filter(c => c.status === "PENDING_REVIEW") || [];
    const awaitingPayment = cases?.filter(c => c.status === "APPROVED") || [];
    const rejectedCases = cases?.filter(c => c.status === "REJECTED") || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("overview")}</h1>
                    <p className="text-muted-foreground">{t("welcomeBackName").replace("{name}", user?.name || "Client")}</p>
                </div>
                <Link href="/dashboard/client/register-case">
                    <Button className="shadow-lg hover:shadow-xl transition-all">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t("newCaseFiling")}
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("activeCasesOverview")}</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCases.length}</div>
                        <p className="text-xs text-muted-foreground">Assigned &amp; In Progress</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("pendingReview")}</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCases.length}</div>
                        <p className="text-xs text-muted-foreground">{t("awaitingRegistrar")}</p>
                    </CardContent>
                </Card>
                <Card className={`hover:border-primary/50 transition-colors ${awaitingPayment.length > 0 ? "border-blue-300 bg-blue-50/30 dark:bg-blue-900/10" : ""}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Awaiting Payment</CardTitle>
                        <CreditCard className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{awaitingPayment.length}</div>
                        {awaitingPayment.length > 0 && (
                            <Link href="/dashboard/client/cases" className="text-xs text-blue-600 hover:underline">
                                Pay now →
                            </Link>
                        )}
                    </CardContent>
                </Card>
                {rejectedCases.length > 0 && (
                    <Card className="hover:border-destructive/50 transition-colors border-red-200 bg-red-50/30 dark:bg-red-900/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Rejected</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{rejectedCases.length}</div>
                            <Link href="/dashboard/client/cases" className="text-xs text-destructive hover:underline">
                                View details →
                            </Link>
                        </CardContent>
                    </Card>
                )}
                {rejectedCases.length === 0 && (
                    <Card className="hover:border-primary/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t("upcomingHearings")}</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{myHearings.length}</div>
                            <p className="text-xs text-muted-foreground">{t("next30Days")}</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                {/* Recent Cases List */}
                <Card className="col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle>{t("recentCases")}</CardTitle>
                        <CardDescription>{t("recentCasesDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingCases ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                                ))}
                            </div>
                        ) : cases?.length > 0 ? (
                            <div className="space-y-4">
                                {cases.slice(0, 5).map((caseItem) => (
                                    <div key={caseItem.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="space-y-1">
                                            <p className="font-medium leading-none">{caseItem.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {caseItem.file_number || "Pending"} • {caseItem.category?.name || caseItem.category || "—"}
                                            </p>
                                            {caseItem.status === "REJECTED" && caseItem.rejection_reason && (
                                                <p className="text-xs text-destructive mt-1">
                                                    Reason: {caseItem.rejection_reason}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline" className={statusColors[caseItem.status] || "bg-gray-100 text-gray-800"}>
                                                {STATUS_LABELS[caseItem.status] || caseItem.status}
                                            </Badge>
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={`/dashboard/client/cases`}>
                                                    <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">{t("noCasesStart")}</div>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Hearings */}
                <Card className="col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>{t("scheduleTitle")}</CardTitle>
                        <CardDescription>{t("scheduleDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingHearings ? (
                            <div className="space-y-2">
                                {[1, 2].map((i) => (
                                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                                ))}
                            </div>
                        ) : myHearings.length > 0 ? (
                            <div className="space-y-4">
                                {myHearings.map((hearing) => (
                                    <div key={hearing.id} className="flex gap-4 items-start">
                                        <div className="flex flex-col items-center justify-center bg-primary/10 text-primary w-14 h-14 rounded-lg shrink-0">
                                            <span className="text-xs font-bold uppercase">{new Date(hearing.date || hearing.scheduled_date).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-lg font-bold">{new Date(hearing.date || hearing.scheduled_date).getDate()}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-sm">{hearing.type || hearing.hearing_type}</h4>
                                            <p className="text-xs text-muted-foreground mb-1">{hearing.caseTitle || hearing.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" /> {hearing.time || hearing.start_time}
                                                <span>•</span>
                                                <span>{hearing.courtroom || hearing.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">{t("noUpcomingHearings")}</div>
                        )}
                        <div className="mt-4 pt-4 border-t">
                            <Button variant="outline" className="w-full text-xs" asChild>
                                <Link href="/dashboard/client/schedule">{t("viewFullCalendar")}</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
