"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilePlus, Copy, Check, FileCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchCases } from "@/lib/api";

export default function FileCreationPage() {
    const [selectedCaseId, setSelectedCaseId] = useState("");
    const [isCopied, setIsCopied] = useState(false);

    // Fetch cases that have been approved and thus have a file number
    const { data: cases } = useQuery({
        queryKey: ["cases-with-files"],
        queryFn: () => fetchCases(),
    });

    // Filter to cases that have a file number
    const availableCases = cases?.filter(c => c.file_number) || [];
    const selectedCase = availableCases.find(c => c.id === selectedCaseId);

    const copyToClipboard = () => {
        if (!selectedCase?.file_number) return;
        navigator.clipboard.writeText(selectedCase.file_number);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Case File Directory</h1>
                <p className="text-muted-foreground">View official court file numbers for accepted cases.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Case File Lookup</CardTitle>
                    <CardDescription>Select an accepted case to view and copy its unique identifier.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Select Case</Label>
                        <Select onValueChange={(val) => setSelectedCaseId(val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a case..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCases.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.title} ({c.status})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedCase && (
                            <div className="text-sm mt-2 flex items-center text-green-600">
                                <FileCheck className="w-4 h-4 mr-1" />
                                File Number generated successfully.
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Court Jurisdiction</Label>
                            <Input value={selectedCase?.court_name || "Superior Court"} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Filing Year</Label>
                            <Input value={selectedCase ? new Date(selectedCase.created_at).getFullYear() : new Date().getFullYear()} disabled />
                        </div>
                    </div>

                    {selectedCase?.file_number && (
                        <div className="mt-6 p-6 bg-muted/50 rounded-lg border border-dashed border-primary/30 text-center animate-fade-in">
                            <p className="text-sm text-muted-foreground mb-2">Official File Number:</p>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-3xl font-mono font-bold tracking-wider text-primary">{selectedCase.file_number}</span>
                                <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                                    {isCopied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
