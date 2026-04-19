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
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Loader2,
  PlayCircle,
  FileText,
  FileQuestion,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function BatchSubjectsPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [batch, setBatch] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [openingSubjectId, setOpeningSubjectId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        if (!params.id) {
          setBatch(null);
          setSubjects([]);
          return;
        }

        const batchSnap = await getDoc(doc(db, "batches", params.id));

        if (!batchSnap.exists()) {
          setBatch(null);
          setSubjects([]);
          return;
        }

        const batchData = {
          id: batchSnap.id,
          ...batchSnap.data(),
        } as any;

        if (batchData.isActive === false || batchData.isVisible === false) {
          setBatch(null);
          setSubjects([]);
          return;
        }

        setBatch(batchData);

        const subjectsSnap = await getDocs(
          query(collection(db, "subjects"), where("batchId", "==", params.id))
        );

        const subjectList = subjectsSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((item: any) => item.isVisible !== false)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        setSubjects(subjectList);

        if (user?.uid || user?.email) {
          const enrollmentMap = new Map<string, any>();
          const subscriptionMap = new Map<string, any>();

          if (user?.email) {
            const enrollSnapByEmail = await getDocs(
              query(
                collection(db, "enrollments"),
                where("userEmail", "==", user.email),
                where("batchId", "==", params.id)
              )
            );

            enrollSnapByEmail.docs.forEach((docItem) => {
              enrollmentMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });

            const subSnapByEmail = await getDocs(
              query(
                collection(db, "subscriptions"),
                where("userEmail", "==", user.email),
                where("batchId", "==", params.id),
                where("active", "==", true)
              )
            );

            subSnapByEmail.docs.forEach((docItem) => {
              subscriptionMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          }

          if (user?.uid) {
            const enrollSnapByUid = await getDocs(
              query(
                collection(db, "enrollments"),
                where("userUid", "==", user.uid),
                where("batchId", "==", params.id)
              )
            );

            enrollSnapByUid.docs.forEach((docItem) => {
              enrollmentMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });

            const subSnapByUid = await getDocs(
              query(
                collection(db, "subscriptions"),
                where("userUid", "==", user.uid),
                where("batchId", "==", params.id),
                where("active", "==", true)
              )
            );

            subSnapByUid.docs.forEach((docItem) => {
              subscriptionMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          }

          setIsEnrolled(enrollmentMap.size > 0);

          let purchased = false;
          const now = new Date();

          Array.from(subscriptionMap.values()).forEach((sub: any) => {
            if (!sub.expiryDate) {
              purchased = true;
              return;
            }

            let expiryDate: Date | null = null;

            if (typeof sub.expiryDate?.toDate === "function") {
              expiryDate = sub.expiryDate.toDate();
            } else {
              const parsed = new Date(sub.expiryDate);
              expiryDate = isNaN(parsed.getTime()) ? null : parsed;
            }

            if (!expiryDate || expiryDate >= now) {
              purchased = true;
            }
          });

          setIsPurchased(purchased);
        } else {
          setIsEnrolled(false);
          setIsPurchased(false);
        }
      } catch (error) {
        console.error("Error loading batch subjects:", error);
        setBatch(null);
        setSubjects([]);
        setIsEnrolled(false);
        setIsPurchased(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, user?.email, user?.uid]);

  const handleOpenSubject = async (subjectId: string) => {
    setOpeningSubjectId(subjectId);
    navigate(`/batches/${params.id}/subjects/${subjectId}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-14 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading subjects...</p>
        </div>
      </Layout>
    );
  }

  if (!batch) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto p-10 text-center">
          <h2 className="text-2xl font-bold mb-2">Batch not available</h2>
          <p className="text-muted-foreground mb-6">
            This batch is inactive, hidden, or does not exist.
          </p>

          <Link href="/batches">
            <Button>Back to Batches</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const batchTitle = batch.batchName || batch.name || "Unnamed Batch";

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="relative mb-4">
          <div className="flex items-center">
            <Link href={`/batches/${params.id}`}>
              <Button
                variant="ghost"
                className="gap-2 rounded-xl px-0 hover:bg-transparent"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Batch
              </Button>
            </Link>
          </div>

          <div className="mt-3 md:mt-0 md:absolute md:left-1/2 md:-translate-x-1/2 md:top-0 text-center">
            <p className="text-lg md:text-xl font-semibold">{batchTitle}</p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <Badge>Semester {batch.semester}</Badge>

              {isPurchased && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Unlocked
                </Badge>
              )}

              {isEnrolled && !isPurchased && <Badge variant="outline">Enrolled</Badge>}
            </div>
          </div>
        </div>

        <div className="mt-8 mb-5">
          <h2 className="text-xl md:text-2xl font-bold">Subjects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select a subject to open its study materials.
          </p>
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-3xl border bg-card shadow-sm p-12 text-center text-muted-foreground">
            No subjects found in this batch yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {subjects.map((subject: any, index: number) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => handleOpenSubject(subject.id)}
                disabled={openingSubjectId === subject.id}
                className="group w-full text-left rounded-[24px] border bg-card/95 shadow-sm hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.985] transition-all duration-300 disabled:opacity-70"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/10 group-hover:bg-primary/15 group-hover:ring-primary/20 transition-all">
                      <BookOpen className="w-7 h-7 text-primary" />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="rounded-full px-3">
                        Subject {index + 1}
                      </Badge>

                      {openingSubjectId === subject.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold leading-snug mb-5 group-hover:text-primary transition">
                    {subject.subjectName || "Untitled Subject"}
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {subject.showLectures && (
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        <PlayCircle className="w-3.5 h-3.5 mr-1" />
                        Lectures
                      </Badge>
                    )}
                    {subject.showNotes && (
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Notes
                      </Badge>
                    )}
                    {subject.showPyq && (
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        <FileQuestion className="w-3.5 h-3.5 mr-1" />
                        PYQ
                      </Badge>
                    )}
                    {subject.showTests && (
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        <ClipboardList className="w-3.5 h-3.5 mr-1" />
                        Tests
                      </Badge>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <span className="text-base font-semibold text-primary">
                      Open Subject
                    </span>

                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:shadow-md transition-all duration-300">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}