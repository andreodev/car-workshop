"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Car,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { markBrowserSession } from "@/app/lib/browser-session";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useAuthSession();
  const { toast } = useToast();

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && session?.user) {
      router.replace("/");
    }
  }, [isLoading, router, session?.user]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Informe seu e-mail e senha para continuar.");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      const message = "E-mail ou senha inválidos.";

      setError(message);
      setIsSubmitting(false);

      toast({
        title: "Falha ao entrar",
        description: message,
        variant: "destructive",
      });

      return;
    }

    markBrowserSession();
    sessionStorage.removeItem("dashboard-welcome");
    await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    router.push("/selecionar-oficina");
    router.refresh();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-secondary text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_100%,black_0%)_0%,color-mix(in_oklab,var(--primary)_72%,black_28%)_42%,color-mix(in_oklab,var(--primary)_42%,black_58%)_100%)] lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.14),transparent_24%),linear-gradient(120deg,rgba(0,0,0,0.18),rgba(0,0,0,0.58))]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/45 to-transparent" />

          <div className="absolute left-10 top-10 z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl">
              <Image
                src="/assets/logo.png"
                alt="Rikinho Auto Center"
                width={90}
                height={54}
                className="h-8 w-auto object-contain"
                priority
              />
            </div>

            <div>
              <p className="text-sm font-semibold tracking-wide">
                Rikinho Auto Center
              </p>
              <p className="text-xs text-white/55">
                Gestão inteligente para oficinas
              </p>
            </div>
          </div>

          <div className="relative z-10 flex min-h-screen flex-col justify-end px-12 pb-14">
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-700">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-white" />
                Plataforma completa para sua oficina
              </div>

              <h1 className="max-w-xl text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl">
                Controle sua oficina com mais velocidade e precisão.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
                Gerencie clientes, veículos, ordens de serviço, vendas e
                financeiro em uma experiência simples, moderna e eficiente.
              </p>

              <div className="mt-10 grid max-w-3xl grid-cols-3 gap-4">
                <FeatureCard
                  icon={<Car className="h-5 w-5" />}
                  title="Veículos"
                  description="Histórico completo por cliente."
                />

                <FeatureCard
                  icon={<Wrench className="h-5 w-5" />}
                  title="Serviços"
                  description="OS, peças, mão de obra e status."
                />

                <FeatureCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Financeiro"
                  description="Vendas, contas e pagamentos."
                />
              </div>
            </div>
          </div>

          <div className="absolute -right-24 top-1/2 h-[120%] w-48 -translate-y-1/2 rounded-l-[100%] border-l border-white/25 bg-linear-to-r from-white/18 to-transparent blur-sm" />
        </section>

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10 text-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_34%),radial-gradient(circle_at_bottom_left,color-mix(in_oklab,var(--secondary)_14%,transparent),transparent_36%)]" />

          <div className="relative z-10 w-full max-w-117.5 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700">
            <div className="mb-6 flex justify-center lg:hidden">
              <div className="flex items-center gap-3 rounded-2xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl">
                <Image
                  src="/assets/logo.png"
                  alt="Rikinho Auto Center"
                  width={110}
                  height={66}
                  className="h-10 w-auto object-contain"
                  priority
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-border/80 bg-card/90 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl">
              <div className="h-1.5 bg-[linear-gradient(90deg,var(--primary),color-mix(in_oklab,var(--primary)_72%,black_28%))]" />

              <div className="px-7 py-8 sm:px-9 sm:py-9">
                <div className="mb-8 text-center">
                  <div className="mx-auto  mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] border border-border bg-secondary shadow-sm">
                    <Image
                      src="/assets/logo.png"
                      alt="Rikinho Auto Center"
                      width={150}
                      height={90}
                      className="h-16 w-auto object-contain"
                      priority
                    />
                  </div>

                  <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Área administrativa
                  </div>

                  <h2 className="text-3xl font-black tracking-tight text-foreground">
                    Bem-vindo de volta
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Acesse sua conta para gerenciar clientes, veículos, ordens
                    de serviço e financeiro da oficina.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-semibold text-foreground"
                    >
                      E-mail
                    </Label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="seuemail@exemplo.com"
                        autoComplete="email"
                        disabled={isSubmitting}
                        className="h-13 rounded-2xl border-border bg-muted/40 pl-12 text-sm shadow-none transition-all placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-card focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="password"
                        className="text-sm font-semibold text-foreground"
                      >
                        Senha
                      </Label>

                      <Link
                        href="/forgot-password"
                        className="text-xs font-bold text-primary transition hover:text-primary/80 hover:underline"
                      >
                        Esqueci minha senha
                      </Link>
                    </div>

                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite sua senha"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        className="h-13 rounded-2xl border-border bg-muted/40 pl-12 pr-12 text-sm shadow-none transition-all placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-card focus-visible:ring-primary/20"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        disabled={isSubmitting}
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={
                          showPassword ? "Ocultar senha" : "Mostrar senha"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <div className="animate-in fade-in slide-in-from-top-1 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 duration-300">
                      <p className="text-sm font-medium text-destructive">
                        {error}
                      </p>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isLoading || isSubmitting}
                    className="group h-13 w-full rounded-2xl bg-[linear-gradient(90deg,var(--primary),color-mix(in_oklab,var(--primary)_72%,black_28%))] text-sm font-bold text-primary-foreground shadow-[0_14px_30px_color-mix(in_oklab,var(--primary)_30%,transparent)] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Entrando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Entrar
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="my-7 flex items-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground">
                    novo por aqui?
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Ainda não tem conta?{" "}
                  <Link
                    href="/signup"
                    className="font-bold text-primary transition hover:text-primary/80 hover:underline"
                  >
                    Criar uma conta
                  </Link>
                  .
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} Rikinho Auto Center. Todos os
              direitos reservados.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.09]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-white">
        {icon}
      </div>

      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-white/60">{description}</p>
    </div>
  );
}
