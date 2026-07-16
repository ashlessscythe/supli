export interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  minimumThreshold: number;
}

export function isLowStock(quantity: number, minimumThreshold: number): boolean {
  return quantity <= minimumThreshold;
}

export function toSupplyChartRow(supply: {
  name: string;
  quantity: number;
  minimumThreshold: number;
}) {
  return {
    name: supply.name,
    quantity: supply.quantity,
    threshold: supply.minimumThreshold,
    status: isLowStock(supply.quantity, supply.minimumThreshold)
      ? ("Low" as const)
      : ("OK" as const),
  };
}
