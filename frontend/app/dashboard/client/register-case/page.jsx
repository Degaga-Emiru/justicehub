import { CaseWizard } from "@/components/client/case-wizard";

export default function RegisterCasePage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold tracking-tight">File a New Case</h1>
                <p className="text-muted-foreground">Follow the steps below to submit your case to the registry.</p>
            </div>
            <CaseWizard />
        </div>
    );
}
