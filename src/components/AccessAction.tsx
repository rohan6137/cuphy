import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Download,
  ClipboardList,
  PlayCircle,
  FileText,
} from "lucide-react";

interface AccessActionProps {
  isAuthenticated: boolean;
  isPremium?: boolean;
  hasAccess?: boolean;
  batchIsActive?: boolean;
  expiryDate?: any;
  href?: string;
  fileUrl?: string;
  mode?: "file" | "test" | "lecture";
  openLabel?: string;
  unlockHref?: string;
}

export default function AccessAction({
  isAuthenticated,
  isPremium = false,
  hasAccess = false,
  batchIsActive = true,
  expiryDate,
  href,
  fileUrl,
  mode = "file",
  openLabel,
  unlockHref,
}: AccessActionProps) {
  const now = new Date();

  let isExpired = false;

  if (expiryDate?.toDate) {
    isExpired = expiryDate.toDate() < now;
  } else if (expiryDate) {
    const parsed = new Date(expiryDate);
    isExpired = !isNaN(parsed.getTime()) && parsed < now;
  }

  const isFileMode = mode === "file";
  const resolvedUnlockHref = unlockHref || href || "/batches";

  const getOpenIcon = () => {
    if (mode === "lecture") {
      return <PlayCircle className="w-4 h-4" />;
    }

    if (mode === "test") {
      return <ClipboardList className="w-4 h-4" />;
    }

    if ((openLabel || "").toLowerCase().includes("watch")) {
      return <PlayCircle className="w-4 h-4" />;
    }

    if ((openLabel || "").toLowerCase().includes("test")) {
      return <ClipboardList className="w-4 h-4" />;
    }

    if (isFileMode) {
      return <Download className="w-4 h-4" />;
    }

    return <FileText className="w-4 h-4" />;
  };

  const DisabledButton = ({ label }: { label: string }) => (
    <Button
      variant="outline"
      disabled
      className="gap-2 rounded-xl border-muted-foreground/20 bg-muted/40 text-muted-foreground shadow-sm"
    >
      <Lock className="w-4 h-4" />
      {label}
    </Button>
  );

  const PremiumCTAButton = ({ label }: { label: string }) => (
    <Button className="gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:bg-primary/90 transition-all">
      {getOpenIcon()}
      {label}
    </Button>
  );

  const FreeCTAButton = ({ label }: { label: string }) => (
    <Button className="gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:bg-primary/90 transition-all">
      {getOpenIcon()}
      {label}
    </Button>
  );

  const MutedUnlockButton = ({ label }: { label: string }) => (
    <Button
      variant="outline"
      className="gap-2 rounded-xl border-muted-foreground/20 bg-muted/40 text-muted-foreground shadow-sm hover:bg-muted/70 transition-all"
    >
      <Lock className="w-4 h-4" />
      {label}
    </Button>
  );

  const renderOpenAction = (label: string, premiumStyle: boolean) => {
    if (isFileMode) {
      return fileUrl ? (
        <a href={fileUrl} target="_blank" rel="noreferrer">
          {premiumStyle ? (
            <PremiumCTAButton label={label} />
          ) : (
            <FreeCTAButton label={label} />
          )}
        </a>
      ) : (
        <DisabledButton label="No File" />
      );
    }

    return href ? (
      <Link href={href}>
        {premiumStyle ? (
          <PremiumCTAButton label={label} />
        ) : (
          <FreeCTAButton label={label} />
        )}
      </Link>
    ) : (
      <DisabledButton label="Unavailable" />
    );
  };

  // 1. FREE CONTENT
  if (!isPremium) {
    return renderOpenAction(openLabel || "Open", false);
  }

  // 2. NOT LOGGED IN
  if (!isAuthenticated) {
    return (
      <Link href="/login">
        <MutedUnlockButton label="Login to Unlock" />
      </Link>
    );
  }

  // 3. BATCH INACTIVE
  if (!batchIsActive) {
    return <DisabledButton label="Batch Inactive" />;
  }

  // 4. EXPIRED SUBSCRIPTION
  if (isExpired) {
    return <DisabledButton label="Subscription Expired" />;
  }

  // 5. NO ACCESS → should be clickable
  if (!hasAccess) {
    return (
      <Link href={resolvedUnlockHref}>
        <MutedUnlockButton label="Unlock" />
      </Link>
    );
  }

  // 6. PREMIUM + ALLOWED
  return renderOpenAction(openLabel || "Open", true);
}