import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LogoIcon } from "@/components/brand/logo";
import { getCafeDetails } from "@/lib/data/menu";
import { SELECTION_RETENTION_HOURS } from "@/lib/data/selections";

export const metadata: Metadata = {
  title: "Privacy note",
  description: "What Healthy Hunger collects when you use the QR menu, why, and how to have it deleted.",
};

// Keep in step with what the app actually does (see Selection, CafeSettings, StaffUser).
const UPDATED = "5 October 2026";

export default async function PrivacyPage() {
  await connection();
  const cafe = await getCafeDetails();
  const contact = [cafe.phone && `call ${cafe.phone}`, cafe.whatsapp && `WhatsApp +${cafe.whatsapp}`]
    .filter(Boolean)
    .join(" or ");

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> {cafe.name}
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <LogoIcon className="h-12" alt="" />
        <div>
          <h1 className="text-4xl font-bold">Privacy note</h1>
          <p className="text-sm text-muted-foreground">Last updated {UPDATED}</p>
        </div>
      </div>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        <p className="text-lg text-muted-foreground">
          {cafe.name} collects as little as possible. This note explains what we keep when you use our QR
          menu, why, and how to have it removed.
        </p>

        <section>
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Your list:</strong> the items you pick on the menu, with add-ons and quantities.
            </li>
            <li>
              <strong>Your table number</strong>, if you scanned a table QR or chose a table.
            </li>
            <li>
              <strong>Your mobile number</strong>, only if you choose takeaway and type it in.
            </li>
            <li>
              <strong>A random ID in your browser</strong>, so your list stays on your phone while you browse.
              It isn&apos;t linked to your name.
            </li>
          </ul>
          <p className="mt-2">
            We don&apos;t ask for your name or email, we don&apos;t take payments online, and the site has no
            advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2>Why we use it</h2>
          <p>
            Only so our staff can see what you picked and find you – at your table, or by your number for
            takeaway. We don&apos;t send offers or messages.
          </p>
        </section>

        <section>
          <h2>Who can see it</h2>
          <ul>
            <li>
              Café staff see your list and table. They see your mobile number partly hidden (for example
              98xxxxxx21).
            </li>
            <li>The owner can see the full number.</li>
            <li>We don&apos;t sell or share your details with anyone else.</li>
          </ul>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <ul>
            <li>Your list is deleted when staff clear it after serving you.</li>
            <li>Anything left is deleted automatically after {SELECTION_RETENTION_HOURS} hours.</li>
            <li>On your phone, the list clears itself after 12 hours, or when you tap “Clear list”.</li>
          </ul>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            Under India&apos;s Digital Personal Data Protection Act, 2023 you can ask what we hold about you,
            ask us to correct it, or ask us to delete it.{" "}
            {contact ? <>To do that, {contact}, or </> : <>To do that, </>}
            speak to us at the counter.
          </p>
        </section>

        {cafe.address && (
          <section>
            <h2>Who we are</h2>
            <p>
              {cafe.name}
              <br />
              {cafe.address}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
