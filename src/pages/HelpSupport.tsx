import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  LifeBuoy,
  MessageCircle,
  Mail,
  Send,
  Loader2,
  Headphones,
  ShieldCheck,
  Clock3,
  Ticket,
  ChevronDown,
  ChevronUp,
  MessageSquareReply,
} from "lucide-react";

const categories = [
  "Payment Issue",
  "Login Issue",
  "Lecture Problem",
  "Notes / PDF Issue",
  "Test / Quiz Issue",
  "Batch Access Issue",
  "Other",
];

function formatDate(value: any) {
  try {
    if (!value) return "";
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

export default function HelpSupport() {
  const { user, isAuthenticated } = useAuth();
  const { settings } = useAppSettings();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [openTicketIds, setOpenTicketIds] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    category: "Payment Issue",
    subject: "",
    message: "",
  });

  useEffect(() => {
    if (!user?.uid) {
      setTickets([]);
      return;
    }

    const unsubscribers: Array<() => void> = [];
    const ticketMap = new Map<string, any>();

    const applySortedTickets = () => {
      const list = Array.from(ticketMap.values());

      list.sort((a: any, b: any) => {
        const aTime =
          typeof a.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : 0;
        const bTime =
          typeof b.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      setTickets(list);
    };

    const qByUserUid = query(
      collection(db, "supportTickets"),
      where("userUid", "==", user.uid)
    );

    const qByLegacyUid = query(
      collection(db, "supportTickets"),
      where("uid", "==", user.uid)
    );

    unsubscribers.push(
      onSnapshot(
        qByUserUid,
        (snap) => {
          snap.docs.forEach((d) => {
            ticketMap.set(d.id, {
              id: d.id,
              ...d.data(),
            });
          });
          applySortedTickets();
        },
        (error) => {
          console.error("Failed to load support tickets by userUid:", error);
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        qByLegacyUid,
        (snap) => {
          snap.docs.forEach((d) => {
            ticketMap.set(d.id, {
              id: d.id,
              ...d.data(),
            });
          });
          applySortedTickets();
        },
        (error) => {
          console.error("Failed to load support tickets by uid:", error);
        }
      )
    );

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [user?.uid]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: user?.fullName || prev.name || "",
      email: user?.email || prev.email || "",
      phone: user?.phone || prev.phone || "",
    }));
  }, [user?.fullName, user?.email, user?.phone]);

  useEffect(() => {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#ticket-")) return;

    const ticketId = hash.replace("#ticket-", "").trim();
    if (!ticketId) return;

    setOpenTicketIds((prev) => ({
      ...prev,
      [ticketId]: true,
    }));

    setTimeout(() => {
      const el = document.getElementById(`ticket-${ticketId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 300);
  }, [tickets]);

  const whatsappLink = useMemo(() => {
    const raw = String((settings as any)?.supportWhatsappNumber || "").replace(/\D/g, "");
    if (!raw) return "";
    return `https://wa.me/${raw}`;
  }, [settings]);

  const emailLink = useMemo(() => {
    const email = (settings as any)?.supportEmail || "";
    if (!email) return "";
    return `mailto:${email}`;
  }, [settings]);

  const openTicketsCount = useMemo(() => {
    return tickets.filter((t) => (t.status || "open") !== "resolved").length;
  }, [tickets]);

  const resolvedTicketsCount = useMemo(() => {
    return tickets.filter((t) => (t.status || "") === "resolved").length;
  }, [tickets]);

  const handleSubmit = async () => {
    if (!(settings as any)?.supportEnabled) {
      toast({
        title: "Support unavailable",
        description: "Support is currently disabled.",
        variant: "destructive",
      });
      return;
    }

    if (!(settings as any)?.supportTicketEnabled) {
      toast({
        title: "Ticket system disabled",
        description: "Please use WhatsApp or email support.",
      });
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast({
        title: "Incomplete form",
        description: "Please fill name, email, subject, and message.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(collection(db, "supportTickets"), {
        userUid: user?.uid || "",
        userPhone: user?.phone || "",
        userEmail: form.email.trim(),
        userName: form.name.trim(),

        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),

        status: "open",
        reply: "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        source: "web",
        isAuthenticated: !!isAuthenticated,
      });

      toast({
        title: "Ticket submitted",
        description: "Our support team will review your issue soon.",
      });

      setForm((prev) => ({
        ...prev,
        subject: "",
        message: "",
      }));
    } catch (error) {
      console.error("Support ticket submit error:", error);
      toast({
        title: "Submission failed",
        description: "Could not submit your ticket.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTicket = (ticketId: string) => {
    setOpenTicketIds((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  if (!(settings as any)?.supportEnabled) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <LifeBuoy className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold">Support Unavailable</h1>
              <p className="mt-2 text-muted-foreground">
                Help & Support is currently disabled by admin.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative p-6 md:p-8 lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Headphones className="h-3.5 w-3.5" />
                  Student Help Desk
                </div>

                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Help & Support
                </h1>

                <p className="mt-3 text-sm md:text-base text-muted-foreground leading-7">
                  Get fast help for payment issues, login problems, batch access, notes,
                  lectures, and tests. For urgent issues use WhatsApp, and for detailed
                  problems submit a support ticket.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-2xl border bg-background/80 px-4 py-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Secure support records
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border bg-background/80 px-4 py-2 text-sm">
                    <Clock3 className="h-4 w-4 text-primary" />
                    Track ticket status
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border bg-background/80 px-4 py-2 text-sm">
                    <Ticket className="h-4 w-4 text-primary" />
                    View admin replies
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:w-[360px]">
                <Card className="rounded-3xl border-border/60 shadow-none">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{tickets.length}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Total Tickets</p>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-border/60 shadow-none">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{openTicketsCount}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Open</p>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-border/60 shadow-none">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{resolvedTicketsCount}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Resolved</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card className="rounded-[28px] border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Send className="w-5 h-5 text-primary" />
                  Submit Support Ticket
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      className="h-11 rounded-xl"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      className="h-11 rounded-xl"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com"
                      type="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      className="h-11 rounded-xl"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+919800000000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none"
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input
                    className="h-11 rounded-xl"
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    placeholder="Short title for your issue"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <Textarea
                    className="min-h-[140px] rounded-2xl"
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Describe your issue clearly with all important details"
                    rows={6}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Your ticket will appear below after submission.
                  </p>

                  <Button
                    className="gap-2 rounded-xl h-11 px-6"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <LifeBuoy className="w-5 h-5 text-primary" />
                  My Tickets
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {tickets.length === 0 ? (
                  <div className="rounded-3xl border border-dashed p-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Ticket className="h-6 w-6" />
                    </div>
                    <p className="font-medium">No tickets yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Once you submit a support ticket, it will appear here with status and admin reply.
                    </p>
                  </div>
                ) : (
                  tickets.map((t) => {
                    const isResolved = (t.status || "").toLowerCase() === "resolved";
                    const isOpen = !!openTicketIds[t.id];

                    return (
                      <div
                        key={t.id}
                        id={`ticket-${t.id}`}
                        className="rounded-2xl border border-border/60 bg-card shadow-sm scroll-mt-24 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTicket(t.id)}
                          className="w-full px-4 py-4 text-left hover:bg-muted/30 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-sm md:text-base truncate">
                                  {t.subject || "Support Ticket"}
                                </p>

                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${isResolved
                                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    }`}
                                >
                                  {isResolved ? "Resolved" : "Open"}
                                </span>

                                {t.reply ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                                    <MessageSquareReply className="h-3 w-3" />
                                    Reply Available
                                  </span>
                                ) : null}
                              </div>

                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(t.createdAt)}
                              </p>
                            </div>

                            <div className="shrink-0 pt-1 text-muted-foreground">
                              {isOpen ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t px-4 pb-4 pt-4 bg-muted/20 space-y-4">
                            {t.category ? (
                              <div className="text-xs">
                                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                                  {t.category}
                                </span>
                              </div>
                            ) : null}

                            <div className="rounded-2xl bg-background p-4 border">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">
                                Your Message
                              </p>
                              <p className="text-sm leading-6 whitespace-pre-wrap">
                                {t.message}
                              </p>
                            </div>

                            {t.reply ? (
                              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
                                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">
                                  Admin Reply
                                </p>
                                <p className="text-sm leading-6 whitespace-pre-wrap text-foreground/90">
                                  {t.reply}
                                </p>
                                {t.updatedAt ? (
                                  <p className="mt-2 text-[11px] text-muted-foreground">
                                    Updated {formatDate(t.updatedAt)}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground bg-background">
                                No reply yet. Our support team will update this ticket soon.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[28px] border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  WhatsApp Support
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-6">
                  Best for urgent issues like payment, login, or instant access problems.
                </p>

                <Button
                  className="w-full h-11 rounded-xl"
                  disabled={!whatsappLink}
                  onClick={() => {
                    if (whatsappLink) {
                      window.open(whatsappLink, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  {(settings as any)?.supportWhatsappLabel || "Chat on WhatsApp"}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="w-5 h-5 text-primary" />
                  Email Support
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-6">
                  Best for detailed issues, attachments, screenshots, and long explanations.
                </p>

                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  disabled={!emailLink}
                  onClick={() => {
                    if (emailLink) window.location.href = emailLink;
                  }}
                >
                  {(settings as any)?.supportEmailLabel || "Email Support"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}