"use client";

import { LogIn } from "lucide-react";
import { useFormStatus } from "react-dom";

import { signInWithGoogleAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      <LogIn className="size-4" />
      {pending ? "Conectando con Google…" : label}
    </Button>
  );
}

export function SignInButton({
  label = "Continuar con Google",
}: {
  label?: string;
}) {
  return (
    <form action={signInWithGoogleAction}>
      <SubmitButton label={label} />
    </form>
  );
}
