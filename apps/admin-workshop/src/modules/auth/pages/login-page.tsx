"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail valido."),
  password: z.string().min(1, "Informe sua senha."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleSubmit(values: LoginFormValues) {
    setError(null);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Acesso permitido apenas para usuarios OWNER.");
      return;
    }

    router.replace(searchParams.get("callbackUrl") ?? "/oficinas");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <CardTitle>Admin Whitelabel</CardTitle>
          <CardDescription>
            Entre com uma conta vinculada como OWNER de uma oficina.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Login bloqueado</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">E-mail</span>
              <Input type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <span className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </span>
              ) : null}
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Senha</span>
              <Input
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <span className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </span>
              ) : null}
            </label>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
