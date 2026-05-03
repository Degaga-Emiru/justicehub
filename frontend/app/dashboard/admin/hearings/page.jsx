"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHearings } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { 
  Clock, MapPin, User, FileText, Loader2, 
  Calendar as CalendarIcon, ChevronRight, Video, 
  Gavel, Filter, Search, X
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminHearingsPage() {
  const [date, setDate] = useState(new Date());
  const [search, setSearch] = useState("");

  const { data: hearings, isLoading } = useQuery({
    queryKey: ["admin-hearings-calendar", format(date, "yyyy-MM")],
    queryFn: () => fetchHearings({
      month: format(date, "MM"),
      year: format(date, "yyyy")
    }),
  });

  const selectedDayHearings = hearings?.filter(h => {
    try {
        return isSameDay(new Date(h.scheduled_date), date);
    } catch (e) {
        return false;
    }
  }) || [];

  const filteredHearings = selectedDayHearings.filter(h => 
    (h.case_title || "").toLowerCase().includes(search.toLowerCase()) ||
    (h.case_file_number || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight">Court Schedule</h1>
          <p className="text-muted-foreground font-medium text-sm">
            Overview of all judicial sessions and hearings.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Calendar Column */}
        <Card className="lg:col-span-5 bg-card border-border overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-xl font-black font-display flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Calendar View
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 flex justify-center">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    className="rounded-none border-none"
                    classNames={{
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-xl",
                        day_today: "bg-muted text-foreground font-black rounded-xl",
                        day: "h-12 w-12 p-0 font-bold aria-selected:opacity-100 rounded-xl hover:bg-muted/50 transition-colors",
                    }}
                />
            </div>
          </CardContent>
        </Card>

        {/* Hearings List Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black font-display tracking-tight">
                {format(date, "MMMM d, yyyy")}
            </h2>
            <Badge variant="outline" className="rounded-xl font-black text-[10px] uppercase tracking-widest bg-primary/10 text-primary border-none">
                {selectedDayHearings.length} Hearing{selectedDayHearings.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by case title or number..."
              className="pl-10 h-10 rounded-xl bg-card border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest">Retrieving Docket...</p>
                </div>
            ) : filteredHearings.length > 0 ? (
              filteredHearings.map((h, i) => (
                <Card key={i} className="bg-card border-border group hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-black text-primary mt-1">{h.scheduled_time?.slice(0, 5) || "09:00"}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black truncate group-hover:text-primary transition-colors">
                              {h.case_title || "Judicial Session"}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight flex items-center gap-2 mt-1">
                              <FileText className="h-3 w-3" /> {h.case_file_number || "REF-000-000"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border">
                            {h.hearing_format === 'VIRTUAL' ? <Video className="h-3 w-3 text-blue-500" /> : <MapPin className="h-3 w-3 text-emerald-500" />}
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                {h.hearing_format === 'VIRTUAL' ? "Virtual Session" : h.location || "Courtroom A"}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border">
                            <User className="h-3 w-3 text-purple-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                {h.judge_name || "Assigned Judge"}
                            </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-50 bg-muted/10 rounded-[2rem] border border-dashed border-border">
                <CalendarIcon className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-black uppercase tracking-widest">Quiet Docket</p>
                  <p className="text-xs font-bold text-muted-foreground mt-1">No hearings scheduled for this selection.</p>
                </div>
                {search && (
                    <Button variant="ghost" onClick={() => setSearch("")} className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Clear Search
                    </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
