import { useState } from "react";
import { useListNotes, useListBatches, useGetMyBatches, getGetMyBatchesQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ExternalLink, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Notes() {
  const [batchId, setBatchId] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const { isAuthenticated } = useAuth();

  const { data: myBatchesData } = useGetMyBatches({ query: { queryKey: getGetMyBatchesQueryKey() } });
  const myBatches = myBatchesData?.batches ?? [];

  const { data, isLoading } = useListNotes({
    ...(batchId !== "all" ? { batchId: parseInt(batchId) } : {}),
    ...(category !== "all" ? { category } : {}),
  });

  const notes = data?.notes ?? [];

  const categories = [...new Set(notes.map(n => n.category).filter(Boolean))];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif">Study Notes</h1>
            <p className="text-muted-foreground mt-1">PDF notes, PYQs, and study materials</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger className="w-44" data-testid="select-batch-notes">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {myBatches.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Notes">Notes</SelectItem>
                <SelectItem value="PYQ">PYQ</SelectItem>
                <SelectItem value="Assignment">Assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notes available</p>
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground mt-2">Sign in and enroll in a batch to access notes</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(note => (
              <Card key={note.id} data-testid={`card-note-${note.id}`} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-snug">{note.title}</p>
                      {note.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {note.category && (
                        <Badge variant="secondary" className="text-xs">{note.category}</Badge>
                      )}
                      {note.isFree && (
                        <Badge className="text-xs bg-green-100 text-green-700">Free</Badge>
                      )}
                    </div>
                    <a href={note.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5" data-testid={`button-view-note-${note.id}`}>
                        <ExternalLink className="w-3.5 h-3.5" /> View PDF
                      </Button>
                    </a>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(note.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
