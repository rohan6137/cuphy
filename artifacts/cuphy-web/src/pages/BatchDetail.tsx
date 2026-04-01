import { useParams, Link } from "wouter";
import { useGetBatchById, getGetBatchByIdQueryKey, useListLectures, useListNotes, useListTests } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  PlayCircle, FileText, ClipboardList, Users, ExternalLink,
  Clock, Lock, BookOpen, ArrowLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function BatchDetail() {
  const params = useParams<{ id: string }>();
  const batchId = parseInt(params.id);
  const { isAuthenticated } = useAuth();

  const { data: batch, isLoading } = useGetBatchById(batchId, {
    query: { enabled: !!batchId, queryKey: getGetBatchByIdQueryKey(batchId) }
  });

  const { data: lecturesData } = useListLectures({ batchId });
  const { data: notesData } = useListNotes({ batchId });
  const { data: testsData } = useListTests({ batchId });

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!batch) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground">Batch not found</p>
          <Link href="/batches"><Button className="mt-4">Back to Batches</Button></Link>
        </div>
      </Layout>
    );
  }

  const lectures = lecturesData?.lectures ?? [];
  const notes = notesData?.notes ?? [];
  const tests = testsData?.tests ?? [];

  const subjectMap: Record<number, { name: string; lectures: typeof lectures; notes: typeof notes }> = {};
  if ((batch as any).subjects) {
    for (const s of (batch as any).subjects) {
      subjectMap[s.id] = { name: s.name, lectures: [], notes: [] };
    }
  }
  for (const l of lectures) {
    if (subjectMap[l.subjectId]) subjectMap[l.subjectId].lectures.push(l);
  }
  for (const n of notes) {
    if (subjectMap[n.subjectId]) subjectMap[n.subjectId].notes.push(n);
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/batches">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Batches
          </Button>
        </Link>

        {/* Batch header */}
        <div className="bg-gradient-to-r from-secondary to-primary/40 rounded-2xl p-6 md:p-8 text-white mb-8">
          <Badge className="bg-white/20 text-white border-white/30 mb-3">Semester {batch.semester}</Badge>
          <h1 className="text-2xl md:text-3xl font-bold font-serif mb-2">{batch.name}</h1>
          <p className="text-white/70 mb-5">{batch.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-white/70 mb-6">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {batch.studentsCount} students</span>
            <span className="flex items-center gap-1.5"><PlayCircle className="w-4 h-4" /> {(batch as any).totalLectures ?? 0} lectures</span>
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {(batch as any).totalNotes ?? 0} notes</span>
            <span className="flex items-center gap-1.5"><ClipboardList className="w-4 h-4" /> {(batch as any).totalTests ?? 0} tests</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">₹{batch.price}</span>
              {batch.originalPrice && (
                <span className="text-white/50 line-through">₹{batch.originalPrice}</span>
              )}
            </div>
            {batch.paymentLink && (
              <a href={isAuthenticated ? batch.paymentLink : "/login"} target={isAuthenticated ? "_blank" : "_self"} rel="noopener noreferrer">
                <Button className="bg-white text-secondary hover:bg-white/90 gap-2">
                  <ExternalLink className="w-4 h-4" /> Subscribe Now
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="subjects">
          <TabsList className="mb-6 w-full md:w-auto">
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="lectures">All Lectures ({lectures.length})</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
            <TabsTrigger value="tests">Tests ({tests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects">
            {Object.keys(subjectMap).length > 0 ? (
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(subjectMap).map(([sid, s]) => (
                  <AccordionItem key={sid} value={sid} className="border rounded-xl px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.lectures.length} lectures • {s.notes.length} notes</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {s.lectures.map(l => (
                          <Link key={l.id} href={`/lectures/${l.id}`}>
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${l.isFree ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                                {l.isFree ? <PlayCircle className="w-4 h-4" /> : <Lock className="w-3 h-3" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{l.title}</p>
                                {l.duration && <p className="text-xs text-muted-foreground">{l.duration}</p>}
                              </div>
                              {l.isFree && <Badge variant="secondary" className="text-xs text-green-700">Free</Badge>}
                            </div>
                          </Link>
                        ))}
                        {s.notes.map(n => (
                          <a key={n.id} href={n.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{n.title}</p>
                                {n.category && <p className="text-xs text-muted-foreground">{n.category}</p>}
                              </div>
                              <Badge variant="secondary" className="text-xs">PDF</Badge>
                            </div>
                          </a>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-muted-foreground text-center py-8">No subjects added yet</p>
            )}
          </TabsContent>

          <TabsContent value="lectures">
            <div className="space-y-3">
              {lectures.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No lectures yet</p>
              ) : lectures.map(l => (
                <Link key={l.id} href={`/lectures/${l.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <img
                        src={`https://img.youtube.com/vi/${l.youtubeVideoId}/mqdefault.jpg`}
                        alt={l.title}
                        className="w-24 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-snug">{l.title}</p>
                        {l.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{l.description}</p>}
                        {l.duration && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {l.duration}
                          </p>
                        )}
                      </div>
                      {l.isFree ? (
                        <Badge variant="secondary" className="text-green-700 shrink-0">Free</Badge>
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 col-span-2">No notes yet</p>
              ) : notes.map(n => (
                <Card key={n.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{n.title}</p>
                        {n.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.description}</p>}
                        {n.category && <Badge variant="secondary" className="text-xs mt-2">{n.category}</Badge>}
                      </div>
                    </div>
                    <a href={n.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="mt-3 w-full gap-2">
                        <ExternalLink className="w-3.5 h-3.5" /> View PDF
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tests">
            <div className="space-y-3">
              {tests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No tests yet</p>
              ) : tests.map(t => (
                <Card key={t.id} className="border-border">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{t.title}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.durationMinutes} min</span>
                        <span>{t.questionsCount} questions</span>
                        <span>{t.totalMarks} marks</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={t.type === "quiz" ? "secondary" : "default"} className="capitalize">{t.type}</Badge>
                      <Link href={`/tests/${t.id}`}>
                        <Button size="sm" variant="outline">Attempt</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
