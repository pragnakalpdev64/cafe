import { describe, expect, it } from "vitest";

import { availableActions, canCancel, canEditItems, nextStatus } from "@/lib/order-flow";

describe("order flow", () => {
  it("takes a dine-in order from confirmed to served", () => {
    expect(nextStatus("toKitchen", "ACCEPTED", "DINE_IN")).toBe("PREPARING");
    expect(nextStatus("served", "PREPARING", "DINE_IN")).toBe("SERVED");
    expect(nextStatus("readyToCollect", "PREPARING", "DINE_IN")).toBeNull();
  });

  it("takes a takeaway order through ready to collect", () => {
    expect(nextStatus("readyToCollect", "PREPARING", "PARCEL")).toBe("READY");
    expect(nextStatus("pickedUp", "READY", "PARCEL")).toBe("SERVED");
    expect(nextStatus("served", "PREPARING", "PARCEL")).toBeNull();
  });

  it("refuses to skip or repeat steps", () => {
    expect(nextStatus("served", "ACCEPTED", "DINE_IN")).toBeNull();
    expect(nextStatus("toKitchen", "PREPARING", "DINE_IN")).toBeNull();
    expect(nextStatus("toKitchen", "CANCELLED", "DINE_IN")).toBeNull();
  });

  it("lists the buttons for each status", () => {
    expect(availableActions("ACCEPTED", "DINE_IN")).toEqual(["toKitchen"]);
    expect(availableActions("PREPARING", "PARCEL")).toEqual(["readyToCollect"]);
    expect(availableActions("SERVED", "DINE_IN")).toEqual([]);
  });

  it("allows edits only before the kitchen and cancelling until served", () => {
    expect(canEditItems("ACCEPTED")).toBe(true);
    expect(canEditItems("PREPARING")).toBe(false);
    expect(canCancel("PREPARING")).toBe(true);
    expect(canCancel("SERVED")).toBe(false);
    expect(canCancel("PAID")).toBe(false);
  });
});
