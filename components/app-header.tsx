import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { CompanySwitcher } from "@/components/company-switcher";
import { RoleBadge } from "@/components/role-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { APP_NAME, roleHomePath } from "@/lib/constants";
import type { SessionProfile } from "@/types";

function initials(profile: SessionProfile): string {
  const source = profile.fullName?.trim() || profile.email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function AppHeader({ profile }: { profile: SessionProfile }) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={roleHomePath(profile.role)}
          className="flex items-center gap-2 font-semibold"
        >
          <ShieldCheck className="text-primary size-5" />
          <span className="hidden sm:inline">{APP_NAME}</span>
        </Link>

        <div className="flex items-center gap-2">
          <CompanySwitcher
            memberships={profile.memberships}
            activeCompanyId={profile.companyId}
          />

          <div className="hidden items-center gap-2 lg:flex">
            <Avatar className="size-8">
              {profile.avatarUrl ? (
                <AvatarImage
                  src={profile.avatarUrl}
                  alt={profile.fullName ?? profile.email}
                />
              ) : null}
              <AvatarFallback>{initials(profile)}</AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <p className="max-w-52 truncate text-sm font-medium">
                {profile.fullName ?? profile.email}
              </p>
              <p className="text-muted-foreground max-w-52 truncate text-xs">
                {profile.companyName ?? "Sin empresa asignada"}
              </p>
            </div>
          </div>

          <RoleBadge role={profile.role} />
          <Link
            href="/invitations"
            className="text-muted-foreground hover:text-foreground hidden text-xs font-medium sm:inline"
          >
            Invitaciones
          </Link>
          {profile.isPlatformAdmin ? (
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground hidden text-xs font-medium sm:inline"
            >
              Admin
            </Link>
          ) : null}
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
