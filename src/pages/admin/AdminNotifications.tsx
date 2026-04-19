import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OptionItem = {
  id: string;
  label: string;
};

type TargetType = "all" | "batch" | "user";
type ContentType = "dashboard" | "batch" | "lecture" | "note" | "pyq" | "test";

function toOptionLabel(data: any, fallbackId: string) {
  return (
    data?.batchName ||
    data?.name ||
    data?.title ||
    data?.fullName ||
    data?.email ||
    data?.phone ||
    fallbackId
  );
}

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [targetType, setTargetType] = useState<TargetType>("all");
  const [targetValue, setTargetValue] = useState("");

  const [contentType, setContentType] = useState<ContentType>("dashboard");
  const [selectedEntityId, setSelectedEntityId] = useState("");

  const [batches, setBatches] = useState<OptionItem[]>([]);
  const [users, setUsers] = useState<OptionItem[]>([]);
  const [lectures, setLectures] = useState<OptionItem[]>([]);
  const [notes, setNotes] = useState<OptionItem[]>([]);
  const [pyqs, setPyqs] = useState<OptionItem[]>([]);
  const [tests, setTests] = useState<OptionItem[]>([]);

  const [loadingPage, setLoadingPage] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingPage(true);
      setErrorText("");

      try {
        const [
          batchSnap,
          userSnap,
          lectureSnap,
          noteSnap,
          pyqSnap,
          testSnap,
        ] = await Promise.allSettled([
          getDocs(collection(db, "batches")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "lectures")),
          getDocs(collection(db, "notes")),
          getDocs(collection(db, "pyqs")),
          getDocs(collection(db, "tests")),
        ]);

        if (batchSnap.status === "fulfilled") {
          setBatches(
            batchSnap.value.docs.map((d) => ({
              id: d.id,
              label: toOptionLabel(d.data(), d.id),
            }))
          );
        } else {
          console.error("Failed to load batches:", batchSnap.reason);
        }

        if (userSnap.status === "fulfilled") {
          setUsers(
            userSnap.value.docs.map((d) => ({
              id: d.id,
              label: toOptionLabel(d.data(), d.id),
            }))
          );
        } else {
          console.error("Failed to load users:", userSnap.reason);
        }

        if (lectureSnap.status === "fulfilled") {
          setLectures(
            lectureSnap.value.docs.map((d) => ({
              id: d.id,
              label: toOptionLabel(d.data(), d.id),
            }))
          );
        } else {
          console.error("Failed to load lectures:", lectureSnap.reason);
        }

        if (noteSnap.status === "fulfilled") {
          setNotes(
            noteSnap.value.docs.map((d) => ({
              id: d.id,
              label: toOptionLabel(d.data(), d.id),
            }))
          );
        } else {
          console.error("Failed to load notes:", noteSnap.reason);
        }

        if (pyqSnap.status === "fulfilled") {
          setPyqs(
            pyqSnap.value.docs.map((d) => ({
              id: d.id,
              label: toOptionLabel(d.data(), d.id),
            }))
          );
        } else {
          console.error("Failed to load pyqs:", pyqSnap.reason);
        }

        if (testSnap.status === "fulfilled") {
          setTests(
            testSnap.value.docs.map((d) => ({
              id: d.id,
              label: toOptionLabel(d.data(), d.id),
            }))
          );
        } else {
          console.error("Failed to load tests:", testSnap.reason);
        }
      } catch (err: any) {
        console.error("AdminNotifications load error:", err);
        setErrorText(err?.message || "Failed to load dropdown data.");
      } finally {
        setLoadingPage(false);
      }
    };

    loadOptions();
  }, []);

  useEffect(() => {
    setSelectedEntityId("");
  }, [contentType]);

  useEffect(() => {
    setTargetValue("");
  }, [targetType]);

  const contentOptions = useMemo(() => {
    switch (contentType) {
      case "batch":
        return batches;
      case "lecture":
        return lectures;
      case "note":
        return notes;
      case "pyq":
        return pyqs;
      case "test":
        return tests;
      default:
        return [];
    }
  }, [contentType, batches, lectures, notes, pyqs, tests]);

  const buildNavigation = () => {
    switch (contentType) {
      case "dashboard":
        return { routeType: "dashboard", routePath: "/dashboard" };
      case "batch":
        return selectedEntityId
          ? { routeType: "batch", routePath: `/batches/${selectedEntityId}` }
          : { routeType: "dashboard", routePath: "/dashboard" };
      case "lecture":
        return selectedEntityId
          ? { routeType: "lecture", routePath: `/lectures/${selectedEntityId}` }
          : { routeType: "dashboard", routePath: "/dashboard" };
      case "note":
        return { routeType: "note", routePath: "/notes" };
      case "pyq":
        return { routeType: "pyq", routePath: "/notes" };
      case "test":
        return selectedEntityId
          ? { routeType: "test", routePath: `/tests/${selectedEntityId}` }
          : { routeType: "dashboard", routePath: "/dashboard" };
      default:
        return { routeType: "dashboard", routePath: "/dashboard" };
    }
  };

  const sendNotification = async () => {
    setErrorText("");

    if (!title.trim() || !message.trim()) {
      setErrorText("Title and message are required.");
      return;
    }

    if ((targetType === "batch" || targetType === "user") && !targetValue) {
      setErrorText(`Please select a ${targetType}.`);
      return;
    }

    if (contentType !== "dashboard" && !selectedEntityId) {
      setErrorText(`Please select a ${contentType}.`);
      return;
    }

    setSending(true);

    try {
      const navigation = buildNavigation();
      const selectedUser =
        targetType === "user"
          ? users.find((u) => u.id === targetValue)
          : null;
      const payload = {
        title: title.trim(),
        message: message.trim(),

        targetType,
        targetValue: targetType === "all" ? null : targetValue,

        targetUserId: targetType === "user" ? selectedUser?.id || "" : null,
        targetUid: targetType === "user" ? selectedUser?.id || "" : null,

        userUid: targetType === "user" ? selectedUser?.id || "" : "",
        userPhone: targetType === "user" ? selectedUser?.phone || "" : "",
        userEmail: targetType === "user" ? selectedUser?.email || "" : "",

        contentType,
        entityId: contentType === "dashboard" ? null : selectedEntityId,
        routeType: navigation.routeType,
        routePath: navigation.routePath,
        isActive: true,
        createdAt: serverTimestamp(),
      };
      console.log("Sending notification payload:", payload);

      const ref = await addDoc(collection(db, "notifications"), payload);

      console.log("Notification created:", ref.id);

      setTitle("");
      setMessage("");
      setTargetType("all");
      setTargetValue("");
      setContentType("dashboard");
      setSelectedEntityId("");
      alert("✅ Notification sent successfully.");
    } catch (err: any) {
      console.error("Notification send error:", err);
      setErrorText(err?.message || "Failed to send notification.");
      alert(`❌ ${err?.message || "Error sending notification"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto p-6 space-y-6 bg-card border rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Send Notification</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send notifications to all users, a specific batch, or a specific user.
          </p>
        </div>

        {errorText ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {errorText}
          </div>
        ) : null}

        <div className="space-y-4">
          <Input
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            placeholder="Notification message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px]"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Send To</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as TargetType)}
                className="w-full h-11 rounded-xl border bg-background px-3 text-sm outline-none"
              >
                <option value="all">All Users</option>
                <option value="batch">Specific Batch</option>
                <option value="user">Specific User</option>
              </select>
            </div>

            {targetType === "batch" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Batch</label>
                <select
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full h-11 rounded-xl border bg-background px-3 text-sm outline-none"
                  disabled={loadingPage}
                >
                  <option value="">
                    {loadingPage ? "Loading batches..." : "Choose batch"}
                  </option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === "user" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select User</label>
                <select
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full h-11 rounded-xl border bg-background px-3 text-sm outline-none"
                  disabled={loadingPage}
                >
                  <option value="">
                    {loadingPage ? "Loading users..." : "Choose user"}
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Open Page Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full h-11 rounded-xl border bg-background px-3 text-sm outline-none"
              >
                <option value="dashboard">Dashboard</option>
                <option value="batch">Batch</option>
                <option value="lecture">Lecture</option>
                <option value="note">Note</option>
                <option value="pyq">PYQ</option>
                <option value="test">Test</option>
              </select>
            </div>

            {contentType !== "dashboard" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Item</label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full h-11 rounded-xl border bg-background px-3 text-sm outline-none"
                  disabled={loadingPage}
                >
                  <option value="">
                    {loadingPage ? "Loading..." : `Choose ${contentType}`}
                  </option>
                  {contentOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Button onClick={sendNotification} disabled={sending} className="w-full h-11 rounded-2xl">
            {sending ? "Sending..." : "Send Notification"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}