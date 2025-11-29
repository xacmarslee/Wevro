import { ReactNode } from "react";
import LogoText from "@/components/LogoText";
import TokenDisplay from "@/components/TokenDisplay";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  showLogo?: boolean;
  showTokens?: boolean;
  className?: string;
  rightContent?: ReactNode;
}

export default function Header({ 
  title, 
  showLogo = true, 
  showTokens = true,
  className,
  rightContent
}: HeaderProps) {
  return (
    <div className={cn(
      "sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/50 safe-area-top",
      className
    )}>
      <div className="px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showLogo && (
            <>
              <LogoText className="text-xl sm:text-2xl font-bold text-primary shrink-0" />
              <div className="h-6 w-px bg-border shrink-0" />
            </>
          )}
          <h2 className="text-xl sm:text-2xl font-semibold whitespace-nowrap truncate">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {showTokens && <TokenDisplay variant="header" />}
          {rightContent}
        </div>
      </div>
    </div>
  );
}

