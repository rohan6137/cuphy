import { useParams, Link } from "wouter";
import { useGetLectureById, getGetLectureByIdQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, BookOpen } from "lucide-react";

export default function LectureDetail() {
  const params = useParams<{ id: string }>();
  const lectureId = parseInt(params.id);

  const { data: lecture, isLoading } = useGetLectureById(lectureId, {
    query: { enabled: !!lectureId, queryKey: getGetLectureByIdQueryKey(lectureId) }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Layout>
    );
  }

  if (!lecture) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground">Lecture not found</p>
          <Link href="/batches"><Button className="mt-4">Back to Batches</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href={`/batches/${lecture.batchId}`}>
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Batch
          </Button>
        </Link>

        {/* YouTube Video Player */}
        <div className="aspect-video w-full rounded-xl overflow-hidden shadow-xl mb-6 bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${lecture.youtubeVideoId}?rel=0&modestbranding=1`}
            title={lecture.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            data-testid="iframe-lecture-player"
          />
        </div>

        {/* Lecture Info */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="secondary" className="capitalize">
              {lecture.isFree ? "Free" : "Premium"}
            </Badge>
            {lecture.duration && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {lecture.duration}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold font-serif mb-3">{lecture.title}</h1>

          {lecture.description && (
            <p className="text-muted-foreground leading-relaxed mb-4">{lecture.description}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Added on {new Date(lecture.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>
    </Layout>
  );
}
