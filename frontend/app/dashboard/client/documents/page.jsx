"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UploadCloud, FileText, Trash2, Plus } from "lucide-react";

export default function DocumentsPage() {
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([
        { id: 1, name: "Evidence_A.pdf", case: "Case #1024", date: "2023-10-15", size: "2.4 MB" },
        { id: 2, name: "Affidavit_Scanner.jpg", case: "Case #1024", date: "2023-10-18", size: "1.1 MB" },
    ]);

    const handleUpload = (e) => {
        e.preventDefault();
        // Simulate upload
        setIsUploadOpen(false);
        alert("Document uploaded successfully to case file.");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Documents</h1>
                    <p className="text-muted-foreground">Manage and upload documents for your active cases.</p>
                </div>
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Upload Document
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Upload Case Document</DialogTitle>
                            <DialogDescription>Attach a new file to an existing legal matter.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Select Case</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select case..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1024">Case #1024 - Doe v. Smith</SelectItem>
                                        <SelectItem value="1025">Case #1025 - Estate Planning</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Document Type</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="evidence">Evidence</SelectItem>
                                        <SelectItem value="identification">Identification</SelectItem>
                                        <SelectItem value="form">Legal Form</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>File</Label>
                                <Input type="file" />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Upload</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {uploadedFiles.map((file) => (
                    <Card key={file.id} className="group relative overflow-hidden hover:border-primary transition-colors">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div className="overflow-hidden">
                                <CardTitle className="text-base truncate" title={file.name}>{file.name}</CardTitle>
                                <CardDescription className="truncate">{file.case}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground flex justify-between mt-2">
                                <span>Uploaded: {file.date}</span>
                                <span>{file.size}</span>
                            </div>
                        </CardContent>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                ))}

                {/* Upload Placeholder Card */}
                <Card className="border-dashed flex flex-col items-center justify-center p-6 text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setIsUploadOpen(true)}>
                    <UploadCloud className="h-10 w-10 mb-2 opacity-50" />
                    <p className="font-medium text-sm">Upload New Document</p>
                </Card>
            </div>
        </div>
    );
}
