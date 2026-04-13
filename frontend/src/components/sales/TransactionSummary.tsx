import { useTranslation } from "react-i18next";
import { centsToMoney, moneyToCents, roundMoney } from "../../lib/money";
import type { CheckoutTransactionSummary } from "../../types/sales.types";

interface TransactionSummaryProps {
    summary: CheckoutTransactionSummary;
    requireManualTendered: boolean;
    onTenderedChange: (amount: number) => void;
    onComplete: () => void;
}

export function TransactionSummary({ summary, requireManualTendered, onTenderedChange, onComplete }: TransactionSummaryProps) {
    const { t } = useTranslation("sales");

    const totalCents = moneyToCents(summary.total);
    const tenderedCents = moneyToCents(summary.amountTendered);
    const effectiveTenderedCents = requireManualTendered ? tenderedCents : totalCents;
    const changeToGive = centsToMoney(Math.max(0, effectiveTenderedCents - totalCents));
    const isSufficient = requireManualTendered
        ? tenderedCents >= totalCents && totalCents > 0
        : totalCents > 0;

    return (
        <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-default)] p-6 flex flex-col h-full">
            <h2 className="text-[22px] font-bold text-[var(--fg-heading)] mb-6 tracking-tight">
                {t("summary.title")}
            </h2>

            {/* Totals Setup */}
            <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-[15px] font-medium text-[var(--fg-subtle)]">
                    <span>{t("summary.subtotal")}</span>
                    <span>${roundMoney(summary.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[15px] font-medium text-[var(--fg-subtle)]">
                    <span>{t("summary.tax", { rate: summary.taxRate })}</span>
                    <span>${roundMoney(summary.taxAmount).toFixed(2)}</span>
                </div>
            </div>

            <hr className="border-[var(--border-default)] mb-6" />

            {/* Grand Total */}
            <div className="flex justify-between items-center mb-8">
                <span className="text-[17px] font-bold text-[var(--fg-heading)]">{t("summary.total")}</span>
                <span className="text-[28px] font-bold text-[#0e793c] tracking-tight">
                    ${roundMoney(summary.total).toFixed(2)}
                </span>
            </div>

            {/* Amount Tendered Input */}
            <div className="mb-6">
                <label className="block text-[11px] font-bold text-[var(--fg-subtle)] uppercase tracking-wider mb-2">
                    {t("summary.amountTendered")}
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] font-bold text-lg pointer-events-none">
                        $
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={roundMoney(summary.amountTendered) || ""}
                        onChange={(e) => {
                            if (!requireManualTendered) {
                                return;
                            }
                            onTenderedChange(parseFloat(e.target.value) || 0);
                        }}
                        disabled={!requireManualTendered}
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--fg-heading)] text-lg font-bold rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-500)] focus:border-[var(--color-oxygen-500)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        placeholder="0.00"
                    />
                </div>
                <p className="text-xs text-[var(--fg-subtle)] mt-2">
                    {requireManualTendered ? t("summary.manualTenderedHint") : t("summary.autoTenderedHint")}
                </p>
            </div>

            {/* Change to Give Callout */}
            <div className="bg-[var(--table-row-selected)] border border-[var(--color-oxygen-200)] dark:border-[var(--color-oxygen-800)] rounded-xl p-4 flex justify-between items-center mb-8">
                <span className="text-[15px] font-semibold text-black dark:text-white">{t("summary.change")}</span>
                <span className="text-[20px] font-bold text-black dark:text-white">
                    ${changeToGive.toFixed(2)}
                </span>
            </div>

            {/* Complete Button */}
            <button
                onClick={onComplete}
                disabled={!isSufficient}
                className="w-full bg-[var(--color-oxygen-700)] hover:bg-[var(--color-oxygen-800)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--fg-muted)] disabled:cursor-not-allowed text-white font-bold text-[16px] rounded-xl py-4 transition-colors flex items-center justify-center gap-2 mt-auto"
            >
                <span>{t("summary.complete")}</span>
                <div className="bg-white/20 rounded-full p-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            </button>
        </div>
    );
}
