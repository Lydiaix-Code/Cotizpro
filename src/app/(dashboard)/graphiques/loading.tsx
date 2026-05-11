import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GraphiquesLoading() {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Graphique CA mensuel */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-md" />
        </CardContent>
      </Card>

      {/* Graphique progression plafond */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full rounded-md" />
        </CardContent>
      </Card>

      {/* Graphique répartition */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-60" />
        </CardHeader>
        <CardContent className="flex justify-center">
          <Skeleton className="h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    </div>
  );
}
