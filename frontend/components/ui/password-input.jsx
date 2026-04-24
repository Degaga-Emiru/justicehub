"use client";

import * as React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { cn } from "@/lib/utils";

const PasswordInput = React.forwardRef(({ className, ...props }, ref) => {
 const [showPassword, setShowPassword] = useState(false);

 const togglePasswordVisibility = () => {
 setShowPassword(!showPassword);
 };

 return (
 <div className="relative group/password">
 <Input
 type={showPassword ? "text" : "password"}
 className={cn("pr-12", className)}
 ref={ref}
 {...props}
 />
 <Button
 type="button"
 variant="ghost"
 size="sm"
 className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 px-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
 onClick={togglePasswordVisibility}
 tabIndex={-1}
 >
 {showPassword ? (
 <EyeOff className="h-4 w-4 animate-in fade-in zoom-in duration-300" />
 ) : (
 <Eye className="h-4 w-4 animate-in fade-in zoom-in duration-300" />
 )}
 <span className="sr-only">
 {showPassword ? "Hide password" : "Show password"}
 </span>
 </Button>
 </div>
 );
});

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
