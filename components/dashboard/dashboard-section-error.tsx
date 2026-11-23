import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type DashboardSectionErrorProps = {
  title: string;
  message: string;
};

export function DashboardSectionError({
  title,
  message,
}: DashboardSectionErrorProps) {
  return (
    <Alert
      variant="destructive"
      className="border-destructive/20 bg-destructive/5 text-foreground dark:bg-destructive/10"
    >
      <TriangleAlert className="text-destructive" aria-hidden="true" />
      <AlertTitle className="text-foreground">{title}</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {message}
      </AlertDescription>
    </Alert>
  );
}
