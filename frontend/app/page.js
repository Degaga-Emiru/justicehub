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
      <header className={`fixed top-0 z-50 w-full transition-all duration-500 ${scrolled ? "glass shadow-sm" : "bg-transparent py-4"}`}>
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-gradient-to-br from-primary to-blue-500 p-2.5 rounded-xl text-white shadow-lg group-hover:shadow-primary/30 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
              <Scale className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black font-display tracking-tight text-foreground group-hover:text-primary transition-colors">{t("justiceHub")}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-all hover:-translate-y-0.5" href="#features">
              {t("features")}
            </Link>
            <Link className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-all hover:-translate-y-0.5" href="#how-it-works">
              {t("howItWorksTitle")}
            </Link>
            <Link className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-all hover:-translate-y-0.5" href="#about">
              {t("about")}
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
                <div className="inline-flex items-center justify-center lg:justify-start rounded-full border border-primary/20 glass shadow-sm px-4 py-1.5 text-sm font-medium text-primary mb-2">
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
                    <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-full border-2 hover:bg-muted/50 glass hover:text-foreground transition-all duration-300 font-semibold">
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
                <div className="relative rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden aspect-[4/3] border-[6px] border-white/40 dark:border-white/10 group floating-glow">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent mix-blend-overlay z-10 transition-colors duration-700"></div>
                  <img
                    src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=1200"
                    alt="Professional Legal Office"
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 ease-out"
                  />
                  {/* Glassmorphism overlay card */}
                  <div className="absolute bottom-6 left-6 right-6 p-5 sm:p-6 rounded-2xl glass z-20 flex items-center justify-between group-hover:translate-y-[-4px] transition-transform duration-500">
                    <div>
                      <h4 className="font-bold font-display text-foreground text-lg">{t("activeCases")}</h4>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> {t("resolutionRate")} - 99%
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center shadow-lg shadow-primary/30">
                      <LayoutDashboard className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -left-6 sm:-left-12 top-1/4 glass p-4 rounded-2xl shadow-xl shadow-primary/10 flex items-center gap-4 animate-[fade-up_1s_ease-out_1s_both] z-30 hover:scale-105 transition-transform duration-300">
                  <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2.5 rounded-full shadow-inner">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold font-display">{t("caseApproved")}</div>
                    <div className="text-xs font-medium text-muted-foreground">{t("justNow")}</div>
                  </div>
                </div>

                <div className="absolute -right-4 sm:-right-8 bottom-1/3 glass p-4 rounded-2xl shadow-xl shadow-secondary/10 flex items-center gap-4 animate-[fade-up_1s_ease-out_1.5s_both] z-30 hover:scale-105 transition-transform duration-300">
                  <div className="bg-secondary p-2.5 rounded-full shadow-inner">
                    <FileText className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-bold font-display">{t("documentFiled")}</div>
                    <div className="text-xs font-medium text-muted-foreground">{t("twoMinsAgo")}</div>
                  </div>
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
                    <div className="flex-shrink-0 mt-1 h-16 w-16 rounded-[1.25rem] glass shadow-inner text-primary flex items-center justify-center font-black font-display text-2xl group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">1</div>
                    <div className="space-y-2">
                      <h4 className="text-2xl font-black font-display group-hover:text-primary transition-colors">{t("step1Title")}</h4>
                      <p className="text-muted-foreground font-medium leading-relaxed text-lg">{t("step1Desc")}</p>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex gap-8 group">
                    <div className="flex-shrink-0 mt-1 h-16 w-16 rounded-[1.25rem] glass shadow-inner text-primary flex items-center justify-center font-black font-display text-2xl group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">2</div>
                    <div className="space-y-2">
                      <h4 className="text-2xl font-black font-display group-hover:text-primary transition-colors">{t("step2Title")}</h4>
                      <p className="text-muted-foreground font-medium leading-relaxed text-lg">{t("step2Desc")}</p>
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div className="flex gap-8 group">
                    <div className="flex-shrink-0 mt-1 h-16 w-16 rounded-[1.25rem] glass shadow-inner text-primary flex items-center justify-center font-black font-display text-2xl group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">3</div>
                    <div className="space-y-2">
                      <h4 className="text-2xl font-black font-display group-hover:text-primary transition-colors">{t("step3Title")}</h4>
                      <p className="text-muted-foreground font-medium leading-relaxed text-lg">{t("step3Desc")}</p>
                    </div>
                  </div>
                </div>

                <Button className="rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 h-16 px-10 text-lg font-bold transition-all hover:-translate-y-1 bg-gradient-to-r from-primary to-blue-600 text-white" size="lg">
                  {t("readDocs")} <BookOpen className="ml-2 h-6 w-6" />
                </Button>
              </div>

              <div className="flex-1 w-full relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-secondary/30 rounded-[3rem] transform rotate-3 scale-105 transition-transform group-hover:rotate-6 duration-1000 blur-sm opacity-50"></div>
                <div className="relative rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.15)] border-[8px] border-white/50 dark:border-white/5 floating-glow">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 z-10 transition-opacity duration-700 opacity-60 group-hover:opacity-30"></div>
                  <img
                    src="https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?auto=format&fit=crop&q=80&w=1200"
                    alt="Scales of Justice"
                    className="object-cover aspect-square md:aspect-[4/3] w-full transform group-hover:scale-110 transition-transform duration-1000 ease-out"
                  />
                  <div className="absolute bottom-10 left-10 z-20 space-y-2">
                    <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 text-xs uppercase font-black tracking-widest">{t("professional")}</Badge>
                    <h5 className="text-white text-3xl font-black font-display tracking-tight">{t("precisionResults")}</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Features Section */}
        <section id="features" className="py-32 relative bg-muted/30 border-t">
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

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
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
        </section>

        {/* 5. Stats Section */}
        <section className="py-24 bg-gradient-to-br from-primary via-blue-900 to-primary text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-6xl bg-white/10 blur-[150px] rounded-full"></div>

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
        <section className="py-40 relative overflow-hidden bg-background">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          <div className="absolute -top-1/2 -right-1/4 w-full max-w-4xl h-[1000px] bg-primary/15 blur-[150px] rounded-full mix-blend-multiply opacity-60 animate-pulse-slow"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-full max-w-4xl h-[1000px] bg-blue-500/10 blur-[150px] rounded-full mix-blend-multiply opacity-60"></div>

          <div className="container mx-auto px-4 md:px-6 relative z-10 text-center space-y-12 max-w-5xl animate-fade-up">
            <h2 className="text-6xl md:text-8xl lg:text-9xl font-black font-display tracking-tight text-foreground leading-[0.95] drop-shadow-sm">
              {t("ctaTitle")}
            </h2>
            <p className="text-2xl md:text-3xl text-muted-foreground font-medium max-w-3xl mx-auto leading-relaxed">
              {t("ctaDesc")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-8 pt-10">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="h-20 px-16 text-xl font-bold rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-2 transition-all duration-500 bg-gradient-to-r from-primary via-blue-600 to-primary text-white w-full">
                  {t("ctaButton1")} <ArrowRight className="ml-3 h-8 w-8" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="h-20 px-16 text-xl font-bold rounded-full border-2 glass hover:bg-muted/50 transition-all duration-500 w-full">
                  {t("ctaButton2")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t py-24 bg-background border-border/40 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-16 mb-24">
            <div className="col-span-2 space-y-8">
              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="bg-gradient-to-br from-primary to-blue-500 p-2 rounded-lg text-white shadow-lg group-hover:scale-110 transition-transform">
                  <Scale className="h-6 w-6" />
                </div>
                <span className="text-2xl font-black font-display tracking-tight">{t("justiceHub")}</span>
              </div>
              <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-sm">
                {t("footerDesc")}
              </p>
              <div className="flex gap-6">
                <div className="h-12 w-12 rounded-xl glass flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer shadow-sm group">
                  <Building className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                </div>
                <div className="h-12 w-12 rounded-xl glass flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer shadow-sm group">
                  <Globe className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="font-black font-display uppercase tracking-widest text-xs text-primary">{t("platform")}</h4>
              <ul className="space-y-4 text-base font-medium text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">{t("eFiling")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("caseSearch")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("analytics")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("integrations")}</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="font-black font-display uppercase tracking-widest text-xs text-primary">{t("resources")}</h4>
              <ul className="space-y-4 text-base font-medium text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">{t("helpCenter")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("documentation")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("devApi")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("community")}</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="font-black font-display uppercase tracking-widest text-xs text-primary">{t("company")}</h4>
              <ul className="space-y-4 text-base font-medium text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">{t("aboutUs")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("careers")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("privacyPolicy")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("termsOfService")}</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-base font-medium text-muted-foreground/60">
              &copy; {new Date().getFullYear()} JusticeHub. {t("footerRights")}
            </p>
            <div className="flex items-center gap-6 text-base font-semibold text-muted-foreground/80">
              <span className="flex items-center gap-2">Built with <span className="text-primary animate-pulse">✦</span> in Ethiopia</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, featured, t }) {
  return (
    <div className={`group flex flex-col p-8 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 ${featured ? 'bg-gradient-to-br from-card/90 via-card to-primary/5 shadow-xl shadow-primary/10 border-2 border-primary/20 relative overflow-hidden glass' : 'glass-card hover:shadow-xl hover:shadow-primary/5 border border-border/60 hover:border-primary/20'}`}>
      {featured && <div className="absolute top-0 right-0 p-4"><div className="bg-gradient-to-r from-primary to-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md">{t("popular")}</div></div>}
      <div className={`mb-6 p-4 rounded-2xl w-fit transition-all duration-500 shadow-inner ${featured ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-primary/30 scale-110 -rotate-3' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:-rotate-3'}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-black font-display mb-3 text-foreground tracking-tight group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-muted-foreground font-medium leading-relaxed flex-1 text-base">{description}</p>

      <div className="mt-8 flex items-center text-sm font-bold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
        {t("learnMore")} <ChevronRight className="ml-1 h-5 w-5" />
      </div>
    </div>
  );
}
