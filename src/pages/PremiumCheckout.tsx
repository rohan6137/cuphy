import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { startRazorpayPayment } from "@/lib/razorpay";

const CREATE_ORDER_URL =
  "https://asia-south1-cuphy-d68ca.cloudfunctions.net/createRazorpayOrder";

const VERIFY_PAYMENT_URL =
  "https://asia-south1-cuphy-d68ca.cloudfunctions.net/verifyRazorpayPayment";

export default function PremiumCheckout() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const batchId = searchParams.get("batchId");

  useEffect(() => {
    const loadBatch = async () => {
      if (!batchId) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "batches", batchId));
        if (snap.exists()) {
          setBatch({ id: snap.id, ...snap.data() });
        } else {
          setBatch(null);
        }
      } catch (error) {
        console.error("Checkout load error:", error);
        setBatch(null);
      } finally {
        setLoading(false);
      }
    };

    loadBatch();
  }, [batchId]);

  const handlePayNow = async () => {
    if (!isAuthenticated || !user?.email || !batch) {
      navigate("/login");
      return;
    }

    try {
      setProcessing(true);

      await startRazorpayPayment({
        createOrderUrl: CREATE_ORDER_URL,
        verifyPaymentUrl: VERIFY_PAYMENT_URL,
        batch,
        user,
        onSuccess: () => {
          toast({
            title: "Payment successful",
            description: "Premium access unlocked successfully.",
          });
          navigate(`/batches/${batch.id}`);
        },
      });
    } catch (error: any) {
      console.error("Razorpay checkout error:", error);
      toast({
        title: "Payment failed",
        description: error?.message || "Unable to complete premium purchase.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </Layout>
    );
  }

  if (!batch) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <h2 className="text-2xl font-bold mb-2">Batch not found</h2>
          <p className="text-muted-foreground mb-6">
            Unable to load checkout for this batch.
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
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href={`/batches/${batch.id}`}>
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Batch
          </Button>
        </Link>

        <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-accent" />

          <div className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
              <div className="flex-1">
                <Badge className="mb-4">Premium Checkout</Badge>

                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {batchTitle}
                </h1>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  Unlock full premium access to lectures, notes, PYQs, tests, and all advanced study materials for this batch.
                </p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Premium lectures unlocked</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Premium notes & PYQs unlocked</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Premium tests unlocked</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    <span>Secure Razorpay checkout</span>
                  </div>
                </div>
              </div>

              <div className="md:min-w-[320px] rounded-2xl border bg-background p-6 shadow-sm">
                <p className="text-sm text-muted-foreground mb-2">Total</p>
                <p className="text-4xl font-bold text-primary mb-6">
                  ₹{batch.price || 0}
                </p>

                <Button
                  className="w-full py-6 text-base shadow-md"
                  onClick={handlePayNow}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Pay with Razorpay
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}