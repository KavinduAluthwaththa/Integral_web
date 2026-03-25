import { StockInfo } from '@/lib/inventory';

export function getStockStatusText(stockInfo: StockInfo): string {
  if (stockInfo.isOutOfStock) {
    return 'Out of Stock';
  }

  if (stockInfo.isLowStock) {
    return `Only ${stockInfo.available} left`;
  }

  return 'In Stock';
}

export function getStockStatusColor(stockInfo: StockInfo): string {
  if (stockInfo.isOutOfStock) {
    return 'text-red-600';
  }

  if (stockInfo.isLowStock) {
    return 'text-orange-600';
  }

  return 'text-green-600';
}

export function getInventoryStatusColor(status: string): string {
  switch (status) {
    case 'in_stock':
      return 'text-green-600';
    case 'low_stock':
      return 'text-orange-600';
    case 'out_of_stock':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}