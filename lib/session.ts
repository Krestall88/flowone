import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export { isReadOnlyRole } from "@/lib/roles";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session?.user) {
    throw new Error("Необходима авторизация");
  }
  return session.user;
}
