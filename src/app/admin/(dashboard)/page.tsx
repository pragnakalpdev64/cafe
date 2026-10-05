import { LiveLists } from "@/components/admin/live-lists";
import { requireUser } from "@/lib/auth/dal";
import { getLiveLists } from "@/lib/data/selections";

// same segment as the dashboard layout, so its title template does not apply here
export const metadata = { title: { absolute: "Table lists · Dashboard" } };

export default async function TableListsPage() {
  const user = await requireUser();
  return <LiveLists initial={await getLiveLists(user.role)} />;
}
