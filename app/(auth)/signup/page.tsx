"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { signup, type SignupState } from "@/app/actions/auth";
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

const initialState: SignupState = { error: undefined };

export default function SignupPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState(signup, initialState);
  const { data: session, isLoading } = useAuthSession();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && session?.user) {
      router.replace("/");
    }
  }, [isLoading, router, session?.user]);

  useEffect(() => {
    if (state.error) {
      toast({
        title: "Erro ao criar conta",
        description: state.error,
        variant: "destructive",
      });
    }
  }, [state.error, toast]);

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
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>
            Configure o perfil da sua oficina em minutos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                placeholder="Nome"
                autoComplete="name"
              />
            </div>

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
                autoComplete="new-password"
              />
            </div>

            {state.error ? (
              <p className="text-xs text-destructive">{state.error}</p>
            ) : null}

            <Button type="submit" disabled={pending || isLoading} className="w-full">
              {pending ? "Criando..." : "Criar conta"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Ja tem uma conta?{" "}
            <Link href="/login" className="font-medium text-primary">
              Entrar
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
