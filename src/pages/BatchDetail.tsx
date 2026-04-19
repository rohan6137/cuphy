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
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  PlayCircle,
  GraduationCap,
  Loader2,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkEnrollment, checkPremiumAccess } from "@/lib/access";

export default function BatchDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [batch, setBatch] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [purchaseChecking, setPurchaseChecking] = useState(true);

  const loadAccessState = async (
    batchId: string,
    userUid?: string,
    userEmail?: string
  ) => {
    if ((!userUid && !userEmail) || !batchId) {
      setIsEnrolled(false);
      setIsPurchased(false);
      setPurchaseChecking(false);
      return;
    }

    try {
      const enrolled = await checkEnrollment(
        userUid || "",
        userEmail || "",
        batchId
      );

      const premium = await checkPremiumAccess(
        userUid || "",
        userEmail || "",
        batchId
      );

      setIsEnrolled(enrolled);
      setIsPurchased(premium);
    } catch (error) {
      console.error("Access state load error:", error);
      setIsEnrolled(false);
      setIsPurchased(false);
    } finally {
      setPurchaseChecking(false);
    }
  };

  const loadBatchData = async () => {
    setLoading(true);
    setPurchaseChecking(true);

    try {
      if (!params.id) {
        setBatch(null);
        setSubjects([]);
        setLectures([]);
        setIsEnrolled(false);
        setIsPurchased(false);
        return;
      }

      const batchRef = doc(db, "batches", params.id);
      const batchSnap = await getDoc(batchRef);

      if (!batchSnap.exists()) {
        setBatch(null);
        setSubjects([]);
        setLectures([]);
        setIsEnrolled(false);
        setIsPurchased(false);
        return;
      }

      const batchData = {
        id: batchSnap.id,
        ...batchSnap.data(),
      } as any;

      if (batchData.isActive === false || batchData.isVisible === false) {
        setBatch(null);
        setSubjects([]);
        setLectures([]);
        setIsEnrolled(false);
        setIsPurchased(false);
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

      const lecturesSnap = await getDocs(
        query(collection(db, "lectures"), where("batchId", "==", params.id))
      );

      const lectureList = lecturesSnap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter((item: any) => item.isVisible !== false);

      setLectures(lectureList);

      await loadAccessState(params.id, user?.uid, user?.email);
    } catch (error) {
      console.error("Error loading batch:", error);
      setBatch(null);
      setSubjects([]);
      setLectures([]);
      setIsEnrolled(false);
      setIsPurchased(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatchData();
  }, [params.id, user?.uid, user?.email]);
  const goToSubjectsPage = () => {
    navigate(`/batches/${params.id}/subjects`);
  };

  const buildEnrollmentPayload = () => {
    return {
      userUid: user?.uid || "",
      userPhone: user?.phone || "",
      userEmail: user?.email || "",
      userName: user?.fullName || "",
      batchId: params.id || "",
      batchName: batch?.batchName || batch?.name || "",
      semester: batch?.semester || "",
      isActive: true,
      createdAt: Timestamp.now(),
      enrolledAt: Timestamp.now(),
    };
  };

  const handleFreeAccess = async () => {
    if (!params.id || !batch) return;

    if (!isAuthenticated || (!user?.uid && !user?.email)) {
      navigate("/login");
      return;
    }

    if (subjects.length === 0) {
      toast({
        title: "No subjects yet",
        description: "This batch has no subjects added yet.",
      });
      return;
    }

    if (isPurchased) {
      goToSubjectsPage();
      return;
    }

    if (!isEnrolled) {
      setEnrolling(true);

      try {
        const alreadyEnrolled = await checkEnrollment(
          user.uid || "",
          user.email || "",
          params.id
        );

        if (!alreadyEnrolled) {
          await addDoc(collection(db, "enrollments"), buildEnrollmentPayload());
        }

        setIsEnrolled(true);

        toast({
          title: "Enrolled successfully",
          description: "You can now access free content.",
        });
      } catch (error) {
        console.error("Enrollment error:", error);
        toast({
          title: "Enrollment failed",
          description: "Something went wrong while enrolling.",
          variant: "destructive",
        });
        return;
      } finally {
        setEnrolling(false);
      }
    }

    goToSubjectsPage();
  };

  const handleBuyPremium = async () => {
    if (!params.id || !batch) return;

    if (isPurchased) {
      goToSubjectsPage();
      return;
    }

    if (!isAuthenticated || (!user?.uid && !user?.email)) {
      navigate("/login");
      return;
    }

    try {
      const alreadyEnrolled = await checkEnrollment(
        user.uid || "",
        user.email || "",
        params.id
      );

      if (!alreadyEnrolled) {
        await addDoc(collection(db, "enrollments"), buildEnrollmentPayload());
        setIsEnrolled(true);
      }

      navigate(`/premium-checkout?batchId=${params.id}`);
    } catch (error) {
      console.error("Premium start error:", error);
      toast({
        title: "Unable to continue",
        description: "Something went wrong while starting premium purchase.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading batch...</p>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/batches">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>

        <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-accent" />

          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <Badge>Semester {batch.semester}</Badge>

                  {isPurchased && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Premium Unlocked
                    </Badge>
                  )}

                  {isEnrolled && !isPurchased && (
                    <Badge variant="outline">Enrolled</Badge>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                  {batchTitle}
                </h1>

                <p className="text-muted-foreground leading-relaxed max-w-3xl mb-6">
                  {batch.description || "No description available"}
                </p>

                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span>{subjects.length} subjects</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
                    <PlayCircle className="w-4 h-4 text-primary" />
                    <span>{lectures.length} lectures</span>
                  </div>
                </div>
              </div>

              <div className="md:min-w-[340px] rounded-2xl border bg-background p-5 shadow-sm">
                <p className="text-sm text-muted-foreground mb-2">Price</p>
                <p className="text-3xl font-bold text-primary mb-5">
                  ₹{batch.price || 0}
                </p>

                {isPurchased ? (
                  <Button
                    className="w-full py-6 text-base mb-3 bg-green-600 hover:bg-green-600 text-white shadow-md"
                    onClick={goToSubjectsPage}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Premium Unlocked
                  </Button>
                ) : (
                  <Button
                    className="w-full py-6 text-base shadow-md mb-3"
                    onClick={handleBuyPremium}
                    disabled={purchaseChecking}
                  >
                    {purchaseChecking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Buy Premium
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant={isPurchased ? "default" : "outline"}
                  className={`w-full gap-2 ${isPurchased
                    ? "py-6 text-base shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
                    : "py-5"
                    }`}
                  onClick={handleFreeAccess}
                  disabled={enrolling}
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Please wait...
                    </>
                  ) : isPurchased ? (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      Let’s Study
                    </>
                  ) : isEnrolled ? (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      Go to Batch
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Access Free Content
                    </>
                  )}
                </Button>

                {!isPurchased && (
                  <p className="text-xs text-muted-foreground mt-3 text-center leading-relaxed">
                    Unlock premium lectures, notes, PYQs, and tests for full access.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}