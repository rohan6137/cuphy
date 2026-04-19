import { useParams, Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  PlayCircle,
  Lock,
  Clock,
  FileText,
  ClipboardList,
  FileQuestion,
  File,
  Loader2,
  CheckCircle2,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccess } from "@/hooks/useAccess";
import { useToast } from "@/hooks/use-toast";

export default function SubjectDetail() {
  const params = useParams<{ batchId: string; subjectId: string }>();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [batch, setBatch] = useState<any>(null);
  const [subject, setSubject] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    hasAccess: hasPremiumBatchAccess,
    loading: accessLoading,
    status: accessStatus,
  } = useAccess(params.batchId, true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const batchId = params.batchId;
        const subjectId = params.subjectId;

        if (!batchId || !subjectId) {
          setBatch(null);
          setSubject(null);
          setLectures([]);
          setNotes([]);
          setPyqs([]);
          setTests([]);
          return;
        }

        const batchSnap = await getDoc(doc(db, "batches", batchId));
        const subjectSnap = await getDoc(doc(db, "subjects", subjectId));

        if (batchSnap.exists()) {
          const batchData = {
            id: batchSnap.id,
            ...batchSnap.data(),
          } as any;

          setBatch(
            batchData.isActive === false || batchData.isVisible === false
              ? null
              : batchData
          );
        } else {
          setBatch(null);
        }

        if (subjectSnap.exists()) {
          const subjectData = {
            id: subjectSnap.id,
            ...subjectSnap.data(),
          } as any;

          setSubject(subjectData.isVisible === false ? null : subjectData);
        } else {
          setSubject(null);
        }

        const lecturesSnap = await getDocs(
          query(
            collection(db, "lectures"),
            where("batchId", "==", batchId),
            where("subjectId", "==", subjectId)
          )
        );

        const lectureList = lecturesSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((item: any) => item.isVisible !== false);

        lectureList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setLectures(lectureList);

        const notesSnap = await getDocs(
          query(
            collection(db, "notes"),
            where("batchId", "==", batchId),
            where("subjectId", "==", subjectId)
          )
        );

        const notesList = notesSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((item: any) => item.isVisible !== false);

        notesList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setNotes(notesList);

        const pyqSnap = await getDocs(
          query(
            collection(db, "pyqs"),
            where("batchId", "==", batchId),
            where("subjectId", "==", subjectId)
          )
        );

        const pyqList = pyqSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((item: any) => item.isVisible !== false);

        pyqList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setPyqs(pyqList);

        const testsSnap = await getDocs(
          query(
            collection(db, "tests"),
            where("batchId", "==", batchId),
            where("subjectId", "==", subjectId)
          )
        );

        const testList = testsSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((item: any) => item.isVisible !== false);

        testList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setTests(testList);
      } catch (error) {
        console.error("Error loading subject details:", error);
        setBatch(null);
        setSubject(null);
        setLectures([]);
        setNotes([]);
        setPyqs([]);
        setTests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.batchId, params.subjectId]);

  const goToLogin = () => navigate("/login");
  const goToBatch = () => navigate(`/batches/${params.batchId}`);

  const showLockedToast = (label: string) => {
    if (accessStatus === "expired") {
      toast({
        title: "Subscription expired",
        description: `Your premium access has expired. Please renew to access this ${label}.`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Premium required",
      description: `Buy premium to access this ${label}.`,
    });
  };

  const handleLectureOpen = (lecture: any) => {
    const isPremiumLecture = lecture.isFree === false;
    const canOpen = !isPremiumLecture || hasPremiumBatchAccess;

    if (!isPremiumLecture) {
      navigate(`/lectures/${lecture.id}`);
      return;
    }

    if (!isAuthenticated) {
      goToLogin();
      return;
    }

    if (batch?.isActive === false) {
      toast({
        title: "Batch inactive",
        description: "This batch is currently inactive.",
        variant: "destructive",
      });
      return;
    }

    if (!canOpen) {
      showLockedToast("lecture");
      goToBatch();
      return;
    }

    navigate(`/lectures/${lecture.id}`);
  };

  const handleFileOpen = (item: any, isPremiumItem: boolean, label: string) => {
    const canOpen = !isPremiumItem || hasPremiumBatchAccess;

    if (!isPremiumItem) {
      if (item.fileUrl) {
        window.open(item.fileUrl, "_blank", "noopener,noreferrer");
      } else {
        toast({
          title: "File unavailable",
          description: "This file is not available yet.",
        });
      }
      return;
    }

    if (!isAuthenticated) {
      goToLogin();
      return;
    }

    if (batch?.isActive === false) {
      toast({
        title: "Batch inactive",
        description: "This batch is currently inactive.",
        variant: "destructive",
      });
      return;
    }

    if (!canOpen) {
      showLockedToast(label);
      goToBatch();
      return;
    }

    if (item.fileUrl) {
      window.open(item.fileUrl, "_blank", "noopener,noreferrer");
    } else {
      toast({
        title: "File unavailable",
        description: "This file is not available yet.",
      });
    }
  };

  const handleTestOpen = (test: any) => {
    const isPremiumTest = test.isPremium === true;
    const canOpen = !isPremiumTest || hasPremiumBatchAccess;

    if (!isPremiumTest) {
      navigate(`/tests/${test.id}`);
      return;
    }

    if (!isAuthenticated) {
      goToLogin();
      return;
    }

    if (batch?.isActive === false) {
      toast({
        title: "Batch inactive",
        description: "This batch is currently inactive.",
        variant: "destructive",
      });
      return;
    }

    if (!canOpen) {
      showLockedToast("test");
      goToBatch();
      return;
    }

    navigate(`/tests/${test.id}`);
  };

  if (loading || accessLoading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-14 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading subject...</p>
        </div>
      </Layout>
    );
  }

  if (!subject) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto p-10 text-center">
          <h2 className="text-2xl font-bold mb-2">Subject not found</h2>
          <p className="text-muted-foreground mb-6">
            This subject does not exist or is hidden.
          </p>

          <Link href={params.batchId ? `/batches/${params.batchId}/subjects` : "/batches"}>
            <Button>Back</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const defaultTab = subject?.showLectures
    ? "lectures"
    : subject?.showNotes
      ? "notes"
      : subject?.showPyq
        ? "pyq"
        : subject?.showTests
          ? "tests"
          : "lectures";

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/batches/${params.batchId}/subjects`}>
            <Button
              variant="ghost"
              className="gap-2 rounded-xl px-0 hover:bg-transparent"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Subjects
            </Button>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {batch?.semester && <Badge>Semester {batch.semester}</Badge>}

            {hasPremiumBatchAccess ? (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Premium Active
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Lock className="w-3.5 h-3.5" />
                Free Access
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue={defaultTab}>
          <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold">
                {subject.subjectName || "Untitled Subject"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Explore all available study materials for this subject.
              </p>
            </div>

            <TabsList className="flex flex-wrap gap-3 bg-transparent p-0 h-auto justify-start lg:justify-end">
              {subject?.showLectures && (
                <TabsTrigger
                  value="lectures"
                  className="rounded-2xl border bg-card px-5 py-3 text-sm md:text-base font-medium gap-2 shadow-sm hover:bg-muted/60 transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  <PlayCircle className="w-4 h-4" /> Lectures
                </TabsTrigger>
              )}

              {subject?.showNotes && (
                <TabsTrigger
                  value="notes"
                  className="rounded-2xl border bg-card px-5 py-3 text-sm md:text-base font-medium gap-2 shadow-sm hover:bg-muted/60 transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  <FileText className="w-4 h-4" /> Notes
                </TabsTrigger>
              )}

              {subject?.showPyq && (
                <TabsTrigger
                  value="pyq"
                  className="rounded-2xl border bg-card px-5 py-3 text-sm md:text-base font-medium gap-2 shadow-sm hover:bg-muted/60 transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  <FileQuestion className="w-4 h-4" /> PYQ
                </TabsTrigger>
              )}

              {subject?.showTests && (
                <TabsTrigger
                  value="tests"
                  className="rounded-2xl border bg-card px-5 py-3 text-sm md:text-base font-medium gap-2 shadow-sm hover:bg-muted/60 transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  <ClipboardList className="w-4 h-4" /> Tests
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {subject?.showLectures && (
            <TabsContent value="lectures">
              {lectures.length === 0 ? (
                <div className="rounded-3xl border bg-card shadow-sm p-12 text-center text-muted-foreground">
                  No lectures found for this subject.
                </div>
              ) : (
                <div className="space-y-4">
                  {lectures.map((lecture: any) => {
                    const isPremiumLecture = lecture.isFree === false;
                    const canOpen = !isPremiumLecture || hasPremiumBatchAccess;

                    return (
                      <div
                        key={lecture.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleLectureOpen(lecture)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleLectureOpen(lecture);
                          }
                        }}
                        className="group overflow-hidden rounded-[28px] border border-border/70 bg-card/95 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(108,59,255,0.10)] transition-all duration-300 cursor-pointer"
                      >
                        <div className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                          <div className="flex items-start gap-4 md:gap-5 min-w-0 flex-1">
                            <div className="relative w-40 sm:w-48 md:w-56 lg:w-60 h-24 sm:h-28 md:h-32 lg:h-36 rounded-2xl overflow-hidden shrink-0 bg-muted ring-1 ring-border/60 shadow-sm">
                              {lecture.youtubeVideoId ? (
                                <>
                                  <img
                                    src={`https://img.youtube.com/vi/${lecture.youtubeVideoId}/hqdefault.jpg`}
                                    className={`w-full h-full object-cover transition-transform duration-500 ${canOpen ? "group-hover:scale-[1.04]" : ""
                                      }`}
                                    alt={lecture.title}
                                  />

                                  <div
                                    className={`absolute inset-0 ${canOpen
                                      ? "bg-gradient-to-t from-black/45 via-black/10 to-transparent"
                                      : "bg-black/45 backdrop-blur-[1.5px]"
                                      }`}
                                  />

                                  {!canOpen && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="rounded-full bg-background/92 backdrop-blur-sm px-3 py-2 shadow-sm border border-border/60">
                                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                          <Lock className="w-4 h-4 text-primary" />
                                          Locked
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                  {isPremiumLecture ? (
                                    <Lock className="w-7 h-7 text-primary" />
                                  ) : (
                                    <PlayCircle className="w-7 h-7 text-primary" />
                                  )}
                                </div>
                              )}

                              <div className="absolute left-3 top-3">
                                {!isPremiumLecture && (
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-white/40 bg-background/85 backdrop-blur-sm"
                                  >
                                    Free
                                  </Badge>
                                )}
                              </div>

                              {lecture.duration ? (
                                <div className="absolute right-3 bottom-3">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-black/70 text-white px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                                    <Clock className="w-3 h-3" />
                                    {lecture.duration}
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-lg md:text-xl font-bold leading-snug line-clamp-2">
                                  {lecture.title || "Untitled Lecture"}
                                </h3>
                              </div>

                              {lecture.description ? (
                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                                  {lecture.description}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground mb-3">
                                  Structured video lesson for this topic.
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <span className="inline-flex items-center rounded-full bg-muted/70 px-3 py-1">
                                  Lecture {lecture.order || "-"}
                                </span>

                                {isPremiumLecture ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1">
                                    <Lock className="w-3.5 h-3.5" />
                                    Premium access
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1">
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    Free to watch
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 lg:self-center">
                            {canOpen ? (
                              <div className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-5 py-3 shadow-sm transition-all group-hover:shadow-md">
                                <PlayCircle className="w-4 h-4" />
                                <span className="font-semibold text-sm">Watch Lecture</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-2xl border border-muted-foreground/20 bg-muted/40 text-muted-foreground px-5 py-3 shadow-sm transition-all">
                                <Lock className="w-4 h-4" />
                                <span className="font-semibold text-sm">
                                  {isAuthenticated ? "Unlock Premium" : "Login to Watch"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          {subject?.showNotes && (
            <TabsContent value="notes">
              {notes.length === 0 ? (
                <div className="rounded-3xl border bg-card shadow-sm p-12 text-center text-muted-foreground">
                  No notes found for this subject.
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note: any) => {
                    const isPremiumNote = note.isPremium === true;
                    const canOpen = !isPremiumNote || hasPremiumBatchAccess;

                    return (
                      <div
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleFileOpen(note, isPremiumNote, "note")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleFileOpen(note, isPremiumNote, "note");
                          }
                        }}
                        className="rounded-[24px] border bg-card/95 shadow-sm hover:shadow-[0_14px_32px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-pointer"
                      >
                        <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                              {isPremiumNote ? (
                                <Lock className="w-6 h-6 text-primary" />
                              ) : (
                                <File className="w-6 h-6 text-primary" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-lg md:text-xl font-bold leading-snug">
                                  {note.title || "Untitled Note"}
                                </h3>

                                {isPremiumNote ? (
                                  <Badge variant="secondary">Premium</Badge>
                                ) : (
                                  <Badge variant="outline">Free</Badge>
                                )}
                              </div>

                              {note.description && (
                                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                  {note.description}
                                </p>
                              )}

                              <div className="text-sm text-muted-foreground">
                                Note {note.order || "-"}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {canOpen ? (
                              <div className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 shadow-sm transition-all">
                                <Download className="w-4 h-4" />
                                <span className="font-medium text-sm">Open Note</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-xl border border-muted-foreground/20 bg-muted/40 text-muted-foreground px-4 py-2.5 shadow-sm transition-all">
                                <Lock className="w-4 h-4" />
                                <span className="font-medium text-sm">
                                  {isAuthenticated ? "Unlock" : "Login"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          {subject?.showPyq && (
            <TabsContent value="pyq">
              {pyqs.length === 0 ? (
                <div className="rounded-3xl border bg-card shadow-sm p-12 text-center text-muted-foreground">
                  No previous questions found for this subject.
                </div>
              ) : (
                <div className="space-y-4">
                  {pyqs.map((item: any) => {
                    const isPremiumPyq = item.isPremium === true;
                    const canOpen = !isPremiumPyq || hasPremiumBatchAccess;

                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleFileOpen(item, isPremiumPyq, "PYQ")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleFileOpen(item, isPremiumPyq, "PYQ");
                          }
                        }}
                        className="rounded-[24px] border bg-card/95 shadow-sm hover:shadow-[0_14px_32px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-pointer"
                      >
                        <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                              {isPremiumPyq ? (
                                <Lock className="w-6 h-6 text-primary" />
                              ) : (
                                <FileQuestion className="w-6 h-6 text-primary" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-lg md:text-xl font-bold leading-snug">
                                  {item.title || "Untitled PYQ"}
                                </h3>

                                {item.year ? (
                                  <Badge variant="outline">{item.year}</Badge>
                                ) : null}

                                {isPremiumPyq ? (
                                  <Badge variant="secondary">Premium</Badge>
                                ) : (
                                  <Badge variant="outline">Free</Badge>
                                )}
                              </div>

                              {item.description && (
                                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                  {item.description}
                                </p>
                              )}

                              <div className="text-sm text-muted-foreground">
                                PYQ {item.order || "-"}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {canOpen ? (
                              <div className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 shadow-sm transition-all">
                                <Download className="w-4 h-4" />
                                <span className="font-medium text-sm">Open PYQ</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-xl border border-muted-foreground/20 bg-muted/40 text-muted-foreground px-4 py-2.5 shadow-sm transition-all">
                                <Lock className="w-4 h-4" />
                                <span className="font-medium text-sm">
                                  {isAuthenticated ? "Unlock" : "Login"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          {subject?.showTests && (
            <TabsContent value="tests">
              {tests.length === 0 ? (
                <div className="rounded-3xl border bg-card shadow-sm p-12 text-center text-muted-foreground">
                  No tests found for this subject.
                </div>
              ) : (
                <div className="space-y-4">
                  {tests.map((test: any) => {
                    const isPremiumTest = test.isPremium === true;
                    const canOpen = !isPremiumTest || hasPremiumBatchAccess;

                    return (
                      <div
                        key={test.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleTestOpen(test)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleTestOpen(test);
                          }
                        }}
                        className="rounded-[24px] border bg-card/95 shadow-sm hover:shadow-[0_14px_32px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-pointer"
                      >
                        <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                              {isPremiumTest ? (
                                <Lock className="w-6 h-6 text-primary" />
                              ) : (
                                <ClipboardList className="w-6 h-6 text-primary" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-lg md:text-xl font-bold leading-snug">
                                  {test.title || "Untitled Test"}
                                </h3>

                                {isPremiumTest ? (
                                  <Badge variant="secondary">Premium</Badge>
                                ) : (
                                  <Badge variant="outline">Free</Badge>
                                )}
                              </div>

                              {test.description && (
                                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                  {test.description}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span>{test.totalMarks || 0} marks</span>
                                <span>{test.durationMinutes || 0} min</span>
                                <span>Test {test.order || "-"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {canOpen ? (
                              <div className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 shadow-sm transition-all">
                                <PlayCircle className="w-4 h-4" />
                                <span className="font-medium text-sm">Start Test</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-xl border border-muted-foreground/20 bg-muted/40 text-muted-foreground px-4 py-2.5 shadow-sm transition-all">
                                <Lock className="w-4 h-4" />
                                <span className="font-medium text-sm">
                                  {isAuthenticated ? "Unlock" : "Login"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}