"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

const formSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(1, { message: "Senha requerida" }),
});

// FIX: Extrair lógica de searchParams para componente separado com Suspense
// No Next.js 15, useSearchParams() requer Suspense boundary para evitar hydration mismatch
function UserAuthFormContent({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    // Login Credentials
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: true,
      callbackUrl,
    });

    // signIn credentials redirect automático não retorna erro aqui no client side geralmente, 
    // ele recarrega a página com ?error se falhar.
    // Se redirect: false, podemos tratar.
    setIsLoading(false);
  }

  const loginWithGoogle = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl });
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {error && (
        <div className="p-3 text-sm text-white bg-destructive/15 border border-destructive/50 rounded-md text-center">
          Erro de autenticação. Verifique suas credenciais.
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder="nome@empresa.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              className="bg-background/50 border-white/10 text-white placeholder:text-muted-foreground"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label className="sr-only" htmlFor="password">
              Senha
            </Label>
            <Input
              id="password"
              placeholder="Senha"
              type="password"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={isLoading}
              className="bg-background/50 border-white/10 text-white placeholder:text-muted-foreground"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
            )}
          </div>
          <Button disabled={isLoading} className="w-full bg-white text-black hover:bg-slate-200 font-semibold">
            {isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Entrar com Email
          </Button>
        </div>
      </form>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Ou continue com
          </span>
        </div>
      </div>
      
      <Button
        variant="outline"
        type="button"
        disabled={isLoading}
        onClick={loginWithGoogle}
        className="w-full border-white/10 hover:bg-white/5 text-white hover:text-white"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FcGoogle className="mr-2 h-4 w-4" />
        )}
        Google Workspace
      </Button>
    </div>
  );
}

// Wrapper com Suspense boundary para evitar hydration mismatch
// useSearchParams() requer Suspense no Next.js 15
export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/60" />
          </div>
        </div>
      }
    >
      <UserAuthFormContent className={className} {...props} />
    </Suspense>
  );
}
