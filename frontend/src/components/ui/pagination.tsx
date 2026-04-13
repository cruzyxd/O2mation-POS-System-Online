import { createContext, useContext } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

// Pagination — keeps the same PaginationRoot/PaginationItems/PaginationPrevTrigger/
// PaginationNextTrigger/PaginationPageText exported API.

interface PaginationRootProps {
  count: number;
  pageSize: number;
  page: number;
  onPageChange: (details: { page: number }) => void;
  siblingCount?: number;
  children: React.ReactNode;
}

const PaginationContext = createContext<{
  count: number;
  pageSize: number;
  page: number;
  onPageChange: (details: { page: number }) => void;
  totalPages: number;
}>({ count: 0, pageSize: 25, page: 1, onPageChange: () => { }, totalPages: 0 });

export function PaginationRoot({ count, pageSize, page, onPageChange, children }: PaginationRootProps) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <PaginationContext value={{ count, pageSize, page, onPageChange, totalPages }}>
      {children}
    </PaginationContext>
  );
}

function getPageNumbers(page: number, totalPages: number, siblingCount = 1): (number | "...")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const left = Math.max(2, page - siblingCount);
  const right = Math.min(totalPages - 1, page + siblingCount);
  const pages: (number | "...")[] = [1];
  if (left > 2) pages.push("...");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}

const btnBase = cn(
  "inline-flex items-center justify-center rounded-lg h-8 min-w-[2rem] px-2 text-sm font-medium transition-colors",
  "border border-[var(--border-default)]",
  "text-[var(--fg-default)] bg-[var(--bg-surface)]",
  "hover:bg-[var(--bg-subtle)] disabled:opacity-40 disabled:cursor-not-allowed"
);

const btnActive = "bg-[var(--color-oxygen-500)] text-white border-[var(--color-oxygen-500)] hover:bg-[var(--color-oxygen-600)]";

export function PaginationItems({ siblingCount = 1 }: { siblingCount?: number }) {
  const { page, totalPages, onPageChange } = useContext(PaginationContext);
  const pages = getPageNumbers(page, totalPages, siblingCount);
  return (
    <>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-[var(--fg-muted)] text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange({ page: p as number })}
            className={cn(btnBase, page === p && btnActive)}
            aria-current={page === p ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}
    </>
  );
}

export function PaginationPrevTrigger() {
  const { page, onPageChange } = useContext(PaginationContext);
  return (
    <button
      onClick={() => onPageChange({ page: page - 1 })}
      disabled={page <= 1}
      className={cn(btnBase)}
      aria-label="Previous page"
    >
      <ChevronLeft size={16} className="rtl:rotate-180" />
    </button>
  );
}

export function PaginationNextTrigger() {
  const { page, totalPages, onPageChange } = useContext(PaginationContext);
  return (
    <button
      onClick={() => onPageChange({ page: page + 1 })}
      disabled={page >= totalPages}
      className={cn(btnBase)}
      aria-label="Next page"
    >
      <ChevronRight size={16} className="rtl:rotate-180" />
    </button>
  );
}

interface PaginationPageTextProps {
  format?: "short" | "long";
  color?: string;
  fontSize?: string;
  className?: string;
}

export function PaginationPageText({ format = "short" }: PaginationPageTextProps) {
  const { page, totalPages, count, pageSize } = useContext(PaginationContext);
  const { t } = useTranslation("layout");
  const start = Math.min((page - 1) * pageSize + 1, count);
  const end = Math.min(page * pageSize, count);
  
  if (format === "long") {
    return (
      <span className="text-sm text-[var(--fg-muted)] flex items-center gap-1">
        <bdi>{start}–{end}</bdi>
        <span>{t("pagination.of")}</span>
        <bdi>{count}</bdi>
      </span>
    );
  }

  return (
    <span className="text-sm text-[var(--fg-muted)] flex items-center gap-1">
      <span>{t("pagination.page")}</span>
      <bdi>{page}</bdi>
      <span>/</span>
      <bdi>{totalPages}</bdi>
    </span>
  );
}
