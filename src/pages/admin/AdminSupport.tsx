import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LifeBuoy, Loader2, Search, Send } from "lucide-react";

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

export default function AdminSupport() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyMap, setReplyMap] = useState<{ [key: string]: string }>({});
  const [search, setSearch] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "supportTickets"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTickets(list);
        setLoading(false);
      },
      (error) => {
        console.error("Support tickets load error:", error);
        setTickets([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredTickets = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return tickets;

    return tickets.filter((ticket) => {
      const haystack = [
        ticket.userEmail,
        ticket.userName,
        ticket.phone,
        ticket.subject,
        ticket.message,
        ticket.category,
        ticket.status,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(value);
    });
  }, [tickets, search]);

  const sendReply = async (ticket: any) => {
    const reply = (replyMap[ticket.id] || "").trim();
    if (!reply) {
      toast({
        title: "Reply required",
        description: "Please write a reply first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingId(ticket.id);

      await updateDoc(doc(db, "supportTickets", ticket.id), {
        reply,
        status: "resolved",
        updatedAt: serverTimestamp(),
      });

      const targetUid = ticket.userUid || ticket.uid || "";

      if (targetUid) {
        await addDoc(collection(db, "notifications"), {
          title: "Support reply received",
          message: `Your ticket "${ticket.subject || "Support Ticket"}" has a new reply from support.`,

          targetType: "user",
          targetUserId: targetUid,
          targetUid: targetUid,
          targetValue: targetUid,

          userUid: targetUid,
          userPhone: ticket.userPhone || ticket.phone || "",
          userEmail: ticket.userEmail || "",

          contentType: "support",
          entityId: ticket.id,
          routePath: "/support",
          isActive: true,
          createdAt: serverTimestamp(),
        });
      }

      setReplyMap((prev) => ({ ...prev, [ticket.id]: "" }));

      toast({
        title: "Reply sent",
        description: "Student has been notified.",
      });
    } catch (error) {
      console.error("Send reply error:", error);
      toast({
        title: "Error",
        description: "Failed to send reply.",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  const markOpen = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, "supportTickets", ticketId), {
        status: "open",
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Ticket reopened",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to reopen ticket.",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout title="Support Tickets">
      <div className="space-y-5">
        <Card className="rounded-3xl">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  View, reply, and resolve student support requests.
                </p>
              </div>

              <div className="relative w-full md:w-[320px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 rounded-xl"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-3xl">
                <CardContent className="p-6 text-muted-foreground">Loading tickets...</CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card className="rounded-3xl">
            <CardContent className="p-10 text-center">
              <LifeBuoy className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium">No tickets found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Support requests will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => {
            const isResolved = (ticket.status || "").toLowerCase() === "resolved";

            return (
              <Card key={ticket.id} className="rounded-3xl">
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-base">
                          {ticket.subject || "Support Ticket"}
                        </p>

                        <Badge variant={isResolved ? "secondary" : "default"}>
                          {isResolved ? "Resolved" : "Open"}
                        </Badge>

                        {ticket.category ? (
                          <Badge variant="outline">{ticket.category}</Badge>
                        ) : null}
                      </div>

                      <p className="text-sm text-muted-foreground mt-1">
                        {ticket.userName || "Unknown User"} • {ticket.userEmail || "No email"}
                      </p>

                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(ticket.createdAt)}
                      </p>
                    </div>

                    {isResolved ? (
                      <Button variant="outline" onClick={() => markOpen(ticket.id)}>
                        Reopen
                      </Button>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-muted/40 p-4">
                    <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                  </div>

                  {ticket.reply ? (
                    <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
                        Current Reply
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{ticket.reply}</p>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <Textarea
                      className="rounded-2xl"
                      placeholder="Type reply for the student..."
                      value={replyMap[ticket.id] || ""}
                      onChange={(e) =>
                        setReplyMap((prev) => ({
                          ...prev,
                          [ticket.id]: e.target.value,
                        }))
                      }
                      rows={4}
                    />

                    <div className="flex justify-end">
                      <Button
                        className="gap-2"
                        onClick={() => sendReply(ticket)}
                        disabled={sendingId === ticket.id}
                      >
                        {sendingId === ticket.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Send Reply & Notify
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}