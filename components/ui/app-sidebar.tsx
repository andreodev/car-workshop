"use client";

import Link from "next/link";


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
} from "@/components/ui/sidebar";
import { menuItems } from "../data/sidebar";

export function AppSidebar() {
    return (
        <Sidebar>
            <SidebarHeader className="p-4">
                <div className="text-lg font-bold">Placa OK</div>
                <span className="text-xs text-muted-foreground">
                    Sistema de oficina
                </span>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>

                    <SidebarGroupContent>
                        <SidebarMenu>
                            {menuItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.href}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 text-xs text-muted-foreground">
                Sua licença expira em 29/05/2026
            </SidebarFooter>
        </Sidebar>
    );
}