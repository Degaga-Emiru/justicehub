"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ChevronLeft, ChevronRight, UploadCloud, FileText, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { createCase, fetchCategories } from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Schema for Step 1: Party Details
const step1Schema = z.object({
    defendantName: z.string().min(2, "Defendant name is required"),
    defendantAddress: z.string().optional(),
    defendantEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});

// Schema for Step 2: Case Details
const step2Schema = z.object({
    categoryId: z.string().min(1, "Case category is required"),
    title: z.string().min(5, "Case title must be at least 5 characters"),
    description: z.string().min(20, "Please provide a detailed description (at least 20 chars)"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

// Schema for Step 3: Documents
const step3Schema = z.object({
    documents: z.array(z.any()).optional(),
});

export function CaseWizard() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState("");
    const { user } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        let mounted = true;
        const loadCategories = async () => {
            const data = await fetchCategories();
            if (mounted && data.length) {
                setCategories(data);
            }
        };
        loadCategories();
        return () => { mounted = false; };
    }, []);

    // Unified form state
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        getValues,
        trigger,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(step === 1 ? step1Schema : step === 2 ? step2Schema : step3Schema),
        defaultValues: {
            defendantName: "",
            defendantAddress: "",
            defendantEmail: "",
            categoryId: "",
            title: "",
            description: "",
            priority: "MEDIUM",
            documents: [],
        },
        mode: "onChange",
    });

    const [uploadedFiles, setUploadedFiles] = useState([]);

    // Handle next step with validation
    const nextStep = async () => {
        const isValid = await trigger();
        if (isValid) setStep((s) => s + 1);
    };

    const prevStep = () => setStep((s) => s - 1);

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setUploadedFiles((prev) => [...prev, ...files]);
    };

    const onSubmit = async () => {
        const allData = getValues();
        setIsLoading(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("title", allData.title);
            formData.append("category", allData.categoryId);
            formData.append("priority", allData.priority);
            formData.append("description", allData.description);
            formData.append("defendant_name", allData.defendantName);
            
            // Expected backend fields map directly now.
            
            if (uploadedFiles.length > 0) {
                uploadedFiles.forEach((file) => {
                    formData.append("documents", file);
                    formData.append("document_types", "PETITION"); // default type for initial upload
                });
            }

            await createCase(formData);
            router.push("/dashboard/client");
        } catch (err) {
            console.error("Failed to register case", err);
            setError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-3xl mx-auto shadow-lg">
            <CardHeader>
                <div className="flex items-center justify-between mb-4">
                    <CardTitle>Register New Case</CardTitle>
                    <div className="flex items-center space-x-2">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                                    step === i
                                        ? "bg-primary text-primary-foreground"
                                        : step > i
                                            ? "bg-green-600 text-white"
                                            : "bg-muted text-muted-foreground"
                                )}
                            >
                                {step > i ? <CheckCircle2 className="h-5 w-5" /> : i}
                            </div>
                        ))}
                    </div>
                </div>
                <CardDescription>
                    {step === 1 && "Step 1: Enter details about the opposing party."}
                    {step === 2 && "Step 2: Describe the legal matter and classify its type."}
                    {step === 3 && "Step 3: Upload relevant evidence and documents."}
                </CardDescription>
            </CardHeader>
            <Separator />

            <CardContent className="pt-6">
                <form id="case-wizard-form" onSubmit={handleSubmit(onSubmit)}>
                    {/* Step 1: Party Details */}
                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="plaintiff">Plaintiff (You)</Label>
                                    <Input id="plaintiff" value={user?.name || ""} disabled className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="defendantName">Defendant Name</Label>
                                    <Input id="defendantName" placeholder="Individual or Company Name" {...register("defendantName")} />
                                    {errors.defendantName && <p className="text-xs text-destructive">{errors.defendantName.message}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="defendantAddress">Defendant Address (Optional)</Label>
                                <Input id="defendantAddress" placeholder="123 Main St, City, Country" {...register("defendantAddress")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="defendantEmail">Defendant Email (Optional)</Label>
                                <Input id="defendantEmail" type="email" placeholder="contact@defendant.com" {...register("defendantEmail")} />
                                {errors.defendantEmail && <p className="text-xs text-destructive">{errors.defendantEmail.message}</p>}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Case Details */}
                    {step === 2 && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="space-y-2">
                                <Label htmlFor="title">Case Title</Label>
                                <Input id="title" placeholder="e.g., Doe v. Smith - Breach of Contract" {...register("title")} />
                                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Case Category</Label>
                                    <Select onValueChange={(val) => setValue("categoryId", val)} value={watch("categoryId")}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>Priority Level</Label>
                                    <Select onValueChange={(val) => setValue("priority", val)} value={watch("priority")}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HIGH">High</SelectItem>
                                            <SelectItem value="CRITICAL">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Case Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Provide a detailed objective description of the facts..."
                                    className="min-h-[150px]"
                                    {...register("description")}
                                />
                                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Documents */}
                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            {error && (
                                <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 text-center hover:bg-muted/30 transition-colors">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <UploadCloud className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-sm">Drag files to upload or click to browse</p>
                                        <p className="text-xs text-muted-foreground">PDF, JPEG, PNG (Max 10MB)</p>
                                    </div>
                                    <Input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        id="file-upload"
                                        onChange={handleFileUpload}
                                    />
                                    <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById("file-upload").click()}>
                                        Browse Files
                                    </Button>
                                </div>
                            </div>

                            {uploadedFiles.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">Uploaded Documents</h4>
                                    <div className="space-y-2">
                                        {uploadedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 border rounded-md bg-card">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </CardContent>

            <CardFooter className="flex justify-between border-t p-6">
                <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={step === 1 || isLoading}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>

                {step < 3 ? (
                    <Button onClick={nextStep}>
                        Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={handleSubmit(onSubmit)} disabled={isLoading}>
                        {isLoading ? "Submitting..." : "Submit Case Registration"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
