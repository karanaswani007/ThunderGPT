import { auth } from "@/lib/auth/server";

export type RequestUser = { id: string; email: string | null };

export async function userFromRequest(request: Request): Promise<RequestUser | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return null;
    return { id: session.user.id, email: session.user.email ?? null };
  } catch {
    return null;
  }
}
