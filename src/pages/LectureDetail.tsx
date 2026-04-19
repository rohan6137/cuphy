import { useParams, Link } from "wouter";
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
  Clock,
  BookOpen,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccess } from "@/hooks/useAccess";

export default function LectureDetailPage() {
  const params = useParams();
  const { isAuthenticated } = useAuth();

  const [lecture, setLecture] = useState<any>(null);
  const [subject, setSubject] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [allLectures, setAllLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isPremiumLecture = lecture ? lecture.isFree === false : false;

  const {
    hasAccess,
    loading: accessLoading,
    status,
  } = useAccess(lecture?.batchId, isPremiumLecture);

  useEffect(() => {
    const fetchLectureData = async () => {
      setLoading(true);

      try {
        const lectureId = params.id;

        if (!lectureId) {
          setLecture(null);
          return;
        }

        const lectureSnap = await getDoc(doc(db, "lectures", lectureId));

        if (!lectureSnap.exists()) {
          setLecture(null);
          return;
        }

        const currentLecture = {
          id: lectureSnap.id,
          ...lectureSnap.data(),
        };

        if (currentLecture.isVisible === false) {
          setLecture(null);
          return;
        }

        setLecture(currentLecture);

        // SUBJECT
        if (currentLecture.subjectId) {
          const subjectSnap = await getDoc(
            doc(db, "subjects", currentLecture.subjectId)
          );
          if (subjectSnap.exists()) {
            const subjectData = {
              id: subjectSnap.id,
              ...subjectSnap.data(),
            } as any;

            setSubject(subjectData.isVisible === false ? null : subjectData);
          } else {
            setSubject(null);
          }
        } else {
          setSubject(null);
        }

        // BATCH
        if (currentLecture.batchId) {
          const batchSnap = await getDoc(doc(db, "batches", currentLecture.batchId));
          if (batchSnap.exists()) {
            const batchData = {
              id: batchSnap.id,
              ...batchSnap.data(),
            } as any;

            if (batchData.isActive === false || batchData.isVisible === false) {
              setBatch(null);
            } else {
              setBatch(batchData);
            }
          } else {
            setBatch(null);
          }
        } else {
          setBatch(null);
        }

        // PLAYLIST
        if (currentLecture.batchId && currentLecture.subjectId) {
          const lecturesSnap = await getDocs(
            query(
              collection(db, "lectures"),
              where("batchId", "==", currentLecture.batchId),
              where("subjectId", "==", currentLecture.subjectId)
            )
          );

          const lectureList = lecturesSnap.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
            }))
            .filter((item: any) => item.isVisible !== false);

          lectureList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          setAllLectures(lectureList);
        } else {
          setAllLectures([]);
        }
      } catch (error) {
        console.error("Error loading lecture:", error);
        setLecture(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLectureData();
  }, [params.id]);

  if (loading || accessLoading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading lecture...</p>
        </div>
      </Layout>
    );
  }

  if (!lecture) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground">Lecture not found</p>
          <Link href="/batches">
            <Button className="mt-4">Back to Batches</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const currentIndex = allLectures.findIndex((l) => l.id === lecture.id);
  const prevLecture = currentIndex > 0 ? allLectures[currentIndex - 1] : null;
  const nextLecture =
    currentIndex >= 0 && currentIndex < allLectures.length - 1
      ? allLectures[currentIndex + 1]
      : null;

  const backHref =
    lecture.batchId && lecture.subjectId
      ? `/batches/${lecture.batchId}/subjects/${lecture.subjectId}`
      : lecture.batchId
      ? `/batches/${lecture.batchId}`
      : "/batches";

  const canPlayCurrentLecture = !isPremiumLecture || hasAccess;

  const renderVideoPlayer = () => {
    if (!canPlayCurrentLecture) {
      return (
        <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-muted border flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-bold mb-2">Premium Lecture Locked</h2>
            <p className="text-muted-foreground mb-6">
              This lecture is available only for premium batch access.
            </p>

            {status === "login_required" ? (
              <Link href="/login">
                <Button className="rounded-xl">Login to Continue</Button>
              </Link>
            ) : lecture.batchId ? (
              <Link href={`/batches/${lecture.batchId}`}>
                <Button className="rounded-xl">Buy Premium</Button>
              </Link>
            ) : (
              <Button disabled className="rounded-xl">
                Batch Not Found
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (lecture.youtubeVideoId) {
      return (
        <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${lecture.youtubeVideoId}?rel=0&modestbranding=1&controls=1&disablekb=1`}
            title={lecture.title || "Lecture video"}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    if (lecture.videoUrl) {
      return (
        <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-black">
          <video
            src={lecture.videoUrl}
            controls
            controlsList="nodownload"
            className="w-full h-full"
          />
        </div>
      );
    }

    return (
      <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-black flex items-center justify-center">
        <div className="text-white/80">Video not available</div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Link href={backHref}>
            <Button variant="ghost" size="sm" className="mb-6 gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>

          {renderVideoPlayer()}

          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant={lecture.isFree ? "outline" : "secondary"}>
                {lecture.isFree ? "Free Lecture" : "Premium Lecture"}
              </Badge>

              {lecture.duration && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {lecture.duration}
                </span>
              )}

              {subject?.subjectName && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> {subject.subjectName}
                </span>
              )}

              {batch?.semester && (
                <span className="text-sm text-muted-foreground">
                  Semester {batch.semester}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold font-serif mb-3">
              {lecture.title || "Untitled Lecture"}
            </h1>

            {lecture.description && (
              <p className="text-muted-foreground leading-relaxed mb-6">
                {lecture.description}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {prevLecture ? (
                <Link href={`/lectures/${prevLecture.id}`}>
                  <Button variant="outline" className="gap-2 rounded-xl">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" disabled className="gap-2 rounded-xl">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
              )}

              {nextLecture ? (
                <Link href={`/lectures/${nextLecture.id}`}>
                  <Button className="gap-2 rounded-xl">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Button disabled className="gap-2 rounded-xl">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-card border rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Lecture Playlist</h2>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {allLectures.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No lectures found in this subject
                </div>
              ) : (
                allLectures.map((item: any) => {
                  const isActive = item.id === lecture.id;
                  const isPremiumItem = item.isFree === false;
                  const isLockedItem = isPremiumItem && !hasAccess;

                  return (
                    <Link key={item.id} href={`/lectures/${item.id}`}>
                      <div
                        className={`border rounded-xl p-3 transition cursor-pointer ${
                          isActive
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/40"
                        } ${isLockedItem ? "opacity-80" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isPremiumItem ? (
                              <Lock
                                className={`w-5 h-5 ${
                                  isActive ? "text-primary" : "text-muted-foreground"
                                }`}
                              />
                            ) : (
                              <PlayCircle
                                className={`w-5 h-5 ${
                                  isActive ? "text-primary" : "text-muted-foreground"
                                }`}
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-medium text-sm line-clamp-2">
                                {item.title || "Untitled Lecture"}
                              </p>

                              {isPremiumItem ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-2 py-0"
                                >
                                  Premium
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-2 py-0"
                                >
                                  Free
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Lecture {item.order || "-"}
                              {item.duration ? ` • ${item.duration}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}