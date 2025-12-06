import { Metadata } from "next";
import Link from "next/link";
import { UserAuthForm } from "@/app/(auth)/login/user-auth-form";
import { AuroraBackground } from "@/components/aceternity/aurora-background";

export const metadata: Metadata = {
  title: "Login | Aura Core",
  description: "Acesso restrito ao Sistema de Gestão Logística",
};

export default function LoginPage() {
  return (
    <AuroraBackground className="h-screen w-full bg-zinc-950">
      <div className="container relative flex h-full flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 z-10">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex border-none bg-transparent">
          <div className="absolute inset-0 bg-black/20" /> {/* Overlay suave */}
          <div className="relative z-20 flex items-center text-lg font-medium">
            <div className="h-8 w-8 bg-white rounded-lg mr-2 flex items-center justify-center">
              <span className="text-black font-bold">A</span>
            </div>
            Aura Core Enterprise
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;A logística não é sobre mover coisas, é sobre mover o mundo com eficiência e inteligência.&rdquo;
              </p>
              <footer className="text-sm">Equipe Aura</footer>
            </blockquote>
          </div>
        </div>
        
        <div className="lg:p-8 w-full max-w-[500px]">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 bg-black/40 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Acesso ao Sistema
              </h1>
              <p className="text-sm text-muted-foreground">
                Use sua conta corporativa ou credenciais de acesso
              </p>
            </div>
            <UserAuthForm />
            <p className="px-8 text-center text-sm text-muted-foreground">
              Ao clicar em continuar, você concorda com nossos{" "}
              <Link
                href="/terms"
                className="underline underline-offset-4 hover:text-primary"
              >
                Termos de Serviço
              </Link>{" "}
              e{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:text-primary"
              >
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}
