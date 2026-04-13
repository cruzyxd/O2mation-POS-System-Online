import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe as LuGlobe, Palette as LuPalette, Accessibility as LuAccessibility, Keyboard as LuKeyboard, Sun as LuSun, Moon as LuMoon } from "lucide-react";
import { SelectRoot, SelectTrigger } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import type { SupportedLanguage } from "../../lib/constants";
import { useLocale } from "../../store/locale.store";
import { type CheckoutCompletionKey, type FontSizeOption, usePreferences } from "../../store/preferences.store";
import { useColorMode } from "../../components/ui/color-mode";
import { cn } from "@/lib/cn";

function isFontSizeOption(value: string): value is FontSizeOption {
  return value === "small" || value === "default" || value === "large" || value === "xLarge" || value === "xxLarge" || value === "xxxLarge";
}

function isCheckoutCompletionKey(value: string | null): value is CheckoutCompletionKey {
  return typeof value === "string" && value.length > 0;
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start mb-6">
      <div className="p-3 bg-[var(--nav-active-bg)] text-[var(--nav-active-color)] rounded-xl flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-[var(--fg-heading)]">{title}</p>
        <p className="text-sm text-[var(--fg-muted)] mt-1">{description}</p>
      </div>
    </div>
  );
}

export function PreferencesTab() {
  const { t } = useTranslation("settings");
  const { language, setLanguage } = useLocale();
  const {
    fontSize,
    setFontSize,
    checkoutCompletionKey,
    setCheckoutCompletionKey,
    requireManualTendered,
    setRequireManualTendered,
  } = usePreferences();
  const { colorMode, setColorMode } = useColorMode();

  const isLight = colorMode === "light";
  const isDark = colorMode === "dark";

  const fontSizesCollection = {
    items: [
      { label: t("preferences.fontSizes.small"), value: "small" },
      { label: t("preferences.fontSizes.default"), value: "default" },
      { label: t("preferences.fontSizes.large"), value: "large" },
      { label: t("preferences.fontSizes.xLarge"), value: "xLarge" },
      { label: t("preferences.fontSizes.xxLarge"), value: "xxLarge" },
      { label: t("preferences.fontSizes.xxxLarge"), value: "xxxLarge" },
    ],
  };

  const languagesCollection = {
    items: [
      { label: t("preferences.languages.english"), value: "en" },
      { label: t("preferences.languages.arabic"), value: "ar" },
    ],
  };

  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!isRecording) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCheckoutCompletionKey(e.key);
      setIsRecording(false);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isRecording, setCheckoutCompletionKey]);

  return (
    <div className="flex flex-col gap-10">
      {/* Language */}
      <div>
        <SectionHeader
          icon={<LuGlobe size={20} />}
          title={t("preferences.languagesTitle")}
          description={t("preferences.languagesDescription")}
        />
        <div className="ps-16">
          <p className="text-sm font-semibold text-[var(--fg-muted)] mb-3">{t("preferences.languageLabel")}</p>
          <div className="max-w-sm">
            <SelectRoot
              collection={languagesCollection}
              value={[language]}
              onValueChange={(e) => {
                if (e.value[0]) void setLanguage(e.value[0] as SupportedLanguage);
              }}
            >
              <SelectTrigger />
            </SelectRoot>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div>
        <SectionHeader
          icon={<LuPalette size={20} />}
          title={t("preferences.appearanceTitle")}
          description={t("preferences.appearanceDescription")}
        />
        <div className="ps-16 flex gap-4">
          {/* Light Mode */}
          <button
            onClick={() => setColorMode("light")}
            className={cn(
              "flex-1 p-4 border rounded-xl transition-all duration-200 text-start relative",
              isLight
                ? "border-[var(--color-oxygen-500)] bg-[var(--nav-active-bg)]"
                : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--fg-subtle)]"
            )}
          >
            <span
              className={cn(
                "absolute top-4 end-4 w-4 h-4 rounded-full",
                isLight ? "bg-[var(--color-oxygen-500)]" : "border-2 border-[var(--fg-subtle)]"
              )}
            />
            <LuSun size={20} className="text-[var(--fg-default)] mb-2" />
            <p className="font-bold text-sm text-[var(--fg-heading)] mb-1">{t("preferences.lightMode")}</p>
            <p className="text-xs text-[var(--fg-muted)]">{t("preferences.lightModeDesc")}</p>
          </button>

          {/* Dark Mode */}
          <button
            onClick={() => setColorMode("dark")}
            className={cn(
              "flex-1 p-4 border rounded-xl transition-all duration-200 text-start relative",
              isDark
                ? "border-[var(--color-oxygen-500)] bg-[var(--nav-active-bg)]"
                : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--fg-subtle)]"
            )}
          >
            <span
              className={cn(
                "absolute top-4 end-4 w-4 h-4 rounded-full",
                isDark ? "bg-[var(--color-oxygen-500)]" : "border-2 border-[var(--fg-subtle)]"
              )}
            />
            <LuMoon size={20} className="text-[var(--fg-default)] mb-2" />
            <p className="font-bold text-sm text-[var(--fg-heading)] mb-1">{t("preferences.darkMode")}</p>
            <p className="text-xs text-[var(--fg-muted)]">{t("preferences.darkModeDesc")}</p>
          </button>
        </div>
      </div>

      {/* Accessibility */}
      <div>
        <SectionHeader
          icon={<LuAccessibility size={20} />}
          title={t("preferences.accessibilityTitle")}
          description={t("preferences.accessibilityDescription")}
        />
        <div className="ps-16">
          <p className="text-sm font-semibold text-[var(--fg-muted)] mb-3">{t("preferences.fontSizeLabel")}</p>
          <div className="max-w-sm">
            <SelectRoot
              collection={fontSizesCollection}
              value={[fontSize]}
              onValueChange={(e) => {
                const v = e.value[0];
                if (v && isFontSizeOption(v)) setFontSize(v);
              }}
            >
              <SelectTrigger />
            </SelectRoot>
          </div>
        </div>
      </div>

      {/* Checkout */}
      <div>
        <SectionHeader
          icon={<LuKeyboard size={20} />}
          title={t("preferences.checkoutTitle")}
          description={t("preferences.checkoutDescription")}
        />
        <div className="ps-16 flex flex-col gap-5">
          <div className="max-w-sm">
            <p className="text-sm font-semibold text-[var(--fg-muted)] mb-3">{t("preferences.completionKeyLabel")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsRecording(true)}
                className={cn(
                  "flex-1 px-4 py-2 border rounded-xl transition-all duration-200 text-sm font-medium",
                  isRecording
                    ? "border-[var(--color-oxygen-500)] bg-[var(--nav-active-bg)] text-[var(--color-oxygen-600)]"
                    : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--fg-subtle)] text-[var(--fg-default)]"
                )}
              >
                {isRecording ? t("preferences.completionKeyRecording") : checkoutCompletionKey.toUpperCase()}
              </button>
              <button
                onClick={() => setCheckoutCompletionKey("Shift")}
                className="px-4 py-2 border border-[var(--border-default)] rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-[var(--fg-muted)]"
              >
                {t("preferences.completionKeyReset")}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 max-w-2xl">
            <Switch
              checked={requireManualTendered}
              onCheckedChange={(details) => setRequireManualTendered(details.checked)}
            >
              <span className="text-sm font-semibold text-[var(--fg-heading)]">{t("preferences.manualTenderedLabel")}</span>
            </Switch>
            <p className="text-xs text-[var(--fg-muted)] mt-2 ps-13">{t("preferences.manualTenderedDescription")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
