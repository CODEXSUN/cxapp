export type BillingPrintPageItem<T> = {
  item: T;
  index: number;
};

export type BillingPrintParticularLines = {
  primary: string;
  variant: string;
};

const BILLING_PRINT_ITEMS_PER_PAGE = 12;
const BILLING_PRINT_EXTENDED_FIRST_PAGE_ITEMS = 15;
const BILLING_PRINT_MINIMUM_CONTINUATION_ITEMS = 4;
const BILLING_PRINT_LINES_PER_ITEM = 3;
const BILLING_PRINT_PARTICULARS_CHARACTERS_PER_LINE = 42;

export function paginateBillingPrintItems<T>(items: readonly T[]) {
  const indexedItems = items.map((item, index) => ({ item, index }));
  const itemCount = indexedItems.length;

  if (itemCount <= BILLING_PRINT_ITEMS_PER_PAGE) {
    return [indexedItems];
  }

  if (itemCount <= BILLING_PRINT_EXTENDED_FIRST_PAGE_ITEMS) {
    return [
      indexedItems.slice(0, BILLING_PRINT_ITEMS_PER_PAGE),
      indexedItems.slice(BILLING_PRINT_ITEMS_PER_PAGE)
    ];
  }

  const firstPageSize = Math.min(
    BILLING_PRINT_EXTENDED_FIRST_PAGE_ITEMS,
    itemCount - BILLING_PRINT_MINIMUM_CONTINUATION_ITEMS
  );
  const pages: Array<Array<BillingPrintPageItem<T>>> = [indexedItems.slice(0, firstPageSize)];
  let cursor = firstPageSize;

  while (itemCount - cursor > BILLING_PRINT_ITEMS_PER_PAGE) {
    const remainingItems = itemCount - cursor;
    const itemsAfterFullPage = remainingItems - BILLING_PRINT_ITEMS_PER_PAGE;
    const pageSize =
      itemsAfterFullPage < BILLING_PRINT_MINIMUM_CONTINUATION_ITEMS
        ? remainingItems - BILLING_PRINT_MINIMUM_CONTINUATION_ITEMS
        : BILLING_PRINT_ITEMS_PER_PAGE;
    pages.push(indexedItems.slice(cursor, cursor + pageSize));
    cursor += pageSize;
  }

  pages.push(indexedItems.slice(cursor));
  return pages;
}

export function getBillingPrintDummyLineCount(
  particulars: readonly BillingPrintParticularLines[],
  itemsPerPage = BILLING_PRINT_ITEMS_PER_PAGE
) {
  const missingItemLines =
    Math.max(0, itemsPerPage - particulars.length) * BILLING_PRINT_LINES_PER_ITEM;
  const overflowLines = particulars.reduce((total, item) => {
    const usedLines =
      estimateBillingPrintTextLines(item.primary) + (item.variant.trim().length > 0 ? 1 : 0);
    return total + Math.max(0, usedLines - BILLING_PRINT_LINES_PER_ITEM);
  }, 0);

  return Math.max(0, missingItemLines - overflowLines);
}

function estimateBillingPrintTextLines(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;

  let lines = 1;
  let lineLength = 0;
  for (const word of words) {
    const wordLength = word.length;
    if (wordLength > BILLING_PRINT_PARTICULARS_CHARACTERS_PER_LINE) {
      const longWordLines = Math.ceil(wordLength / BILLING_PRINT_PARTICULARS_CHARACTERS_PER_LINE);
      lines += lineLength > 0 ? longWordLines : longWordLines - 1;
      lineLength = wordLength % BILLING_PRINT_PARTICULARS_CHARACTERS_PER_LINE;
      continue;
    }

    const nextLength = lineLength === 0 ? wordLength : lineLength + 1 + wordLength;
    if (nextLength > BILLING_PRINT_PARTICULARS_CHARACTERS_PER_LINE) {
      lines += 1;
      lineLength = wordLength;
    } else {
      lineLength = nextLength;
    }
  }
  return lines;
}
