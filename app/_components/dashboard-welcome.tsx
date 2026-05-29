"use client";

import { useEffect } from "react";

import { useAuthSession } from "@/app/hooks/useAuthSession";
import { useToast } from "@/components/ui/toast";

const welcomeMessages = [
  "Tenha um ótimo dia de trabalho 🚀",
  "Tudo pronto para gerenciar sua oficina 🔧",
  "Sistema carregado com sucesso ⚡",
  "Vamos colocar os serviços em dia 💪",
];

export function DashboardWelcome() {
  const { data: session } = useAuthSession();
  const { toast } = useToast();

  useEffect(() => {
    if (!session?.user?.name) return;

    const alreadyShown = sessionStorage.getItem("dashboard-welcome");

    if (alreadyShown) return;

    sessionStorage.setItem("dashboard-welcome", "true");
    const randomMessage =
      welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

    toast({
      title: `Bem-vindo, ${session.user.name} 👋`,
      description: randomMessage,
      variant: "success",
    });
  }, [session?.user?.name, toast]);

  return null;
}
