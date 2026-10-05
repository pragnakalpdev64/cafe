import { getCurrentUser } from "@/lib/auth/dal";
import { getLiveLists } from "@/lib/data/selections";

// Polled every few seconds by the Table lists screen.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please log in again." }, { status: 401 });
  return Response.json(await getLiveLists(user.role), { headers: { "Cache-Control": "no-store" } });
}
