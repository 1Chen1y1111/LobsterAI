import { useMemo, useRef, useState } from "react";

import { i18nService, LanguageType } from "@/services/i18n";

import {
  XMarkIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  TrashIcon,
  PencilIcon,
  SignalIcon,
  CheckCircleIcon,
  XCircleIcon,
  CubeIcon,
  ChatBubbleLeftIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

import BrainIcon from "./icons/BrainIcon";
import ShortcutsIcon from "./icons/ShortcutsIcon";
import ErrorMessage from "./ErrorMessage";
import ThemedSelect from "./ui/ThemedSelect";
import { themeService } from "@/services/theme";
import LightAppearance from "./icons/appearance/LightAppearance";
import DarkAppearance from "./icons/appearance/DarkAppearance";
import SystemAppearance from "./icons/appearance/SystemAppearance";

type TabType =
  | "general"
  | "model"
  | "coworkSandbox"
  | "coworkMemory"
  | "shortcuts"
  | "im"
  | "email"
  | "about";

export type SettingsOpenOptions = {
  initialTab?: TabType;
  notice?: string;
};

interface SettingsProps extends SettingsOpenOptions {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ initialTab, notice, onClose }) => {
  // 状态
  const [activeTab, setActiveTab] = useState<TabType>(initialTab ?? "general");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [language, setLanguage] = useState<LanguageType>("zh");
  const [autoLaunch, setAutoLaunchState] = useState(false);
  const [isUpdatingAutoLaunch, setIsUpdatingAutoLaunch] = useState(false);
  const [useSystemProxy, setUseSystemProxy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(
    notice ?? null,
  );

  // 创建引用来确保内容区域的滚动
  const contentRef = useRef<HTMLDivElement>(null);

  // State for model editing
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [isEditingModel, setIsEditingModel] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newModelSupportsImage, setNewModelSupportsImage] = useState(false);
  const [modelFormError, setModelFormError] = useState<string | null>(null);

  // 渲染标签页
  const sidebarTabs: { key: TabType; label: string; icon: React.ReactNode }[] =
    useMemo(
      () => [
        {
          key: "general",
          label: i18nService.t("general"),
          icon: <Cog6ToothIcon className="h-5 w-5" />,
        },
        {
          key: "model",
          label: i18nService.t("model"),
          icon: <CubeIcon className="h-5 w-5" />,
        },
        {
          key: "im",
          label: i18nService.t("imBot"),
          icon: <ChatBubbleLeftIcon className="h-5 w-5" />,
        },
        {
          key: "email",
          label: i18nService.t("emailTab"),
          icon: <EnvelopeIcon className="h-5 w-5" />,
        },
        {
          key: "coworkMemory",
          label: i18nService.t("coworkMemoryTitle"),
          icon: <BrainIcon className="h-5 w-5" />,
        },
        {
          key: "coworkSandbox",
          label: i18nService.t("coworkSandbox"),
          icon: <ShieldCheckIcon className="h-5 w-5" />,
        },
        {
          key: "shortcuts",
          label: i18nService.t("shortcuts"),
          icon: <ShortcutsIcon className="h-5 w-5" />,
        },
        {
          key: "about",
          label: i18nService.t("about"),
          icon: <InformationCircleIcon className="h-5 w-5" />,
        },
      ],
      [language],
    );

