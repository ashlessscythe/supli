import { describe, expect, it } from "vitest";
import {
  cartTotals,
  emptyKioskCart,
  kioskCartReducer,
  qtyInCart,
} from "@/lib/kiosk-cart";

describe("kioskCartReducer", () => {
  it("adds, increments, decrements, removes, and clears", () => {
    let state = emptyKioskCart();
    state = kioskCartReducer(state, {
      type: "add",
      supplyId: "s1",
      name: "Gloves",
      onHand: 10,
    });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].quantity).toBe(1);

    state = kioskCartReducer(state, { type: "inc", supplyId: "s1" });
    expect(state.lines[0].quantity).toBe(2);

    state = kioskCartReducer(state, { type: "dec", supplyId: "s1" });
    expect(state.lines[0].quantity).toBe(1);

    state = kioskCartReducer(state, {
      type: "add",
      supplyId: "s2",
      name: "Masks",
      onHand: 5,
    });
    expect(cartTotals(state)).toEqual({ itemCount: 2, unitCount: 2 });

    state = kioskCartReducer(state, { type: "remove", supplyId: "s1" });
    expect(state.lines.map((l) => l.supplyId)).toEqual(["s2"]);

    state = kioskCartReducer(state, { type: "clear" });
    expect(state.lines).toHaveLength(0);
  });

  it("merges duplicate adds and clamps to onHand", () => {
    let state = emptyKioskCart();
    state = kioskCartReducer(state, {
      type: "add",
      supplyId: "s1",
      name: "Gloves",
      onHand: 3,
    });
    state = kioskCartReducer(state, {
      type: "add",
      supplyId: "s1",
      name: "Gloves",
      onHand: 3,
      amount: 5,
    });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].quantity).toBe(3);

    state = kioskCartReducer(state, {
      type: "setQty",
      supplyId: "s1",
      quantity: 99,
    });
    expect(state.lines[0].quantity).toBe(3);

    state = kioskCartReducer(state, {
      type: "setQty",
      supplyId: "s1",
      quantity: 0,
    });
    expect(state.lines).toHaveLength(0);
  });

  it("refuses to add out-of-stock items", () => {
    const state = kioskCartReducer(emptyKioskCart(), {
      type: "add",
      supplyId: "s1",
      name: "Gone",
      onHand: 0,
    });
    expect(state.lines).toHaveLength(0);
    expect(qtyInCart(state, "s1")).toBe(0);
  });

  it("applyServerErrors clamps insufficient lines and flags missing", () => {
    let state = emptyKioskCart();
    state = kioskCartReducer(state, {
      type: "add",
      supplyId: "a",
      name: "A",
      onHand: 10,
      amount: 5,
    });
    state = kioskCartReducer(state, {
      type: "add",
      supplyId: "b",
      name: "B",
      onHand: 10,
      amount: 2,
    });
    state = kioskCartReducer(state, {
      type: "applyServerErrors",
      insufficient: [{ supplyId: "a", available: 2 }],
      missing: ["b"],
    });

    const a = state.lines.find((l) => l.supplyId === "a")!;
    const b = state.lines.find((l) => l.supplyId === "b")!;
    expect(a.quantity).toBe(2);
    expect(a.serverAvailable).toBe(2);
    expect(b.missing).toBe(true);
  });
});
