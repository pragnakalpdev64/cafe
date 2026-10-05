import type { Role } from "@/generated/prisma/enums";

export type NavItem = {
  href: string;
  label: string;
  icon: "orders" | "menu" | "history" | "tables" | "customers" | "reports" | "settings";
  roles: Role[];
  /** not built yet – shown greyed out with the phase it arrives in */
  soon?: string;
};

export const NAV: NavItem[] = [
  { href: "/admin", label: "Table lists", icon: "orders", roles: ["STAFF", "OWNER"] },
  { href: "/admin/menu", label: "Menu", icon: "menu", roles: ["STAFF", "OWNER"] },
  { href: "/admin/orders", label: "Order history", icon: "history", roles: ["STAFF", "OWNER"], soon: "Later" },
  { href: "/admin/tables", label: "Tables & QR", icon: "tables", roles: ["OWNER"], soon: "Phase 4" },
  { href: "/admin/customers", label: "Customers", icon: "customers", roles: ["OWNER"], soon: "Phase 4" },
  { href: "/admin/reports", label: "Reports", icon: "reports", roles: ["OWNER"], soon: "Phase 4" },
  { href: "/admin/settings", label: "Settings", icon: "settings", roles: ["OWNER"], soon: "Phase 4" },
];
