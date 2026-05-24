"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { menuItems } from "../data/sidebar";

const MotionLink = motion.create(Link);

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <>
            <SidebarTrigger
                className="no-print fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg md:hidden"
                title="Abrir menu"
                aria-label="Abrir menu"
            />
            <Sidebar
                collapsible="icon"
                className={cn(
                    "text-white",
                    "[&_[data-slot=sidebar-inner]]:border",
                    "[&_[data-slot=sidebar-inner]]:border-white/15",
                    "[&_[data-slot=sidebar-inner]]:bg-black",
                    "[&_[data-slot=sidebar-inner]]:shadow-[0_22px_60px_-35px_rgba(0,0,0,0.8)]",
                    "[&_[data-slot=sidebar-inner]]:backdrop-blur-xl"
                )}
            >
                <SidebarHeader className="relative flex items-center justify-center px-6 pt-6 pb-4">
                    <SidebarTrigger
                        className="absolute right-[-18px] top-12 z-50 hidden h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-lg transition-all duration-300 hover:scale-105 md:flex"
                        title="Expandir sidebar"
                        aria-label="Expandir sidebar"
                    />
                    <Image
                        src="/assets/logo.png"
                        alt="Rikinho Auto Center"
                        width={120}
                        height={72}
                        className="h-16 w-auto object-contain drop-shadow-sm transition-all duration-300 group-data-[collapsible=icon]:hidden"
                        priority
                    />
                    <div className="hidden size-11 items-center justify-center rounded-full bg-white/10 text-red-500 text-sm font-semibold tracking-[0.2em] group-data-[collapsible=icon]:flex">
                        RAC
                    </div>
                </SidebarHeader>

                <SidebarContent className="px-3 pb-6">
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-2 group-data-[collapsible=icon]:items-center">
                                {menuItems.map((item) => (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            size="lg"
                                            isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                                            className="rounded-2xl border border-transparent bg-transparent px-3 text-sm font-medium text-white/90 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.8)] transition-colors duration-300 data-[active=true]:border-white/40 data-[active=true]:bg-white/12 data-[active=true]:text-white"
                                        >
                                            <MotionLink
                                                href={item.href}
                                                whileHover={{
                                                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                                                    borderColor: "rgba(255, 255, 255, 0.25)",
                                                }}
                                                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                                                className="flex items-center gap-2"
                                            >
                                                <item.icon />
                                                <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                                            </MotionLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </>
    );
}
