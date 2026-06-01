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

import banner from "@/assets/banner/banner.png";

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
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0B0D12] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <Image
            src={banner}
            alt="Oficina mecânica"
            fill
            priority
            className="object-cover opacity-70"
          />

          <div className="absolute inset-0 bg-linear-to-r from-[#07080D] via-[#07080D]/85 to-[#07080D]/20" />
          <div className="absolute inset-0 bg-linear-to-t from-[#07080D] via-transparent to-transparent" />

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
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-red-400" />
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

          <div className="absolute -right-24 top-1/2 h-[120%] w-48 -translate-y-1/2 rounded-l-[100%] border-l border-red-500/40 bg-linear-to-r from-red-500/20 to-transparent blur-sm" />
        </section>

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] px-5 py-10 text-[#0F172A]">
          <div className="absolute inset-0 bg-[radial-linear(circle_at_top_right,#FEE2E2,transparent_35%),radial-linear(circle_at_bottom_left,#E0F2FE,transparent_35%)]" />
          <div className="absolute right-30 top-30 h-80 w-80 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute bottom-30 left-30 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

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

            <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl">
              <div className="h-1.5 bg-linear-to-r from-red-600 via-red-500 to-red-400" />

              <div className="px-7 py-8 sm:px-9 sm:py-9">
                <div className="mb-8 text-center">
                  <div className="mx-auto  mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] border border-slate-200 bg-black shadow-sm">
                    <Image
                      src="/assets/logo.png"
                      alt="Rikinho Auto Center"
                      width={150}
                      height={90}
                      className="h-16 w-auto object-contain"
                      priority
                    />
                  </div>

                  <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Área administrativa
                  </div>

                  <h2 className="text-3xl font-black tracking-tight text-slate-950">
                    Bem-vindo de volta
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Acesse sua conta para gerenciar clientes, veículos, ordens
                    de serviço e financeiro da oficina.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-semibold text-slate-700"
                    >
                      E-mail
                    </Label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="seuemail@exemplo.com"
                        autoComplete="email"
                        disabled={isSubmitting}
                        className="h-13 rounded-2xl border-slate-200 bg-slate-50 pl-12 text-sm shadow-none transition-all placeholder:text-slate-400 focus-visible:border-red-500 focus-visible:bg-white focus-visible:ring-red-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="password"
                        className="text-sm font-semibold text-slate-700"
                      >
                        Senha
                      </Label>

                      <Link
                        href="/forgot-password"
                        className="text-xs font-bold text-red-600 transition hover:text-red-700 hover:underline"
                      >
                        Esqueci minha senha
                      </Link>
                    </div>

                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite sua senha"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        className="h-13 rounded-2xl border-slate-200 bg-slate-50 pl-12 pr-12 text-sm shadow-none transition-all placeholder:text-slate-400 focus-visible:border-red-500 focus-visible:bg-white focus-visible:ring-red-500/20"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        disabled={isSubmitting}
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <div className="animate-in fade-in slide-in-from-top-1 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 duration-300">
                      <p className="text-sm font-medium text-red-700">
                        {error}
                      </p>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isLoading || isSubmitting}
                    className="group h-13 w-full rounded-2xl bg-linear-to-r from-red-600 to-red-500 text-sm font-bold text-white shadow-[0_14px_30px_rgba(239,68,68,0.30)] transition-all hover:from-red-700 hover:to-red-600 hover:shadow-[0_18px_36px_rgba(239,68,68,0.38)] disabled:cursor-not-allowed disabled:opacity-70"
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
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium text-slate-400">
                    novo por aqui?
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <p className="text-center text-sm text-slate-500">
                  Ainda não tem conta?{" "}
                  <Link
                    href="/signup"
                    className="font-bold text-red-600 transition hover:text-red-700 hover:underline"
                  >
                    Criar uma conta
                  </Link>
                  .
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
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
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
        {icon}
      </div>

      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-white/60">{description}</p>
    </div>
  );
}
