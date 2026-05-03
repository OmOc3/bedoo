export type PaginationItem = number | "ellipsis";

/** Page numbers in ascending order; inserts ellipsis where there are gaps. */
export function buildPaginationItems(currentPage: number, totalPages: number, delta = 2): PaginationItem[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages === 1) {
    return [1];
  }

  const current = Math.min(Math.max(1, currentPage), totalPages);
  const items = new Set<number>();
  items.add(1);
  items.add(totalPages);

  for (let i = current - delta; i <= current + delta; i++) {
    if (i >= 1 && i <= totalPages) {
      items.add(i);
    }
  }

  const sorted = [...items].sort((a, b) => a - b);
  const result: PaginationItem[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && prev !== undefined && n - prev > 1) {
      result.push("ellipsis");
    }
    result.push(n);
  }

  return result;
}
