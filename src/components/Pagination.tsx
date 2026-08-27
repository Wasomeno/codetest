import { useRef, useState } from "react";
import { PopoverMenu } from "./PopoverMenu";

/**
 * Working pagination control with a "max items per page" dropdown.
 *
 * - Page buttons get press feedback (scale on :active) and a disabled
 *   state on prev/next at the edges — the control always answers.
 * - The page-size trigger reuses the toolbar "field" chrome so it
 *   reads as part of the same control family.
 * - Page numbers collapse to an ellipsis when the page count grows,
 *   always keeping first / last / current ± 1 visible.
 */

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export interface PaginationProps {
  /** 1-based current page. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Items shown per page. */
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

/** Builds the page-number list, inserting "…" gaps when needed. */
export function getPageList(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, pageCount]);
  for (let p = page - 1; p <= page + 1; p++) {
    if (p >= 1 && p <= pageCount) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const list: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) list.push("…");
    list.push(sorted[i]);
  }
  return list;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: PaginationProps) {
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const sizeTriggerRef = useRef<HTMLButtonElement>(null);

  const pages = getPageList(page, pageCount);

  return (
    <div className="pagination">
      <div className="pagination-size">
        <button
          ref={sizeTriggerRef}
          type="button"
          className="page-size-trigger"
          aria-haspopup="listbox"
          aria-expanded={sizeMenuOpen}
          onClick={() => setSizeMenuOpen((o) => !o)}
        >
          <span className="page-size-label">Show</span>
          <span className="page-size-value">{pageSize}</span>
          <span className="field-caret" />
        </button>
        <PopoverMenu
          open={sizeMenuOpen}
          anchor={sizeTriggerRef.current}
          onClose={() => setSizeMenuOpen(false)}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              role="option"
              aria-selected={size === pageSize}
              className={`popover-item${size === pageSize ? " is-selected" : ""}`}
              onClick={() => {
                onPageSizeChange(size);
                setSizeMenuOpen(false);
              }}
            >
              {size}
              {size === pageSize && <span className="popover-item-check">✓</span>}
            </button>
          ))}
        </PopoverMenu>
      </div>

      {pageCount > 1 && (
        <div className="pager" role="navigation" aria-label="Pagination">
          <button
            type="button"
            className="page-btn"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ‹
          </button>
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="page-btn page-btn-gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`page-btn${p === page ? " is-active" : ""}`}
                aria-current={p === page ? "page" : undefined}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            className="page-btn"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
