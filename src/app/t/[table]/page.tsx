import { redirect } from "next/navigation";

/** Old per-table QR cards: everyone now uses the one café QR, which opens /menu. */
export default function OldTableQrPage() {
  redirect("/menu");
}
