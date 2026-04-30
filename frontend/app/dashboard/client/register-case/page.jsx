import { CaseWizard } from "@/components/client/case-wizard";
import { FilePlus } from "lucide-react";

export default function RegisterCasePage() {
 return (
 <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
 <div className="text-center space-y-3 mb-8">
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
 <FilePlus className="h-3 w-3" /> New Filing
 </div>
 <h1 className="text-4xl font-black font-display tracking-tight text-[#1A202C]">File a New Case</h1>
 <p className="text-[#4A5568] font-bold text-lg opacity-100">Follow the steps below to submit your case to the registry.</p>
 </div>
 <CaseWizard />
 </div>
 );
}
