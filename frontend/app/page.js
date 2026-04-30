"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 Scale, ShieldCheck, Gavel, FileText, ArrowRight, Menu,
 CheckCircle, Globe, Building, Users, Clock, BookOpen, ChevronRight, LayoutDashboard, TrendingUp
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useState, useEffect } from "react";
import { Chatbot } from "@/components/client/chatbot";

export default function LandingPage() {
 const { t, language, setLanguage } = useLanguage();
 const [scrolled, setScrolled] = useState(false);

 useEffect(() => {
 const handleScroll = () => {
 setScrolled(window.scrollY > 20);
 };
 window.addEventListener("scroll", handleScroll);
 return () => window.removeEventListener("scroll", handleScroll);
 }, []);

 const toggleLanguage = () => {
 setLanguage(language === "en" ? "am" : "en");
 };

 return (
 <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
 {/* Header */}
 <header className={`fixed top-0 z-50 w-full transition-all duration-500 ${scrolled ? "bg-background shadow-sm border-border shadow-sm" : "bg-transparent py-4"}`}>
 <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
 <div className="flex items-center gap-3 group cursor-pointer">
 <div className="bg-gradient-to-br from-primary to-blue-500 p-2.5 rounded-xl text-white shadow-lg group-hover:shadow-primary/30 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
 <Scale className="h-6 w-6" />
 </div>
 <span className="text-2xl font-black font-display tracking-tight text-foreground group-hover:text-primary transition-colors">JusticeHub Modern</span>
 </div>
 <nav className="hidden md:flex items-center gap-8">
 <Link className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-all hover:-translate-y-0.5" href="#features">
 {t("features")}
 </Link>
 <Link className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-all hover:-translate-y-0.5" href="#how-it-works">
 {t("howItWorksTitle")}
 </Link>
 </nav>
 <div className="flex items-center gap-4">
 <Button variant="ghost" size="sm" onClick={toggleLanguage} className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground rounded-full">
 <Globe className="h-4 w-4" />
 {language === "en" ? "Amharic" : "English"}
 </Button>
 <div className="hidden sm:block h-6 w-px bg-border"></div>
 <Link href="/login" className="hidden sm:block">
 <Button variant="ghost" className="font-semibold rounded-full hover:bg-muted/50">{t("login")}</Button>
 </Link>
 <Link href="/signup">
 <Button className="font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 focus:ring-4 focus:ring-primary/20 transition-all rounded-full px-6 bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 text-white">
 {t("getStarted")}
 </Button>
 </Link>
 <Button variant="ghost" size="icon" className="md:hidden">
 <Menu className="h-5 w-5" />
 </Button>
 </div>
 </div>
 </header>

 <main className="flex-1">
 {/* 1. Hero Section */}
 <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex items-center min-h-[90vh]">
 {/* Animated Background Gradients & Mesh */}
 <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
 <div className="absolute top-[-10%] right-[-5%] -z-10 w-[800px] h-[800px] bg-secondary/15 rounded-full blur-[120px] animate-pulse-slow"></div>
 <div className="absolute bottom-[-10%] left-[-5%] -z-10 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[100px] mix-blend-multiply opacity-50"></div>
 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay -z-10"></div>

 <div className="container px-4 md:px-6 mx-auto relative z-10">
 <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
 {/* Hero Text */}
 <div className="flex-1 text-center lg:text-left space-y-8 animate-fade-up">
 <div className="inline-flex items-center justify-center lg:justify-start rounded-full border border-primary/20 bg-background shadow-sm border-border shadow-sm px-4 py-1.5 text-sm font-medium text-primary mb-2">
 <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
 {t("heroBadge")}
 </div>
 <h1 className="text-5xl font-black font-display tracking-tight sm:text-6xl md:text-7xl lg:text-[5rem] leading-[1.05]">
 {t("heroTitle1")} <br className="hidden sm:inline" />
 <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-500 to-primary/80 drop-shadow-sm">
 {t("heroTitle2")}
 </span>
 </h1>
 <p className="max-w-[600px] mx-auto lg:mx-0 text-xl text-muted-foreground leading-relaxed font-medium">
 {t("heroDesc")}
 </p>
 <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
 <Link href="/signup">
 <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 focus:ring-4 focus:ring-primary/20 transition-all transform hover:-translate-y-1 bg-gradient-to-r from-primary to-blue-600 font-semibold text-white">
 {t("heroCTA")} <ArrowRight className="ml-2 h-5 w-5" />
 </Button>
 </Link>
 <Link href="/login">
 <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-full border-2 hover:bg-muted/50 bg-background shadow-sm border-border hover:text-foreground transition-all duration-300 font-semibold">
 {t("heroDemo")}
 </Button>
 </Link>
 </div>
 <div className="pt-8 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground font-semibold">
 <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" /> {t("secureFeature")}</div>
 <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" /> {t("transparentFeature")}</div>
 <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" /> {t("immutableFeature")}</div>
 </div>
 </div>

 {/* Hero Visual Mockup */}
 <div className="flex-1 w-full max-w-2xl lg:max-w-none relative animate-fade-up pl-0 lg:pl-10" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
 <div className="relative rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden aspect-[4/5] border-[6px] border-white/40 dark:border-border group floating-glow">
 <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent mix-blend-overlay z-10 transition-colors duration-700"></div>
 <img
 src="/lady_justice.jpg"
 alt="Lady Justice"
 className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 ease-out"
 />
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* 2. Trust Section (Logos) */}
 <section className="py-16 border-y bg-muted/20 relative overflow-hidden">
 <div className="container px-4 md:px-6 text-center space-y-10 relative z-10 mx-auto">
 <h2 className="text-xs font-black tracking-[0.2em] text-muted-foreground/80 uppercase font-display">{t("trustedBy")}</h2>
 <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-1000">
 <div className="flex items-center justify-center space-x-3 text-xl md:text-2xl font-black font-display hover:scale-105 transition-transform cursor-default text-foreground/80"><Scale className="h-6 w-6 md:h-8 md:w-8 text-primary" /> <span className="tracking-tight">SupremeCourt</span></div>
 <div className="flex items-center justify-center space-x-2 text-xl md:text-2xl font-black font-display italic hover:scale-105 transition-transform cursor-default text-foreground/80">DistrictLaw</div>
 <div className="flex items-center justify-center space-x-2 text-xl md:text-2xl font-mono font-bold hover:scale-105 transition-transform cursor-default text-foreground/80">LEX_CORP</div>
 <div className="flex items-center justify-center space-x-2 text-xl md:text-2xl font-black font-display tracking-tighter hover:scale-105 transition-transform cursor-default text-foreground/80">JUSTICE.GOV</div>
 </div>
 </div>
 </section>

 {/* 3. How It Works Section */}
 <section id="how-it-works" className="py-32 bg-background relative overflow-hidden">
 {/* Subtle background element */}
 <div className="absolute right-0 top-1/4 -z-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]"></div>

 <div className="container mx-auto px-4 md:px-6">
 <div className="flex flex-col lg:flex-row gap-20 items-center">
 <div className="flex-1 space-y-12 animate-fade-up">
 <div className="space-y-6">
 <h2 className="text-primary font-black tracking-widest uppercase text-xs flex items-center gap-3 font-display">
 <span className="h-px w-10 bg-primary"></span>
 {t("howItWorksSubtitle")}
 </h2>
 <h3 className="text-4xl md:text-5xl lg:text-6xl font-black font-display tracking-tight leading-tight">{t("howItWorksTitle")}</h3>
 <p className="text-xl text-muted-foreground leading-relaxed font-medium">{t("howItWorksDesc")}</p>
 </div>

 <div className="space-y-10">
 {/* Step 1 */}
 <div className="flex gap-8 group">
 <div className="flex-shrink-0 mt-1 h-16 w-16 rounded-[1.25rem] bg-background shadow-sm border-border shadow-inner text-primary flex items-center justify-center font-black font-display text-2xl group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">1</div>
 <div className="space-y-2">
 <h4 className="text-2xl font-black font-display group-hover:text-primary transition-colors">{t("step1Title")}</h4>
 <p className="text-muted-foreground font-medium leading-relaxed text-lg">{t("step1Desc")}</p>
 </div>
 </div>
 {/* Step 2 */}
 <div className="flex gap-8 group">
 <div className="flex-shrink-0 mt-1 h-16 w-16 rounded-[1.25rem] bg-background shadow-sm border-border shadow-inner text-primary flex items-center justify-center font-black font-display text-2xl group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">2</div>
 <div className="space-y-2">
 <h4 className="text-2xl font-black font-display group-hover:text-primary transition-colors">{t("step2Title")}</h4>
 <p className="text-muted-foreground font-medium leading-relaxed text-lg">{t("step2Desc")}</p>
 </div>
 </div>
 {/* Step 3 */}
 <div className="flex gap-8 group">
 <div className="flex-shrink-0 mt-1 h-16 w-16 rounded-[1.25rem] bg-background shadow-sm border-border shadow-inner text-primary flex items-center justify-center font-black font-display text-2xl group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">3</div>
 <div className="space-y-2">
 <h4 className="text-2xl font-black font-display group-hover:text-primary transition-colors">{t("step3Title")}</h4>
 <p className="text-muted-foreground font-medium leading-relaxed text-lg">{t("step3Desc")}</p>
 </div>
 </div>
 </div>
 </div>

 <div className="flex-1 w-full relative group">
 <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-secondary/30 rounded-[3rem] transform rotate-3 scale-105 transition-transform group-hover:rotate-6 duration-1000 blur-sm opacity-50"></div>
 <div className="relative rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.15)] border-[8px] border-white/50 dark:border-border floating-glow">
 <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 z-10 transition-opacity duration-700 opacity-60 group-hover:opacity-30"></div>
 <img 
 src="/legal_gavel.png" 
 alt="Gavel and Legal Documents" 
 className="object-cover w-full transform group-hover:scale-110 transition-transform duration-1000 ease-out" style={{ height: "700px", minHeight: "500px", objectPosition: "center" }}
 />
 <div className="absolute bottom-10 left-10 z-20 space-y-2">
 <Badge className="bg-muted backdrop-blur-md text-white border-white/30 text-xs uppercase font-black tracking-widest">{t("professional")}</Badge>
 <h5 className="text-white text-3xl font-black font-display tracking-tight">{t("precisionResults")}</h5>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* 4. Features Section */}
 <section id="features" className="py-32 relative bg-muted/30 border-t overflow-hidden">
 <div className="absolute top-1/2 left-0 -z-10 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-x-1/2"></div>
 
 <div className="container mx-auto px-4 md:px-6">
 <div className="text-center mb-24 space-y-6 max-w-4xl mx-auto animate-fade-up">
 <h2 className="text-primary font-black tracking-[0.2em] uppercase text-xs flex items-center justify-center gap-4 font-display">
 <span className="h-px w-12 bg-primary"></span>
 {t("featuresSubtitle")}
 <span className="h-px w-12 bg-primary"></span>
 </h2>
 <h3 className="text-5xl md:text-6xl lg:text-7xl font-black font-display tracking-tight text-foreground leading-[1.05]">
 {t("featuresTitle")} <br />
 <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-500 to-secondary drop-shadow-sm">
 {t("featuresTitleSuffix")}
 </span>
 </h3>
 <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium max-w-2xl mx-auto">
 {t("featuresDesc")}
 </p>
 </div>

 <div className="flex flex-col xl:flex-row gap-16 items-stretch">
 <div className="xl:w-1/3 w-full group">
 <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white/50 dark:border-border floating-glow ">
 <img 
 src="/high-tech-scales.jpg" 
 alt="High Tech Scales of Justice" 
 className="w-full object-cover transform group-hover:scale-110 transition-transform duration-1000"
  style={{ height: "700px", minHeight: "500px", objectPosition: "center" }}
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
 <div className="absolute bottom-8 left-8 right-8">
 <Badge className="mb-3 bg-primary text-white border-none">{t("popular")}</Badge>
 <h4 className="text-white text-2xl font-black font-display tracking-tight">{t("secureFeature")} & {t("transparentFeature")}</h4>
 </div>
 </div>
 </div>
 
 <div className="xl:w-2/3 w-full grid md:grid-cols-2 gap-8">
 <FeatureCard
 icon={<FileText className="h-8 w-8" />}
 title={t("feat1Title")}
 description={t("feat1Desc")}
 t={t}
 />
 <FeatureCard
 icon={<Gavel className="h-8 w-8" />}
 title={t("feat2Title")}
 description={t("feat2Desc")}
 featured
 t={t}
 />
 <FeatureCard
 icon={<ShieldCheck className="h-8 w-8" />}
 title={t("feat3Title")}
 description={t("feat3Desc")}
 t={t}
 />
 <FeatureCard
 icon={<Users className="h-8 w-8" />}
 title={t("feat4Title")}
 description={t("feat4Desc")}
 t={t}
 />
 <FeatureCard
 icon={<Clock className="h-8 w-8" />}
 title={t("feat5Title")}
 description={t("feat5Desc")}
 t={t}
 />
 <FeatureCard
 icon={<TrendingUp className="h-8 w-8" />}
 title={t("feat6Title")}
 description={t("feat6Desc")}
 t={t}
 />
 </div>
 </div>
 </div>
 </section>

 {/* About/Mission Section */}
 <section id="about" className="py-32 bg-background relative overflow-hidden">
 <div className="container mx-auto px-4 md:px-6">
 <div className="flex flex-col lg:flex-row-reverse gap-20 items-center">
 <div className="flex-1 space-y-10 animate-fade-up">
 <div className="space-y-6">
 <h2 className="text-primary font-black tracking-widest uppercase text-xs flex items-center gap-3 font-display">
 <span className="h-px w-10 bg-primary"></span>
 {t("aboutUs")}
 </h2>
 <h3 className="text-4xl md:text-5xl lg:text-6xl font-black font-display tracking-tight leading-tight">
 Our Mission for <span className="text-primary">Justice</span>
 </h3>
 <p className="text-xl text-muted-foreground leading-relaxed font-medium">
 JusticeHub is dedicated to modernizing the judicial infrastructure of Ethiopia, starting with local courts like the <span className="text-foreground font-bold">Hawassa Primary Court</span>. We believe that technology is the key to making justice faster, more transparent, and accessible to every citizen.
 </p>
 </div>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
 <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
 <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
 <Globe className="h-6 w-6" />
 </div>
 <h4 className="text-xl font-bold mb-2">Transparency</h4>
 <p className="text-muted-foreground text-sm font-medium">Full visibility into case status and judicial proceedings for all parties involved.</p>
 </div>
 <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
 <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
 <ShieldCheck className="h-6 w-6" />
 </div>
 <h4 className="text-xl font-bold mb-2">Efficiency</h4>
 <p className="text-muted-foreground text-sm font-medium">Reducing the backlog of cases through automated scheduling and digital filing.</p>
 </div>
 </div>
 </div>

 <div className="flex-1 w-full relative group">
 <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
 <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/20 dark:border-border">
 <img 
 src="/hawassa-primary-court.jpeg" 
 alt="Hawassa Primary Court" 
 className="w-full h-[600px] object-cover transform group-hover:scale-105 transition-transform duration-1000"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
 <div className="absolute bottom-10 left-10 text-white">
 <p className="text-sm font-black uppercase tracking-[0.2em] text-primary-foreground/80 mb-2">Pioneering Location</p>
 <h4 className="text-3xl font-black font-display">Hawassa Primary Court</h4>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* 5. Stats Section */}
 <section className="py-24 bg-gradient-to-br from-primary via-blue-900 to-primary text-white relative overflow-hidden">
 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-6xl bg-muted/50 blur-[150px] rounded-full"></div>

 <div className="container mx-auto px-4 md:px-6 relative z-10">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
 <div className="space-y-4 animate-fade-up">
 <h3 className="text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-tighter drop-shadow-2xl">10k+</h3>
 <p className="text-sm md:text-base font-black text-white/70 uppercase tracking-[0.2em] font-display">{t("activeCases")}</p>
 </div>
 <div className="space-y-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
 <h3 className="text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-tighter drop-shadow-2xl">50+</h3>
 <p className="text-sm md:text-base font-black text-white/70 uppercase tracking-[0.2em] font-display">{t("connectedCourts")}</p>
 </div>
 <div className="space-y-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
 <h3 className="text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-tighter drop-shadow-2xl">99%</h3>
 <p className="text-sm md:text-base font-black text-white/70 uppercase tracking-[0.2em] font-display">{t("resolutionRate")}</p>
 </div>
 <div className="space-y-4 animate-fade-up" style={{ animationDelay: "300ms" }}>
 <h3 className="text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-tighter drop-shadow-2xl">24/7</h3>
 <p className="text-sm md:text-base font-black text-white/70 uppercase tracking-[0.2em] font-display">{t("digitalAccess")}</p>
 </div>
 </div>
 </div>
 </section>

 {/* 6. CTA Section */}
 <section className="py-32 relative overflow-hidden bg-background">
 <div className="container mx-auto px-4 md:px-6 relative z-10">
 <div className="bg-gradient-to-br from-primary/95 via-blue-900 to-primary p-12 md:p-20 rounded-[3rem] text-white text-center shadow-2xl relative overflow-hidden group border border-white/10">
 {/* Background decorative elements */}
 <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000"></div>
 <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay"></div>
 
 <div className="max-w-3xl mx-auto space-y-8 relative z-10 animate-fade-up">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-black uppercase tracking-[0.2em] font-display mb-2">
 <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
 {t("heroBadge")}
 </div>
 
 <h2 className="text-4xl md:text-6xl font-black font-display tracking-tight leading-[1.1] drop-shadow-sm">
 Experience the Future of <br />
 <span className="text-blue-300 drop-shadow-md">Digital Justice</span>
 </h2>
 
 <p className="text-lg md:text-xl text-white/80 font-medium leading-relaxed max-w-2xl mx-auto">
 Join the growing community of Ethiopian legal professionals and citizens using our secure, transparent digital infrastructure.
 </p>
 
 <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
 <Link href="/signup">
 <Button size="lg" className="bg-white text-primary hover:bg-blue-50 h-16 px-10 text-lg font-bold rounded-full shadow-2xl shadow-black/20 transition-all hover:-translate-y-1 active:scale-95 w-full sm:w-auto">
 {t("ctaButton1")} <ArrowRight className="ml-2 h-5 w-5" />
 </Button>
 </Link>
 <Link href="/login">
 <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-16 px-10 text-lg font-bold rounded-full transition-all hover:-translate-y-1 active:scale-95 w-full sm:w-auto">
 {t("ctaButton2")}
 </Button>
 </Link>
 </div>
 
 <div className="pt-8 flex items-center justify-center gap-8 text-white/60 text-xs font-bold uppercase tracking-widest">
 <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /> SECURE</div>
 <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /> TRANSPARENT</div>
 <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /> IMMUTABLE</div>
 </div>
 </div>
 </div>
 </div>
 </section>
 </main>

 <footer className="w-full border-t py-24 bg-background border-border/40 relative overflow-hidden">
 <div className="absolute top-0 right-0 -z-10 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]"></div>
 <div className="container mx-auto px-4 md:px-6">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">
 {/* Column 1: Brand */}
 <div className="col-span-2 md:col-span-1 space-y-6">
 <div className="flex items-center gap-3 group cursor-pointer">
 <div className="bg-gradient-to-br from-primary to-blue-500 p-2 rounded-lg text-white shadow-lg group-hover:scale-110 transition-transform">
 <Scale className="h-5 w-5" />
 </div>
 <span className="text-xl font-black font-display tracking-tight">{t("justiceHub")}</span>
 </div>
 <p className="text-muted-foreground font-medium text-sm leading-relaxed">
 {t("footerDesc")}
 </p>
 <div className="flex gap-4">
 <div className="h-10 w-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer shadow-sm group">
 <Building className="h-5 w-5 group-hover:rotate-12 transition-transform" />
 </div>
 <div className="h-10 w-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer shadow-sm group">
 <Globe className="h-5 w-5 group-hover:rotate-12 transition-transform" />
 </div>
 </div>
 </div>

 {/* Column 2: Platform */}
 <div className="space-y-6">
 <h4 className="text-sm font-black uppercase tracking-widest text-foreground">{t("platform")}</h4>
 <ul className="space-y-4">
 {["eFiling", "caseSearch", "analytics", "integrations"].map((item) => (
 <li key={item}>
 <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t(item)}</Link>
 </li>
 ))}
 </ul>
 </div>

 {/* Column 3: Resources */}
 <div className="space-y-6">
 <h4 className="text-sm font-black uppercase tracking-widest text-foreground">{t("resources")}</h4>
 <ul className="space-y-4">
 {["helpCenter", "documentation", "devApi", "community"].map((item) => (
 <li key={item}>
 <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t(item)}</Link>
 </li>
 ))}
 </ul>
 </div>

 {/* Column 4: Company */}
 <div className="space-y-6">
 <h4 className="text-sm font-black uppercase tracking-widest text-foreground">{t("company")}</h4>
 <ul className="space-y-4">
 {["aboutUs", "careers", "privacyPolicy", "termsOfService"].map((item) => (
 <li key={item}>
 <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t(item)}</Link>
 </li>
 ))}
 </ul>
 </div>
 </div>

 <div className="pt-12 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-8">
 <p className="text-sm font-medium text-muted-foreground/60">
 &copy; {new Date().getFullYear()} JusticeHub. {t("footerRights")}
 </p>
 <div className="flex items-center gap-6 text-sm font-semibold text-muted-foreground/80">
 <span className="flex items-center gap-2">Built with <span className="text-primary animate-pulse">✦</span> in Ethiopia</span>
 </div>
 </div>
 </div>
 </footer>
 <Chatbot />
 </div>
 );
}

function FeatureCard({ icon, title, description, featured, t }) {
 return (
 <div className={`group flex flex-col p-8 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 ${featured ? 'bg-gradient-to-br from-card/90 via-card to-primary/5 shadow-xl shadow-primary/10 border-2 border-primary/20 relative overflow-hidden bg-background shadow-sm border-border' : 'bg-card shadow-sm border-border hover:shadow-xl hover:shadow-primary/5 border border-border/60 hover:border-primary/20'}`}>
 {featured && <div className="absolute top-0 right-0 p-4"><div className="bg-gradient-to-r from-primary to-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md">{t("popular")}</div></div>}
 <div className={`mb-6 p-4 rounded-2xl w-fit transition-all duration-500 shadow-inner ${featured ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-primary/30 scale-110 -rotate-3' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:-rotate-3'}`}>
 {icon}
 </div>
 <h3 className="text-2xl font-black font-display mb-3 text-foreground tracking-tight group-hover:text-primary transition-colors">{title}</h3>
 <p className="text-muted-foreground font-medium leading-relaxed flex-1 text-base">{description}</p>

 </div>
 );
}
