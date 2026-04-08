"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCases } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Gavel, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { statusColors } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

export default function DecisionsPage() {
    const { user } = useAuthStore();
    const [selectedCaseId, setSelectedCaseId] = useState("");
    const [verdict, setVerdict] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Fetch cases assigned to this judge from backend
    const { data: cases } = useQuery({
        queryKey: ["judge-cases-decisions"],
        queryFn: () => fetchCases(),
    });

    const selectedCase = cases?.find(c => c.id === selectedCaseId);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            alert("Decision draft saved successfully.");
        }, 1000);
    };

    const handlePublish = () => {
        if (confirm("Are you sure you want to publish this verdict? This action cannot be undone.")) {
            setIsSaving(true);
            setTimeout(() => {
                setIsSaving(false);
                alert("Verdict published and case status updated.");
            }, 1500);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Judicial Decisions</h1>
                    <p className="text-muted-foreground">Draft, review, and publish final verdicts.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Select Case</CardTitle>
                        <CardDescription>Choose a case to issue a decision for.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Case Selection</Label>
                            <Select onValueChange={setSelectedCaseId} value={selectedCaseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a case..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {cases?.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <span className="font-medium">{c.file_number || "Pending"}</span> - <span className="text-muted-foreground truncate max-w-[150px] inline-block align-bottom">{c.title}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedCase && (
                            <div className="rounded-lg border bg-muted/50 p-4 space-y-3 text-sm">
                                <div>
                                    <span className="font-semibold block">Title</span>
                                    <span>{selectedCase.title}</span>
                                </div>
                                <div>
                                    <span className="font-semibold block">File Number</span>
                                    <span className="font-mono">{selectedCase.file_number || "Pending"}</span>
                                </div>
                                <div>
                                    <span className="font-semibold block">Category</span>
                                    <Badge variant="outline">{selectedCase.category?.name || selectedCase.category || "N/A"}</Badge>
                                </div>
                                <div>
                                    <span className="font-semibold block">Current Status</span>
                                    <Badge className={statusColors[selectedCase.status] || ""}>{selectedCase.status?.replace("_", " ")}</Badge>
                                </div>
                                <div>
                                    <span className="font-semibold block">Priority</span>
                                    <span>{selectedCase.priority}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gavel className="h-5 w-5" />
                            Decision Drafting
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedCase ? (
                            <Tabs defaultValue="draft">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="draft">Draft Verdict</TabsTrigger>
                                    <TabsTrigger value="preview">Preview</TabsTrigger>
                                    <TabsTrigger value="history">History</TabsTrigger>
                                </TabsList>

                                <TabsContent value="draft" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Decision Date</Label>
                                            <Input type="date" className="w-full" defaultValue={new Date().toISOString().split('T')[0]} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Verdict Type</Label>
                                            <Select defaultValue="judgment">
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="judgment">Final Judgment</SelectItem>
                                                    <SelectItem value="order">Interim Order</SelectItem>
                                                    <SelectItem value="dismissal">Dismissal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Verdict Text</Label>
                                        <div className="relative">
                                            <Textarea
                                                className="min-h-[400px] font-serif text-lg leading-relaxed p-6 resize-y bg-background"
                                                placeholder="Enter the official verdict here..."
                                                value={verdict}
                                                onChange={(e) => setVerdict(e.target.value)}
                                            />
                                            <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                                                {verdict.length} chars
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="preview">
                                    <div className="border rounded-md p-8 min-h-[400px] bg-white text-black shadow-sm font-serif">
                                        <div className="text-center mb-8 border-b pb-4">
                                            <h2 className="text-2xl font-bold uppercase tracking-widest mb-1">Justice Hub Court</h2>
                                            <h3 className="text-lg font-semibold">Official Decree</h3>
                                            <p className="text-sm mt-2">Case No: {selectedCase.file_number || selectedCase.id}</p>
                                        </div>

                                        <div className="mb-6">
                                            <p className="font-bold text-lg mb-1">{selectedCase.title}</p>
                                            <p className="italic">Before: {user?.first_name} {user?.last_name}</p>
                                        </div>

                                        <div className="whitespace-pre-wrap leading-relaxed">
                                            {verdict || "[No content drafted yet]"}
                                        </div>

                                        <div className="mt-12 pt-8 border-t w-1/3">
                                            <p className="mb-4">Signed,</p>
                                            <p className="font-bold font-signature text-xl">{user?.first_name} {user?.last_name}</p>
                                            <p className="text-xs uppercase mt-1">Presiding Judge</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="history">
                                    <div className="text-center py-10 text-muted-foreground">
                                        <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-20" />
                                        <p>No previous decisions recorded for this case.</p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                                <FileText className="h-16 w-16 mb-4 opacity-10" />
                                <p>Please select a case from the sidebar to begin drafting.</p>
                            </div>
                        )}
                    </CardContent>
                    {selectedCase && (
                        <CardFooter className="flex justify-between border-t p-6">
                            <Button variant="ghost" className="text-muted-foreground">Discard Draft</Button>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Draft
                                </Button>
                                <Button onClick={handlePublish} disabled={isSaving || !verdict}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Publish Verdict
                                </Button>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
}
