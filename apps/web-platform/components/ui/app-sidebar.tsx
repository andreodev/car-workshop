"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { clearBrowserSession } from "@/app/lib/browser-session";
import { menuGroups } from "../data/sidebar";


function getInitials(name?: string | null, email?: string | null) {
    const source = (name || email || "").trim();

    if (!source) {
        return "??";
    }

    const parts = source.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

    return initials || source.slice(0, 2).toUpperCase();
}

type AppSidebarProps = {
    logoUrl?: string | null;
    brandName?: string | null;
};

export function AppSidebar({ logoUrl, brandName }: AppSidebarProps) {
    const pathname = usePathname();
    const { data: session } = useAuthSession();
    const user = session?.user;
    const resolvedBrandName = brandName ?? "Rikinho Auto Center";
    const displayName = user?.name ?? "Usuario";
    const displayEmail = user?.email ?? "sem-email";
    const initials = getInitials(user?.name, user?.email);

    return (
        <>
            <SidebarTrigger
                className="no-print fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg md:hidden"
            />
            <Sidebar
                collapsible="icon"
                className={cn(
                    "text-sidebar-foreground",
                    "[&_[data-slot=sidebar-inner]]:border",
                    "[&_[data-slot=sidebar-inner]]:border-sidebar-primary/45",
                    "[&_[data-slot=sidebar-inner]]:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_22px_60px_-35px_rgba(0,0,0,0.9),0_0_0_1px_color-mix(in_oklab,var(--sidebar-primary)_18%,transparent)]",
                    "[&_[data-slot=sidebar-inner]]:backdrop-blur-xl"
                )}
            >
                <SidebarHeader className="relative flex items-center justify-center px-6 pt-6 pb-4">
                    <SidebarTrigger
                        className="absolute right-[-18px] top-12 z-50 hidden h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 md:flex"
                    />
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <Image
                            src={logoUrl}
                            alt={resolvedBrandName}
                            className="h-16 w-auto object-contain drop-shadow-sm transition-all duration-300 group-data-[collapsible=icon]:hidden"
                        />
                    ) : (
                        <Image
                            src="/assets/logo.png"
                            alt={resolvedBrandName}
                            width={120}
                            height={72}
                            className="h-16 w-auto object-contain drop-shadow-sm transition-all duration-300 group-data-[collapsible=icon]:hidden"
                            priority
                        />
                    )}
                </SidebarHeader>

                <SidebarContent className="px-3 pb-6">
                    {menuGroups.map((group) => (
                        <SidebarGroup key={group.title}>
                            <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                                {group.title}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="gap-2 group-data-[collapsible=icon]:items-center">
                                    {group.items.map((item) => (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                size="lg"
                                                isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                                                className="rounded-2xl border border-transparent bg-transparent px-3 text-sm font-medium text-sidebar-foreground/90 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.8)] transition-colors duration-300 hover:border-sidebar-accent/35 hover:bg-sidebar-accent/12 data-[active=true]:border-sidebar-accent data-[active=true]:bg-sidebar-accent/24 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_30px_-22px_var(--sidebar-accent)]"
                                            >
                                                <Link
  href={item.href}
  className="flex items-center gap-2"
>
                                                    <item.icon />
                                                    <span className="group-data-[collapsible=icon]:hidden">
                                                        {item.title}
                                                    </span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                </SidebarContent>
                <SidebarSeparator className="mx-4 bg-sidebar-border" />
                <SidebarFooter className="px-4 pb-4 pt-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-sidebar-accent/35 bg-sidebar-accent/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-sidebar-accent/45 bg-sidebar-accent/22 text-xs font-semibold text-sidebar-accent-foreground">
                            {user?.image ? (
                                <Image
                                    src={user.image}
                                    alt={displayName}
                                    width={44}
                                    height={44}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                initials
                            )}
                        </div>
                        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
                            <p className="truncate text-xs text-sidebar-foreground/60">{displayEmail}</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => {
                            clearBrowserSession();
                            void signOut({ callbackUrl: "/login" });
                        }}
                        className="mt-3 w-full border-sidebar-accent/35 bg-sidebar-accent/12 text-sidebar-accent-foreground hover:bg-sidebar-accent/22 hover:text-sidebar-accent-foreground"
                    >
                        Sair
                    </Button>
                </SidebarFooter>
            </Sidebar>
        </>
    );
}
