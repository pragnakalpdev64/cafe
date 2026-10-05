import "server-only";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/site-url";

export const tableUrl = (qrSlug: string) => new URL(`/t/${qrSlug}`, SITE_URL).toString();

/** True while SITE_URL still points at this computer – codes printed now won't work for guests. */
export const siteUrlIsLocal = () => ["localhost", "127.0.0.1", "[::1]"].includes(SITE_URL.hostname);

/** QR code as an SVG string (dark green on transparent, scales cleanly for print). */
export function qrSvg(text: string) {
  return QRCode.toString(text, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0f5c2c", light: "#0000" },
  });
}
