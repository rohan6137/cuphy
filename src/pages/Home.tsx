import { Link } from "wouter";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  ClipboardList,
  PlayCircle,
  ArrowRight,
  Zap,
  BookOpenCheck,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { settings } = useAppSettings();

  const [batches, setBatches] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      setBatchLoading(true);

      try {
        const batchSnap = await getDocs(collection(db, "batches"));
        const batchList = batchSnap.docs
          .map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
          .filter((batch: any) => batch.isVisible !== false && batch.isActive !== false)
          .sort((a: any, b: any) => Number(a.semester || 0) - Number(b.semester || 0))
          .slice(0, 3);

        setBatches(batchList);

        try {
          const noticesSnap = await getDocs(collection(db, "notices"));
          const noticeList = noticesSnap.docs
            .map((docItem) => ({
              id: docItem.id,
              ...docItem.data(),
            }))
            .filter((notice: any) => {
              if (notice.isVisible === false) return false;
              if (notice.type && notice.type !== "notice") return false;
              return true;
            });

          setNotices(noticeList);
        } catch (error) {
          console.error("Error loading notices:", error);
          setNotices([]);
        }
      } catch (error) {
        console.error("Error loading homepage data:", error);
        setBatches([]);
        setNotices([]);
      } finally {
        setBatchLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <Layout>
      {notices.length > 0 && (
        <div className="bg-primary text-primary-foreground py-2 overflow-hidden">
          <div className="flex items-center gap-2 px-4">
            <span className="text-xs font-bold shrink-0 bg-white/20 px-2 py-0.5 rounded">
              NOTICE
            </span>
            <div className="overflow-hidden flex-1">
              <div className="notice-ticker whitespace-nowrap text-sm">
                {notices.map((n: any) => n.title).join("  •  ")}
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-secondary/90 to-primary/30 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
              For CU Physics Honours Students
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold font-serif leading-tight mb-6">
              {settings.appName}
            </h1>

            <p className="text-lg md:text-xl text-white/75 mb-4 leading-relaxed">
              {settings.tagline}
            </p>

            <p className="text-base md:text-lg text-white/70 mb-8 leading-relaxed">
              Access video lectures, PDF notes, practice tests, and more — all in one place.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/batches">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 gap-2 text-white"
                >
                  Explore Batches <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              {!isAuthenticated && (
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 gap-2"
                  >
                    Sign In Free
                  </Button>
                </Link>
              )}
            </div>

            {(settings.contactEmail || settings.contactPhone) && (
              <div className="mt-8 text-sm text-white/70 space-y-1">
                {settings.contactEmail && <p>Email: {settings.contactEmail}</p>}
                {settings.contactPhone && <p>Phone: {settings.contactPhone}</p>}
              </div>
            )}


          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-center mb-3">
            Everything You Need to Excel
          </h2>
          <p className="text-muted-foreground text-center mb-10">
            Comprehensive tools designed for physics students
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {[
              {
                icon: PlayCircle,
                label: "Lectures",
                desc: "HD concept videos",
                tag: "Watch",
                bg: "from-blue-500 via-cyan-500 to-teal-400",
                glow: "bg-blue-300/30",
              },
              {
                icon: FileText,
                label: "Notes",
                desc: "Clean study PDFs",
                tag: "Study",
                bg: "from-violet-500 via-purple-500 to-indigo-500",
                glow: "bg-purple-300/30",
              },
              {
                icon: ClipboardList,
                label: "Tests",
                desc: "Timed practice",
                tag: "Practice",
                bg: "from-emerald-500 via-teal-500 to-cyan-500",
                glow: "bg-emerald-300/30",
              },
              {
                icon: BookOpenCheck,
                label: "PYQ",
                desc: "Previous year questions",
                tag: "Revise",
                bg: "from-orange-500 via-rose-500 to-pink-500",
                glow: "bg-orange-300/30",
              },
            ].map((f) => (
              <Card
                key={f.label}
                className={`relative overflow-hidden border-0 text-white bg-gradient-to-br ${f.bg} shadow-lg rounded-2xl cursor-default min-h-[150px] md:min-h-[170px]`}
              >
                <CardContent className="relative z-10 p-4 md:p-5 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <f.icon className="w-5 h-5 text-white" />
                    </div>

                    <span className="text-[10px] md:text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                      {f.tag}
                    </span>
                  </div>

                  <div className="mt-7">
                    <h3 className="font-bold text-sm md:text-base">{f.label}</h3>
                    <p className="text-[11px] md:text-xs text-white/85 mt-1">
                      {f.desc}
                    </p>
                  </div>

                  <div
                    className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${f.glow}`}
                  />
                  <f.icon className="absolute right-3 bottom-3 w-14 h-14 text-white/15" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-7">
            <h2 className="text-2xl md:text-3xl font-bold font-serif">
              Why Students Like CUPHY
            </h2>
            <p className="text-muted-foreground mt-1">
              Made for focused and affordable learning
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Shield,
                title: "Premium Feel",
                desc: "Clean UI with focused learning flow",
              },
              {
                icon: BookOpenCheck,
                title: "Semester-wise",
                desc: "Content stays organized and easy to follow",
              },
              {
                icon: Zap,
                title: "Save Time",
                desc: "Important materials available quickly",
              },
            ].map((item) => (
              <Card
                key={item.title}
                className="border-border bg-card/95 shadow-sm rounded-2xl"
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm md:text-base">
                      {item.title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-secondary to-primary/60 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold font-serif mb-4">
            Ready to Master Physics?
          </h2>
          <p className="text-white/70 mb-8">
            Join hundreds of physics students who are already learning with {settings.appName}.
          </p>

          <Link href={isAuthenticated ? "/batches" : "/login"}>
            <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2">
              {isAuthenticated ? "Browse Batches" : "Get Started Free"}{" "}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}