"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchHearings, fetchCases, fetchNotifications, scheduleHearing } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { statusColors, priorityColors } from "@/lib/mock-data";
import { Clock, MapPin, FileText, Gavel, CalendarDays, Briefcase, Scale, AlertCircle, ArrowRight, Bell, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function JudgeDashboard() {
    const { user } = useAuthStore();
    const [date, setDate] = useState(new Date());
    const [selectedHearing, setSelectedHearing] = useState(null);
    const [selectedCase, setSelectedCase] = useState(null);
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleData, setScheduleData] = useState({
        case: "",
        title: "",
        hearing_type: "INITIAL",
        scheduled_date: "",
        duration_minutes: 60,
        location: "",
        agenda: ""
    });
    const queryClient = useQueryClient();

    // Fetch assigned cases from backend
    const { data: cases, isLoading: casesLoading } = useQuery({
        queryKey: ["judge-cases"],
        queryFn: () => fetchCases(),
    });

    // Fetch hearings from backend
    const { data: hearings, isLoading: hearingsLoading } = useQuery({
        queryKey: ["judge-hearings"],
        queryFn: () => fetchHearings(),
    });

    // Fetch notifications
    const { data: notifications } = useQuery({
        queryKey: ["judge-notifications"],
        queryFn: () => fetchNotifications(),
    });

    // Schedule hearing mutation
    const scheduleMutation = useMutation({
        mutationFn: scheduleHearing,
        onSuccess: () => {
            queryClient.invalidateQueries(["judge-hearings"]);
            setIsScheduling(false);
            setScheduleData({
                case: "", title: "", hearing_type: "INITIAL", scheduled_date: "",
                duration_minutes: 60, location: "", agenda: ""
            });
            alert("Hearing scheduled successfully!");
        },
        onError: (err) => {
            alert(err.message || "Failed to schedule hearing");
        }
    });

    const handleScheduleSubmit = (e) => {
        e.preventDefault();
        scheduleMutation.mutate({
            ...scheduleData,
            judge: user?.id
        });
    };

    // Compute statistics
    const totalCases = cases?.length || 0;
    const assignedCases = cases?.filter(c => c.status === "ASSIGNED")?.length || 0;
    const inProgressCases = cases?.filter(c => c.status === "IN_PROGRESS")?.length || 0;
    const closedCases = cases?.filter(c => c.status === "CLOSED")?.length || 0;

    // Filter hearings for the selected date
    const selectedDateHearings = hearings?.filter(h => {
        const hearingDate = new Date(h.scheduled_date || h.date);
        return (
            hearingDate.getDate() === date?.getDate() &&
            hearingDate.getMonth() === date?.getMonth() &&
            hearingDate.getFullYear() === date?.getFullYear()
        );
    }) || [];

    // Get dates that have hearings for highlighting in calendar
    const hearingDates = hearings?.map(h => new Date(h.scheduled_date || h.date)) || [];

    // Unread notifications
    const unreadNotifications = notifications?.filter(n => !n.is_read) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Judicial Dashboard</h1>
                    <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM do, yyyy")}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/judge/search">
                        <Button variant="outline">
                            <FileText className="mr-2 h-4 w-4" />
                            Search Cases
                        </Button>
                    </Link>
                    <Link href="/dashboard/judge/decisions">
                        <Button>
                            <Gavel className="mr-2 h-4 w-4" />
                            Decisions
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Assigned</p>
                                <p className="text-3xl font-bold">{totalCases}</p>
                            </div>
                            <Briefcase className="h-8 w-8 text-blue-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">New Assignments</p>
                                <p className="text-3xl font-bold">{assignedCases}</p>
                            </div>
                            <Scale className="h-8 w-8 text-purple-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">In Progress</p>
                                <p className="text-3xl font-bold">{inProgressCases}</p>
                            </div>
                            <Clock className="h-8 w-8 text-green-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-gray-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Closed</p>
                                <p className="text-3xl font-bold">{closedCases}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-gray-500 opacity-80" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Cases, Hearings, Notifications */}
            <Tabs defaultValue="cases" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="cases" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        My Cases ({totalCases})
                    </TabsTrigger>
                    <TabsTrigger value="hearings" className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Hearings ({hearings?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications {unreadNotifications.length > 0 && `(${unreadNotifications.length})`}
                    </TabsTrigger>
                </TabsList>

                {/* CASES TAB */}
                <TabsContent value="cases">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assigned Cases</CardTitle>
                            <CardDescription>Cases currently assigned to you for adjudication.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {casesLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
                                </div>
                            ) : cases?.length > 0 ? (
                                <div className="space-y-4">
                                    {cases.map((caseItem) => (
                                        <div
                                            key={caseItem.id}
                                            className="p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group relative overflow-hidden"
                                            onClick={() => setSelectedCase(caseItem)}
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                                            <div className="flex justify-between items-start mb-2 pl-2">
                                                <div>
                                                    <h4 className="font-semibold text-lg">{caseItem.title}</h4>
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        {caseItem.file_number || "File # Pending"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className={priorityColors[caseItem.priority] || ""}>
                                                        {caseItem.priority}
                                                    </Badge>
                                                    <Badge variant="outline" className={statusColors[caseItem.status] || ""}>
                                                        {caseItem.status?.replace("_", " ")}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-3 pl-2">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Scale className="h-4 w-4" />
                                                    <span>{caseItem.category?.name || caseItem.category || "N/A"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <CalendarDays className="h-4 w-4" />
                                                    <span>Filed: {caseItem.filing_date ? format(new Date(caseItem.filing_date), "MMM d, yyyy") : "N/A"}</span>
                                                </div>
                                                {caseItem.court_name && (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>{caseItem.court_name}</span>
                                                    </div>
                                                )}
                                                {caseItem.created_by_name && (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Briefcase className="h-4 w-4" />
                                                        <span>By: {caseItem.created_by_name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Briefcase className="h-12 w-12 mb-4 opacity-20" />
                                    <p className="text-lg font-medium">No cases assigned yet.</p>
                                    <p className="text-sm">New case assignments will appear here.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HEARINGS TAB */}
                <TabsContent value="hearings">
                    <div className="grid gap-6 lg:grid-cols-7">
                        {/* Calendar Section */}
                        <div className="lg:col-span-3 space-y-6">
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle>Hearing Schedule</CardTitle>
                                    <CardDescription>Select a date to view court proceedings.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-center">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        className="rounded-md border shadow-sm"
                                        modifiers={{
                                            hasHearing: hearingDates
                                        }}
                                        modifiersStyles={{
                                            hasHearing: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                                        }}
                                    />
                                </CardContent>
                                <div className="px-6 pb-6">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <span>Date with hearings</span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Hearings List Section */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="h-full min-h-[500px] flex flex-col">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2">
                                            Hearings for {date ? format(date, "MMM do") : "Today"}
                                            <Badge variant="secondary" className="ml-2">
                                                {selectedDateHearings.length} Hearings
                                            </Badge>
                                        </CardTitle>
                                    </div>
                                    <Button size="sm" onClick={() => setIsScheduling(true)}>
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        Schedule
                                    </Button>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto pr-2 space-y-4">
                                    {hearingsLoading ? (
                                        <div className="space-y-4">
                                            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}
                                        </div>
                                    ) : selectedDateHearings.length > 0 ? (
                                        selectedDateHearings.map((hearing) => (
                                            <div
                                                key={hearing.id}
                                                className="p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group relative overflow-hidden"
                                                onClick={() => setSelectedHearing(hearing)}
                                            >
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                                                <div className="flex justify-between items-start mb-2 pl-2">
                                                    <div>
                                                        <h4 className="font-semibold text-lg">{hearing.title || hearing.case?.title || "Hearing"}</h4>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <FileText className="h-3 w-3" /> {hearing.case?.file_number || hearing.caseId || "N/A"}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className={statusColors[hearing.status] || ""}>
                                                        {hearing.status}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-sm mt-3 pl-2">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Clock className="h-4 w-4" />
                                                        <span>{hearing.scheduled_date ? format(new Date(hearing.scheduled_date), "h:mm a") : hearing.time || "N/A"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>{hearing.location || hearing.courtroom || "N/A"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                                                        <Gavel className="h-4 w-4" />
                                                        <span>{hearing.hearing_type || hearing.type || "N/A"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                                            <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
                                            <p>No hearings scheduled for this date.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* NOTIFICATIONS TAB */}
                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Notifications</CardTitle>
                            <CardDescription>Stay updated on case assignments, hearings, and documents.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {notifications?.length > 0 ? (
                                <div className="space-y-3">
                                    {notifications.slice(0, 20).map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`p-4 border rounded-lg transition-colors ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'hover:bg-muted/30'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {!notif.is_read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                                        <h4 className="font-semibold text-sm">{notif.title}</h4>
                                                        <Badge variant="outline" className="text-xs">
                                                            {notif.type?.replace("_", " ")}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{notif.message}</p>
                                                    {notif.case_details && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Case: {notif.case_details.file_number || notif.case_details.title}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                                                    {notif.created_at ? format(new Date(notif.created_at), "MMM d, h:mm a") : ""}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Bell className="h-12 w-12 mb-4 opacity-20" />
                                    <p>No notifications yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Case Detail Dialog */}
            <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
                <DialogContent className="sm:max-w-[650px]">
                    <DialogHeader>
                        <DialogTitle>Case Details</DialogTitle>
                        <DialogDescription>
                            {selectedCase?.file_number || "Pending"} — {selectedCase?.title}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedCase && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">File Number</span>
                                    <p className="font-medium">{selectedCase.file_number || "Pending"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</span>
                                    <div>
                                        <Badge className={statusColors[selectedCase.status] || ""}>
                                            {selectedCase.status?.replace("_", " ")}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Category</span>
                                    <p className="font-medium">{selectedCase.category?.name || selectedCase.category || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Priority</span>
                                    <div>
                                        <Badge variant="outline" className={priorityColors[selectedCase.priority] || ""}>
                                            {selectedCase.priority}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Filed Date</span>
                                    <p className="font-medium">
                                        {selectedCase.filing_date ? format(new Date(selectedCase.filing_date), "PPP") : "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Court</span>
                                    <p className="font-medium">{selectedCase.court_name || "Not assigned"}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Description</span>
                                <p className="text-sm leading-relaxed border rounded-lg p-3 bg-muted/50">
                                    {selectedCase.description || "No description provided."}
                                </p>
                            </div>

                            {selectedCase.documents?.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Documents ({selectedCase.documents.length})</span>
                                    <div className="space-y-1">
                                        {selectedCase.documents.map((doc, i) => (
                                            <div key={doc.id || i} className="flex items-center gap-2 text-sm p-2 border rounded">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <span>{doc.file_name || doc.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setSelectedCase(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hearing Details Dialog */}
            <Dialog open={!!selectedHearing} onOpenChange={(open) => !open && setSelectedHearing(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Hearing Details</DialogTitle>
                        <DialogDescription>
                            {selectedHearing?.case?.file_number || selectedHearing?.caseId} — {selectedHearing?.title || selectedHearing?.case?.title}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedHearing && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Date & Time</span>
                                    <p className="font-medium flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                        {selectedHearing.scheduled_date
                                            ? format(new Date(selectedHearing.scheduled_date), "PPP 'at' h:mm a")
                                            : `${selectedHearing.date} at ${selectedHearing.time}`}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Location</span>
                                    <p className="font-medium flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {selectedHearing.location || selectedHearing.courtroom || "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hearing Type</span>
                                    <p className="font-medium">{selectedHearing.hearing_type || selectedHearing.type || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</span>
                                    <p className="font-medium">{selectedHearing.status}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Quick Notes</span>
                                <Textarea placeholder="Add private notes for this hearing..." className="min-h-[100px]" />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setSelectedHearing(null)}>Close</Button>
                        <Button onClick={() => setSelectedHearing(null)}>Save Notes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Schedule Hearing Dialog */}
            <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Schedule New Hearing</DialogTitle>
                        <DialogDescription>
                            Create a new hearing event and notify all parties.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleScheduleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="case">Case</Label>
                                <Select required value={scheduleData.case} onValueChange={(val) => setScheduleData({ ...scheduleData, case: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a case" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cases?.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.file_number} - {c.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hearing_type">Hearing Type</Label>
                                    <Select required value={scheduleData.hearing_type} onValueChange={(val) => setScheduleData({ ...scheduleData, hearing_type: val })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INITIAL">Initial Hearing</SelectItem>
                                            <SelectItem value="STATUS">Status Conference</SelectItem>
                                            <SelectItem value="EVIDENTIARY">Evidentiary Hearing</SelectItem>
                                            <SelectItem value="MOTION">Motion Hearing</SelectItem>
                                            <SelectItem value="TRIAL">Trial</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Duration (minutes)</Label>
                                    <Input 
                                        id="duration" 
                                        type="number" 
                                        min="15" 
                                        required
                                        value={scheduleData.duration_minutes}
                                        onChange={(e) => setScheduleData({ ...scheduleData, duration_minutes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">Title / Objective</Label>
                                <Input 
                                    id="title" 
                                    required 
                                    placeholder="e.g. Preliminary Arguments" 
                                    value={scheduleData.title}
                                    onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date & Time</Label>
                                    <Input 
                                        id="date" 
                                        type="datetime-local" 
                                        required 
                                        value={scheduleData.scheduled_date}
                                        onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Courtroom / Location</Label>
                                    <Input 
                                        id="location" 
                                        required 
                                        placeholder="e.g. Courtroom 3B" 
                                        value={scheduleData.location}
                                        onChange={(e) => setScheduleData({ ...scheduleData, location: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="agenda">Agenda / Notes</Label>
                                <Textarea 
                                    id="agenda" 
                                    placeholder="Brief agenda for the hearing..." 
                                    value={scheduleData.agenda}
                                    onChange={(e) => setScheduleData({ ...scheduleData, agenda: e.target.value })}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsScheduling(false)}>Cancel</Button>
                            <Button type="submit" disabled={scheduleMutation.isPending}>
                                {scheduleMutation.isPending ? "Scheduling..." : "Schedule Hearing"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
