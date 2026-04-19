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
  Users,
  ArrowRight,
  Zap,
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

            <div className="flex flex-wrap gap-6 mt-10 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>500+ Students</span>
              </div>
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-primary" />
                <span>200+ Video Lectures</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>100+ PDF Notes</span>
              </div>
            </div>
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: PlayCircle,
                label: "Video Lectures",
                desc: "Structured concept learning",
                color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
                href: "/batches",
              },
              {
                icon: FileText,
                label: "PDF Notes",
                desc: "Handwritten & typed notes",
                color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
                href: "/notes",
              },
              {
                icon: ClipboardList,
                label: "Tests & Quizzes",
                desc: "MCQ practice tests",
                color: "text-green-500 bg-green-50 dark:bg-green-900/20",
                href: "/tests",
              },
              {
                icon: Zap,
                label: "Semester-wise",
                desc: "Organized by semester",
                color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
                href: "/batches",
              },
            ].map((f) => (
              <Link key={f.label} href={f.href}>
                <Card className="text-center border-border hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <CardContent className="p-4 pt-6">
                    <div
                      className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mx-auto mb-3`}
                    >
                      <f.icon className={`w-6 h-6 ${f.color.split(" ")[0]}`} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{f.label}</h3>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-serif">
                Available Batches
              </h2>
              <p className="text-muted-foreground mt-1">
                Choose your semester and start learning
              </p>
            </div>

            <Link href="/batches">
              <Button variant="ghost" className="gap-2">
                View All <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {batchLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No batches available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {batches.map((batch: any) => {
                const batchTitle =
                  batch.batchName || batch.name || "Unnamed Batch";

                return (
                  <Card
                    key={batch.id}
                    className="hover:shadow-lg transition-shadow border-border overflow-hidden"
                  >
                    <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />

                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary" className="text-xs">
                          Semester {batch.semester}
                        </Badge>

                        {batch.originalPrice ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            Sale
                          </Badge>
                        ) : null}
                      </div>

                      <h3 className="font-bold text-lg mt-2">{batchTitle}</h3>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {batch.description || "No description available"}
                      </p>
                    </CardHeader>

                    <CardContent className="pb-4">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl font-bold text-primary">
                          ₹{batch.price || 0}
                        </span>

                        {batch.originalPrice ? (
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{batch.originalPrice}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/batches/${batch.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>

                        {batch.paymentLink ? (
                          <a
                            href={batch.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <Button
                              size="sm"
                              className="w-full bg-primary hover:bg-primary/90"
                            >
                              Subscribe
                            </Button>
                          </a>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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