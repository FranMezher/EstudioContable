"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos." };
    }
    // Los redirects de Next se propagan como errores: hay que relanzarlos.
    throw error;
  }
}
