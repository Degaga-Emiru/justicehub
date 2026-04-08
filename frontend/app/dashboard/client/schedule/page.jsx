"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHearings } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function SchedulePage() {
    const { user } = useAuthStore();
    const [date, setDate] = useState(new Date());

    const { data: hearings } = useQuery({
        queryKey: ["client-hearings", user?.id],
        queryFn: () => fetchHearings(), // Mock fetches all, we'll filter
    });

    // Filter logic similar to Judge view but for user context
    const myHearings = hearings || []; // In real app, filter by user's cases

    const selectedDateHearings = myHearings.filter(h => {
        const hearingDate = new Date(h.scheduled_date || h.date);
        return (
            hearingDate.getDate() === date?.getDate() &&
            hearingDate.getMonth() === date?.getMonth() &&
            hearingDate.getFullYear() === date?.getFullYear()
        );
    });

    const hearingDates = myHearings.map(h => new Date(h.scheduled_date || h.date));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Court Schedule</h1>
                <p className="text-muted-foreground">Track your upcoming hearings and appearances.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Calendar</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border"
                            modifiers={{
                                hasHearing: hearingDates
                            }}
                            modifiersStyles={{
                                hasHearing: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                            }}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{date ? format(date, "MMMM do, yyyy") : "Selected Date"}</CardTitle>
                        <CardDescription>Events scheduled for this day.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedDateHearings.length > 0 ? (
                            selectedDateHearings.map((hearing) => (
                                <div key={hearing.id} className="flex items-start gap-4 p-4 border rounded-lg bg-card">
                                    <div className="bg-primary/10 text-primary p-3 rounded-md min-w-[60px] text-center">
                                        <span className="block text-xs font-bold uppercase">{format(new Date(hearing.scheduled_date || hearing.date), "MMM")}</span>
                                        <span className="block text-xl font-bold">{format(new Date(hearing.scheduled_date || hearing.date), "dd")}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-semibold">{hearing.hearing_type || hearing.type}</h4>
                                        <p className="text-sm text-muted-foreground">{hearing.case_details?.title || hearing.caseTitle || hearing.title}</p>
                                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {hearing.scheduled_date ? format(new Date(hearing.scheduled_date), "h:mm a") : hearing.time}</span>
                                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {hearing.location || hearing.courtroom}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <p>No hearings scheduled for this date.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
