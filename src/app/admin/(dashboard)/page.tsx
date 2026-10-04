import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";

// same segment as the dashboard layout, so its title template does not apply here
export const metadata = { title: { absolute: "Live orders · Dashboard" } };

export default async function LiveOrdersPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold">Hi {user.name.split(" ")[0]} 👋</h1>
      <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
        <ClipboardList className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold">Live orders arrive in Phase 3</h2>
        <p className="mt-1 text-muted-foreground">
          Tables view, parcel lane and order board will appear here. For now you can manage the menu.
        </p>
        <Button asChild className="mt-5 rounded-full">
          <Link href="/admin/menu">Open the menu</Link>
        </Button>
      </div>
    </div>
  );
}
