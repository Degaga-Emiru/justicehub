"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
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
      <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-lg border-b shadow-sm" : "bg-transparent"}`}>
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-gradient-to-br from-primary to-primary/80 p-2.5 rounded-xl text-primary-foreground shadow-lg group-hover:shadow-primary/25 transition-all group-hover:scale-105">
              <Scale className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{t("justiceHub")}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4" href="#features">
              {t("features")}
            </Link>
            <Link className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4" href="#how-it-works">
              {t("howItWorksTitle")}
            </Link>
            <Link className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4" href="#about">
              {t("about")}
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4" />
              {language === "en" ? "Amharic" : "English"}
            </Button>
            <div className="hidden sm:block h-6 w-px bg-border"></div>
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" className="font-semibold">{t("login")}</Button>
            </Link>
            <Link href="/signup">
              <Button className="font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-full px-6">
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
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          {/* Animated Background Gradients */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"></div>
          <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl opacity-50"></div>

          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
              {/* Hero Text */}
              <div className="flex-1 text-center lg:text-left space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in">
                <div className="inline-flex items-center justify-center lg:justify-start rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-2">
                  <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                  {t("heroBadge")}
                </div>
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl leading-[1.1]">
                  {t("heroTitle1")} <br className="hidden sm:inline" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                    {t("heroTitle2")}
                  </span>
                </h1>
                <p className="max-w-[600px] mx-auto lg:mx-0 text-xl text-muted-foreground leading-relaxed">
                  {t("heroDesc")}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-full shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 transition-all transform hover:-translate-y-0.5">
                      {t("heroCTA")} <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-full border-2 hover:bg-muted transition-all">
                      {t("heroDemo")}
                    </Button>
                  </Link>
                </div>
                <div className="pt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground font-medium">
                  <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" /> {t("secureFeature")}</div>
                  <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" /> {t("transparentFeature")}</div>
                  <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" /> {t("immutableFeature")}</div>
                </div>
              </div>

              {/* Hero Visual Mockup */}
              <div className="flex-1 w-full max-w-2xl lg:max-w-none relative animate-in slide-in-from-right-12 duration-1000 delay-200 fade-in pl-0 lg:pl-10">
                <div className="relative rounded-3xl shadow-2xl overflow-hidden aspect-[4/3] group border border-border/40">
                  <div className="absolute inset-0 bg-primary/10 mix-blend-multiply group-hover:bg-transparent transition-colors duration-700 z-10"></div>
                  <img
                    src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=1200"
                    alt="Professional Legal Office"
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Glassmorphism overlay card */}
                  <div className="absolute bottom-6 left-6 right-6 p-5 sm:p-6 rounded-2xl border border-white/20 bg-background/70 backdrop-blur-xl shadow-2xl z-20 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-lg">{t("activeCases")}</h4>
                      <p className="text-sm font-medium text-muted-foreground">{t("resolutionRate")} - 99%</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -left-4 sm:-left-8 top-1/4 bg-card/90 backdrop-blur-lg p-3 sm:p-4 rounded-xl shadow-2xl border border-border/50 flex items-center gap-3 animate-bounce shadow-primary/20 z-30" style={{ animationDuration: '3s' }}>
                  <div className="bg-green-100/80 dark:bg-green-900/40 p-2.5 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{t("caseApproved")}</div>
                    <div className="text-xs text-muted-foreground">{t("justNow")}</div>
                  </div>
                </div>

                <div className="absolute -right-2 sm:-right-6 bottom-1/3 bg-card/90 backdrop-blur-lg p-3 sm:p-4 rounded-xl shadow-2xl border border-border/50 flex items-center gap-3 animate-bounce shadow-secondary/20 z-30" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                  <div className="bg-secondary/20 p-2.5 rounded-full">
                    <FileText className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{t("documentFiled")}</div>
                    <div className="text-xs text-muted-foreground">{t("twoMinsAgo")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Trust Section (Logos) */}
        <section className="py-12 border-b bg-muted/30 relative overflow-hidden">
          <div className="container px-4 md:px-6 text-center space-y-8 relative z-10 mx-auto">
            <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">{t("trustedBy")}</h2>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
              <div className="flex items-center justify-center space-x-3 text-xl md:text-2xl font-bold font-serif hover:scale-105 transition-transform cursor-default text-foreground/80"><Scale className="h-6 w-6 md:h-8 md:w-8 text-primary" /> <span className="tracking-tight">SupremeCourt</span></div>
              <div className="flex items-center justify-center space-x-2 text-xl md:text-2xl font-bold font-serif italic hover:scale-105 transition-transform cursor-default text-foreground/80">DistrictLaw</div>
              <div className="flex items-center justify-center space-x-2 text-xl md:text-2xl font-bold font-mono hover:scale-105 transition-transform cursor-default text-foreground/80">LEX_CORP</div>
              <div className="flex items-center justify-center space-x-2 text-xl md:text-2xl font-bold tracking-tighter hover:scale-105 transition-transform cursor-default text-foreground/80">JUSTICE.GOV</div>
            </div>
          </div>
        </section>

        {/* 3. How It Works Section */}
        <section id="how-it-works" className="py-24 bg-background relative overflow-hidden">
          {/* Subtle background element */}
          <div className="absolute right-0 top-1/4 -z-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>

          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              <div className="flex-1 space-y-10">
                <div className="space-y-4">
                  <h2 className="text-primary font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                    <span className="h-px w-8 bg-primary"></span>
                    {t("howItWorksSubtitle")}
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t("howItWorksTitle")}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">{t("howItWorksDesc")}</p>
                </div>

                <div className="space-y-8">
                  {/* Step 1 */}
                  <div className="flex gap-6 group">
                    <div className="flex-shrink-0 mt-1 h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">1</div>
                    <div>
                      <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{t("step1Title")}</h4>
                      <p className="text-muted-foreground leading-relaxed">{t("step1Desc")}</p>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex gap-6 group">
                    <div className="flex-shrink-0 mt-1 h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">2</div>
                    <div>
                      <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{t("step2Title")}</h4>
                      <p className="text-muted-foreground leading-relaxed">{t("step2Desc")}</p>
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div className="flex gap-6 group">
                    <div className="flex-shrink-0 mt-1 h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">3</div>
                    <div>
                      <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{t("step3Title")}</h4>
                      <p className="text-muted-foreground leading-relaxed">{t("step3Desc")}</p>
                    </div>
                  </div>
                </div>

                <Button className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 h-12 px-8 text-base transition-all hover:-translate-y-0.5" size="lg">
                  {t("readDocs")} <BookOpen className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-secondary/20 rounded-3xl transform rotate-3 scale-105 transition-transform hover:rotate-6 duration-700"></div>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50 group">
                  <div className="absolute inset-0 bg-primary/10 mix-blend-multiply group-hover:bg-transparent transition-all duration-700 z-10"></div>
                  <img
                    src="https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?auto=format&fit=crop&q=80&w=1200"
                    alt="Scales of Justice"
                    className="object-cover aspect-square md:aspect-[4/3] w-full transform group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Features Section */}
        <section id="features" className="py-24 relative bg-muted/20 border-t">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-20 space-y-4 max-w-3xl mx-auto">
              <h2 className="text-primary font-bold tracking-widest uppercase text-sm flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-primary"></span>
                {t("featuresSubtitle")}
                <span className="h-px w-8 bg-primary"></span>
              </h2>
              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                {t("featuresTitle")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{t("featuresTitleSuffix")}</span>
              </h3>
              <p className="text-xl text-muted-foreground leading-relaxed mt-4">
                {t("featuresDesc")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<FileText className="h-7 w-7" />}
                title={t("feat1Title")}
                description={t("feat1Desc")}
                t={t}
              />
              <FeatureCard
                icon={<Gavel className="h-7 w-7" />}
                title={t("feat2Title")}
                description={t("feat2Desc")}
                featured
                t={t}
              />
              <FeatureCard
                icon={<ShieldCheck className="h-7 w-7" />}
                title={t("feat3Title")}
                description={t("feat3Desc")}
                t={t}
              />
              <FeatureCard
                icon={<Users className="h-7 w-7" />}
                title={t("feat4Title")}
                description={t("feat4Desc")}
                t={t}
              />
              <FeatureCard
                icon={<Clock className="h-7 w-7" />}
                title={t("feat5Title")}
                description={t("feat5Desc")}
                t={t}
              />
              <FeatureCard
                icon={<TrendingUp className="h-7 w-7" />}
                title={t("feat6Title")}
                description={t("feat6Desc")}
                t={t}
              />
            </div>
          </div>
        </section>

        {/* 5. Stats Section */}
        <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl bg-secondary/10 blur-[120px] rounded-full"></div>

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-primary-foreground/20">
              <div className="space-y-3 p-4">
                <h3 className="text-5xl md:text-6xl font-black tracking-tighter drop-shadow-md">10k+</h3>
                <p className="text-sm md:text-base font-medium text-primary-foreground/80 uppercase tracking-wider">{t("activeCases")}</p>
              </div>
              <div className="space-y-3 p-4">
                <h3 className="text-5xl md:text-6xl font-black tracking-tighter drop-shadow-md">50+</h3>
                <p className="text-sm md:text-base font-medium text-primary-foreground/80 uppercase tracking-wider">{t("connectedCourts")}</p>
              </div>
              <div className="space-y-3 p-4">
                <h3 className="text-5xl md:text-6xl font-black tracking-tighter drop-shadow-md">99%</h3>
                <p className="text-sm md:text-base font-medium text-primary-foreground/80 uppercase tracking-wider">{t("resolutionRate")}</p>
              </div>
              <div className="space-y-3 p-4">
                <h3 className="text-5xl md:text-6xl font-black tracking-tighter drop-shadow-md">24/7</h3>
                <p className="text-sm md:text-base font-medium text-primary-foreground/80 uppercase tracking-wider">{t("digitalAccess")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. CTA Section */}
        <section className="py-32 relative overflow-hidden bg-background">
          <div className="absolute inset-0 bg-primary/5"></div>
          <div className="absolute -top-1/2 -right-1/4 w-full max-w-3xl h-[800px] bg-primary/10 blur-[100px] rounded-full mix-blend-multiply opacity-50"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-full max-w-3xl h-[800px] bg-secondary/10 blur-[100px] rounded-full mix-blend-multiply opacity-50"></div>

          <div className="container mx-auto px-4 md:px-6 relative z-10 text-center space-y-10 max-w-4xl">
            <h2 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
              {t("ctaTitle")}
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
              {t("ctaDesc")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
              <Link href="/signup">
                <Button size="lg" className="h-16 px-12 text-lg rounded-full shadow-2xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
                  {t("ctaButton1")} <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-16 px-12 text-lg rounded-full border-2 bg-background/50 backdrop-blur-sm hover:bg-muted transition-all duration-300 w-full sm:w-auto">
                  {t("ctaButton2")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t py-12 bg-background border-border/40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <Scale className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold tracking-tight">{t("justiceHub")}</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs">
                {t("footerDesc")}
              </p>
              <div className="flex gap-4 pt-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"><Building className="h-4 w-4" /></div>
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"><Globe className="h-4 w-4" /></div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-foreground">{t("platform")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">{t("eFiling")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("caseSearch")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("analytics")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("integrations")}</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-foreground">{t("resources")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">{t("helpCenter")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("documentation")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("devApi")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("community")}</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-foreground">{t("company")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">{t("aboutUs")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("careers")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("privacyPolicy")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("termsOfService")}</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} JusticeHub. {t("footerRights")}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {t("madeWithLove")}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, featured, t }) {
  return (
    <div className={`group flex flex-col p-8 rounded-3xl transition-all duration-500 hover:-translate-y-3 ${featured ? 'bg-gradient-to-br from-card/80 via-card to-primary/5 shadow-2xl shadow-primary/10 border-2 border-primary/20 relative overflow-hidden backdrop-blur-sm' : 'bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 border border-border/60 hover:border-primary/30'}`}>
      {featured && <div className="absolute top-0 right-0 p-4"><div className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">{t("popular")}</div></div>}
      <div className={`mb-6 p-4 rounded-2xl w-fit transition-all duration-500 shadow-inner ${featured ? 'bg-primary text-primary-foreground shadow-primary/30 scale-110' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110'}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-3 text-foreground tracking-tight group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-muted-foreground leading-relaxed flex-1 text-base">{description}</p>

      <div className="mt-8 flex items-center text-sm font-bold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
        {t("learnMore")} <ChevronRight className="ml-1 h-5 w-5" />
      </div>
    </div>
  );
}
