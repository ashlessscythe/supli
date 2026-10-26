export type KioskCartLine = {
  supplyId: string;
  name: string;
  quantity: number;
  onHand: number;
  /** Set when the server reports the supply is gone. */
  missing?: boolean;
  /** Server-clamped available stock message. */
  serverAvailable?: number | null;
};

export type KioskCartState = {
  lines: KioskCartLine[];
};

export type KioskCartAction =
  | {
      type: "add";
      supplyId: string;
      name: string;
      onHand: number;
      amount?: number;
    }
  | { type: "setQty"; supplyId: string; quantity: number }
  | { type: "inc"; supplyId: string }
  | { type: "dec"; supplyId: string }
  | { type: "remove"; supplyId: string }
  | { type: "clear" }
  | {
      type: "applyServerErrors";
      insufficient?: { supplyId: string; available: number }[];
      missing?: string[];
    };

export function emptyKioskCart(): KioskCartState {
  return { lines: [] };
}

function clampQty(quantity: number, onHand: number): number {
  if (onHand <= 0) return 0;
  return Math.min(Math.max(1, quantity), onHand);
}

export function kioskCartReducer(
  state: KioskCartState,
  action: KioskCartAction
): KioskCartState {
  switch (action.type) {
    case "add": {
      if (action.onHand <= 0) return state;
      const amount = action.amount ?? 1;
      const existing = state.lines.find((l) => l.supplyId === action.supplyId);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.supplyId === action.supplyId
              ? {
                  ...l,
                  onHand: action.onHand,
                  name: action.name,
                  quantity: clampQty(l.quantity + amount, action.onHand),
                  missing: false,
                  serverAvailable: null,
                }
              : l
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            supplyId: action.supplyId,
            name: action.name,
            onHand: action.onHand,
            quantity: clampQty(amount, action.onHand),
          },
        ],
      };
    }
    case "setQty": {
      return {
        lines: state.lines
          .map((l) => {
            if (l.supplyId !== action.supplyId) return l;
            if (action.quantity < 1 || l.onHand <= 0) return null;
            return {
              ...l,
              quantity: clampQty(action.quantity, l.onHand),
              missing: false,
              serverAvailable: null,
            };
          })
          .filter((l): l is KioskCartLine => l != null),
      };
    }
    case "inc": {
      return {
        lines: state.lines.map((l) =>
          l.supplyId === action.supplyId
            ? {
                ...l,
                quantity: clampQty(l.quantity + 1, l.onHand),
                missing: false,
                serverAvailable: null,
              }
            : l
        ),
      };
    }
    case "dec": {
      return {
        lines: state.lines
          .map((l) => {
            if (l.supplyId !== action.supplyId) return l;
            const next = l.quantity - 1;
            if (next < 1) return null;
            return {
              ...l,
              quantity: next,
              missing: false,
              serverAvailable: null,
            };
          })
          .filter((l): l is KioskCartLine => l != null),
      };
    }
    case "remove": {
      return {
        lines: state.lines.filter((l) => l.supplyId !== action.supplyId),
      };
    }
    case "clear": {
      return emptyKioskCart();
    }
    case "applyServerErrors": {
      const insuff = new Map(
        (action.insufficient ?? []).map((i) => [i.supplyId, i.available])
      );
      const missing = new Set(action.missing ?? []);
      return {
        lines: state.lines.map((l) => {
          if (missing.has(l.supplyId)) {
            return { ...l, missing: true, serverAvailable: null };
          }
          if (insuff.has(l.supplyId)) {
            const available = insuff.get(l.supplyId)!;
            return {
              ...l,
              onHand: available,
              quantity: available > 0 ? clampQty(l.quantity, available) : 0,
              serverAvailable: available,
              missing: false,
            };
          }
          return l;
        }),
      };
    }
    default:
      return state;
  }
}

export function cartTotals(state: KioskCartState): {
  itemCount: number;
  unitCount: number;
} {
  const active = state.lines.filter((l) => !l.missing && l.quantity > 0);
  return {
    itemCount: active.length,
    unitCount: active.reduce((sum, l) => sum + l.quantity, 0),
  };
}

export function cartHasBlockingErrors(state: KioskCartState): boolean {
  return state.lines.some(
    (l) =>
      l.missing ||
      l.quantity <= 0 ||
      (l.serverAvailable != null && l.serverAvailable < l.quantity)
  );
}

export function qtyInCart(state: KioskCartState, supplyId: string): number {
  return state.lines.find((l) => l.supplyId === supplyId)?.quantity ?? 0;
}
