import { useState } from "react";
import { Link } from "wouter";
import { useListBatches } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Users, BookOpen, ExternalLink, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Batches() {
  const [semester, setSemester] = useState<string>("all");
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useListBatches({
    isActive: true,
    ...(semester !== "all" ? { semester: parseInt(semester) } : {}),
  });

  const batches = data?.batches ?? [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif">All Batches</h1>
            <p className="text-muted-foreground mt-1">Choose your semester and start learning today</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="w-40" data-testid="select-semester">
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {[1, 2, 3, 4, 5, 6].map(s => (
                  <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No batches found for this semester</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map(batch => (
              <Card
                key={batch.id}
                data-testid={`card-batch-${batch.id}`}
                className="group hover:shadow-xl transition-all duration-300 border-border overflow-hidden"
              >
                <div className="h-3 bg-gradient-to-r from-primary via-primary/80 to-accent-foreground" />
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-xs font-semibold">
                      Sem {batch.semester}
                    </Badge>
                    {batch.originalPrice && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                        {Math.round(((batch.originalPrice - batch.price) / batch.originalPrice) * 100)}% OFF
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-lg leading-tight">{batch.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{batch.description}</p>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                    <Users className="w-3 h-3" />
                    <span>{batch.studentsCount} students enrolled</span>
                  </div>

                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-3xl font-bold text-primary">₹{batch.price}</span>
                    {batch.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through mb-1">₹{batch.originalPrice}</span>
                    )}
                  </div>

                  {batch.expiresAt && (
                    <p className="text-xs text-amber-600 mb-3">
                      Expires: {new Date(batch.expiresAt).toLocaleDateString("en-IN")}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/batches/${batch.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <BookOpen className="w-3.5 h-3.5" /> Details
                      </Button>
                    </Link>
                    {batch.paymentLink ? (
                      <a href={isAuthenticated ? batch.paymentLink : "/login"} target={isAuthenticated ? "_blank" : "_self"} rel="noopener noreferrer" className="flex-1">
                        <Button size="sm" className="w-full bg-primary hover:bg-primary/90 gap-2">
                          <ExternalLink className="w-3.5 h-3.5" /> Subscribe
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" variant="secondary" className="flex-1 gap-2" disabled>
                        <Lock className="w-3.5 h-3.5" /> Contact
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