  const activeTabLabel = useMemo(() => {
    return sidebarTabs.find((t) => t.key === activeTab)?.label ?? "";
  }, [activeTab, sidebarTabs]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-8">
            {/* Language Section */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium dark:text-claude-darkText text-claude-text">
                {i18nService.t("language")}
              </h4>
              <div className="w-[140px] shrink-0">
                <ThemedSelect
                  id="language"
                  value={language}
                  onChange={(value) => {
                    const nextLanguage = value as LanguageType;
                    setLanguage(nextLanguage);
                    i18nService.setLanguage(nextLanguage, { persist: false });
                  }}
                  options={[
                    { value: "zh", label: i18nService.t("chinese") },
                    { value: "en", label: i18nService.t("english") },
                  ]}
                />
              </div>
            </div>

            {/* Auto-launch Section */}
            <div>
              <h4 className="text-sm font-medium dark:text-claude-darkText text-claude-text mb-3">
                {i18nService.t("autoLaunch")}
              </h4>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm dark:text-claude-darkSecondaryText text-claude-secondaryText">
                  {i18nService.t("autoLaunchDescription")}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoLaunch}
                  onClick={async () => {
                    if (isUpdatingAutoLaunch) return;
                    const next = !autoLaunch;
                    setIsUpdatingAutoLaunch(true);
                    try {
                      const result = await window.electron.autoLaunch.set(next);
                      if (result.success) {
                        setAutoLaunchState(next);
                      } else {
                        setError(
                          result.error ||
                            "Failed to update auto-launch setting",
                        );
                      }
                    } catch (err) {
                      console.error("Failed to set auto-launch:", err);
                      setError("Failed to update auto-launch setting");
                    } finally {
                      setIsUpdatingAutoLaunch(false);
                    }
                  }}
                  disabled={isUpdatingAutoLaunch}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                    isUpdatingAutoLaunch ? "opacity-50 cursor-not-allowed" : ""
                  } ${
                    autoLaunch
                      ? "bg-claude-accent"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoLaunch ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* System proxy Section */}
            <div>
              <h4 className="text-sm font-medium dark:text-claude-darkText text-claude-text mb-3">
                {i18nService.t("useSystemProxy")}
              </h4>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm dark:text-claude-darkSecondaryText text-claude-secondaryText">
                  {i18nService.t("useSystemProxyDescription")}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useSystemProxy}
                  onClick={() => {
                    setUseSystemProxy((prev) => !prev);
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                    useSystemProxy
                      ? "bg-claude-accent"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useSystemProxy ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Appearance Section */}
            <div>
              <h4 className="text-sm font-medium dark:text-claude-darkText text-claude-text mb-3">
                {i18nService.t("appearance")}
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: "light" as const, label: i18nService.t("light") },
                  { value: "dark" as const, label: i18nService.t("dark") },
                  { value: "system" as const, label: i18nService.t("system") },
                ].map((option) => {
                  const isSelected = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setTheme(option.value);
                        themeService.setTheme(option.value);
                      }}
                      className={`flex flex-col items-center rounded-xl border-2 p-3 transition-colors cursor-pointer ${
                        isSelected
                          ? "border-claude-accent bg-claude-accent/5 dark:bg-claude-accent/10"
                          : "dark:border-claude-darkBorder border-claude-border hover:border-claude-accent/50 dark:hover:border-claude-accent/50"
                      }`}
                    >
                      {option.value === "light" && <LightAppearance />}
                      {option.value === "dark" && <DarkAppearance />}
                      {option.value === "system" && <SystemAppearance />}

                      <span
                        className={`text-xs font-medium ${
                          isSelected
                            ? "text-claude-accent"
                            : "dark:text-claude-darkText text-claude-text"
                        }`}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // 阻止点击设置窗口时事件传播到背景
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 标签页切换处理
  const handleTabChange = (tab: TabType) => {
    if (tab !== "model") {
      setIsAddingModel(false);
      setIsEditingModel(false);
      setEditingModelId(null);
      setNewModelName("");
      setNewModelId("");
      setNewModelSupportsImage(false);
      setModelFormError(null);
    }
    setActiveTab(tab);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <div
      className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="flex w-[900px] h-[80vh] rounded-2xl dark:border-claude-darkBorder border-claude-border border shadow-modal overflow-hidden modal-content"
        onClick={handleSettingsClick}
      >
        {/* Left sidebar */}
        <div className="w-[220px] shrink-0 flex flex-col dark:bg-claude-darkSurfaceMuted bg-claude-surfaceMuted border-r dark:border-claude-darkBorder border-claude-border rounded-l-2xl overflow-y-auto">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-lg font-semibold dark:text-claude-darkText text-claude-text">
              settings
            </h2>
          </div>
          <nav className="flex flex-col gap-0.5 px-3 pb-4">
            {sidebarTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === tab.key
                    ? "bg-claude-accent/10 text-claude-accent"
                    : "dark:text-claude-darkTextSecondary text-claude-textSecondary dark:hover:text-claude-darkText hover:text-claude-text dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden dark:bg-claude-darkBg bg-claude-bg rounded-r-2xl">
          {/* Content header */}
          <div className="flex justify-between items-center px-6 pt-5 pb-3 shrink-0">
            <h3 className="text-lg font-semibold dark:text-claude-darkText text-claude-text">
              {activeTabLabel}
            </h3>
            <button
              onClick={onClose}
              className="dark:text-claude-darkTextSecondary text-claude-textSecondary dark:hover:text-claude-darkText hover:text-claude-text p-1.5 dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {noticeMessage && (
            <div className="px-6">
              <ErrorMessage
                message={noticeMessage}
                onClose={() => setNoticeMessage(null)}
              />
            </div>
          )}

          {error && (
            <div className="px-6">
              <ErrorMessage message={error} onClose={() => setError(null)} />
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-hidden"
          >
            {/* Tab content */}
            <div ref={contentRef} className="px-6 py-4 flex-1 overflow-y-auto">
              {renderTabContent()}
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end space-x-4 p-4 dark:border-claude-darkBorder border-claude-border border-t dark:bg-claude-darkBg bg-claude-bg shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 dark:text-claude-darkText text-claude-text dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover rounded-xl transition-colors text-sm font-medium border dark:border-claude-darkBorder border-claude-border active:scale-[0.98]"
              >
                {i18nService.t("cancel")}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-claude-accent hover:bg-claude-accentHover text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isSaving ? i18nService.t("saving") : i18nService.t("save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
