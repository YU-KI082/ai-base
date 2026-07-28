export const LOCALES = ["en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value?: string | null): Locale {
  if (value && isLocale(value)) return value;
  return DEFAULT_LOCALE;
}

export type Dictionary = {
  common: {
    appName: string;
    loading: string;
    save: string;
    cancel: string;
    approve: string;
    reject: string;
    search: string;
    language: string;
  };
  admin: {
    dashboard: string;
    drafts: string;
    agents: string;
    workflows: string;
    tools: string;
    logs: string;
    settings: string;
    pendingApprovals: string;
    approveDraft: string;
    rejectDraft: string;
    comment: string;
    noItems: string;
  };
};

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    common: {
      appName: "AI BASE",
      loading: "Loading…",
      save: "Save",
      cancel: "Cancel",
      approve: "Approve",
      reject: "Reject",
      search: "Search",
      language: "Language",
    },
    admin: {
      dashboard: "Dashboard",
      drafts: "Drafts",
      agents: "Agents",
      workflows: "Workflows",
      tools: "Tools",
      logs: "Logs",
      settings: "Settings",
      pendingApprovals: "Pending approvals",
      approveDraft: "Approve draft",
      rejectDraft: "Reject draft",
      comment: "Comment",
      noItems: "No items",
    },
  },
  ja: {
    common: {
      appName: "AI BASE",
      loading: "読み込み中…",
      save: "保存",
      cancel: "キャンセル",
      approve: "承認",
      reject: "却下",
      search: "検索",
      language: "言語",
    },
    admin: {
      dashboard: "ダッシュボード",
      drafts: "下書き",
      agents: "エージェント",
      workflows: "ワークフロー",
      tools: "ツール",
      logs: "ログ",
      settings: "設定",
      pendingApprovals: "承認待ち",
      approveDraft: "下書きを承認",
      rejectDraft: "下書きを却下",
      comment: "コメント",
      noItems: "項目がありません",
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
