import { LiveBoard } from "@/components/admin/live-board";
import { requireUser } from "@/lib/auth/dal";
import { getLiveBoard } from "@/lib/data/live";

// same segment as the dashboard layout, so its title template does not apply here
export const metadata = { title: { absolute: "Live orders · Dashboard" } };

export default async function LiveOrdersPage() {
  const user = await requireUser();
  return <LiveBoard initial={await getLiveBoard(user.role)} />;
}
