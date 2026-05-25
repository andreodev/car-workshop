"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

import { useAuthSession } from "@/app/hooks/useAuthSession";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { data: session, isLoading } = useAuthSession();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && session?.user) {
      router.replace("/");
    }
  }, [isLoading, router, session?.user]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      const message = "E-mail ou senha inválidos.";
      setError(message);
      toast({
        title: "Falha ao entrar",
        description: message,
        variant: "destructive",
      });
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex justify-center">
            <Image
              src="/assets/logo.png"
              alt="Rikinho Auto Center"
              width={140}
              height={84}
              className="h-16 w-auto object-contain"
              priority
            />
          </div>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Acesse sua conta para gerenciar a oficina.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="E-mail"
                autoComplete="email"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Verificando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Ainda nao tem conta?{" "}
            <Link href="/signup" className="font-medium text-primary">
              Criar uma
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
