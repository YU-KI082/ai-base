export const LOCALES = ["ja", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Japanese-first. Only switch default when NEXT_PUBLIC_DEFAULT_LOCALE=en. */
export const DEFAULT_LOCALE: Locale =
  process.env.NEXT_PUBLIC_DEFAULT_LOCALE === "en" ? "en" : "ja";

export const BCP47: Record<Locale, string> = {
  ja: "ja-JP",
  en: "en-US",
};

export const TIMEZONE = "Asia/Tokyo";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value?: string | null): Locale {
  if (value && isLocale(value)) return value;
  return DEFAULT_LOCALE;
}

/** Track missing keys in non-production for detection. */
const missingKeys = new Set<string>();

export function getMissingTranslationKeys(): string[] {
  return [...missingKeys].sort();
}

export function clearMissingTranslationKeys(): void {
  missingKeys.clear();
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
    confirm: string;
    delete: string;
    edit: string;
    create: string;
    back: string;
    next: string;
    previous: string;
    success: string;
    error: string;
    empty: string;
    status: string;
    all: string;
    details: string;
    close: string;
    refresh: string;
    yes: string;
    no: string;
  };
  status: {
    draft: string;
    pending: string;
    approved: string;
    rejected: string;
    published: string;
    ready: string;
    building: string;
    pendingApproval: string;
    scheduled: string;
    failed: string;
    retry: string;
  };
  public: {
    navTools: string;
    navCategories: string;
    navCompare: string;
    navSearch: string;
    footerTagline: string;
    homeEyebrow: string;
    homeSupport: string;
    browseTools: string;
    searchCta: string;
    homeDescription: string;
    toolsTitle: string;
    toolsDescription: string;
    toolsEmpty: string;
    allCategories: string;
    featured: string;
    categoriesTitle: string;
    categoriesDescription: string;
    categoriesEmpty: string;
    categoryTools: string;
    searchTitle: string;
    searchDescription: string;
    searchPlaceholder: string;
    searchEmpty: string;
    searchSubmit: string;
    compareTitle: string;
    compareDescription: string;
    compareSubmit: string;
    compareEmpty: string;
    comparePickTools: string;
    backToTools: string;
    visitWebsite: string;
    features: string;
    pros: string;
    cons: string;
    faq: string;
    compareWith: string;
    freePlan: string;
    pricing: string;
    notFound: string;
    switchToEn: string;
    switchToJa: string;
    siteTitle: string;
    compareField: string;
    compareTable: string;
    compareCurated: string;
    compareSelectMin: string;
    compareSubtitle: string;
    summary: string;
    cta: string;
    recommendation: string;
    openCompareTable: string;
    toolSlot: string;
    toolsCount: string;
    categoryToolsEmpty: string;
    categoriesIntro: string;
    api: string;
    vsPrefix: string;
    toolFallbackDescription: string;
    overview: string;
    languages: string;
    useCases: string;
    recommendedUsers: string;
    pricingPlan: string;
    similarTools: string;
    tags: string;
    officialSite: string;
    affiliateCta: string;
    breadcrumbHome: string;
    navArticles: string;
    articlesTitle: string;
    articlesDescription: string;
    articlesEmpty: string;
    adminSignIn: string;
    adminSignInBody: string;
    adminSignInDevHint: string;
    backHome: string;
    visitShort: string;
    available: string;
    unavailable: string;
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
    ingest: string;
    affiliate: string;
    social: string;
    snsLearning: string;
    marketplace: string;
    publicSite: string;
    adminLabel: string;
    ops: string;
    dashboardSubtitle: string;
    manualIngest: string;
    affiliateLinks: string;
    socialDrafts: string;
    socialTitle: string;
    socialSubtitle: string;
    socialEmpty: string;
    markReady: string;
    markPublished: string;
    affiliateTitle: string;
    affiliateSubtitle: string;
    affiliateKicker: string;
    syncNow: string;
    rescanAgents: string;
    recordConversion: string;
    addTrackingLink: string;
    cases: string;
    clicks: string;
    conversions: string;
    salesReward: string;
    overallCvr: string;
    overallEpc: string;
    officialSite: string;
    hasAffiliate: string;
    reward: string;
    cookie: string;
    conversionTerms: string;
    appliedAt: string;
    approvedAt: string;
    snsTitle: string;
    snsSubtitle: string;
    snsKicker: string;
    runLearningLoop: string;
    tabOverview: string;
    tabTrends: string;
    tabPatterns: string;
    tabExperiments: string;
    tabRecommendations: string;
    tabPosts: string;
    tabLearning: string;
    tabImprovements: string;
    trends: string;
    patterns: string;
    experiments: string;
    recommendations: string;
    learning: string;
    posts: string;
    improvements: string;
    activate: string;
    invalidate: string;
    accept: string;
    markRunning: string;
    abort: string;
    ingestMetrics: string;
    emptyTrends: string;
    emptyPatterns: string;
    emptyExperiments: string;
    emptyRecommendations: string;
    emptyPosts: string;
    emptyLearning: string;
    emptyImprovements: string;
    ownPostRanking: string;
    automationHint: string;
    failedRuns: string;
    agentsActiveCount: string;
    agentsEmpty: string;
    heartbeat: string;
    subscribeLabel: string;
    config: string;
    recentRuns: string;
    enable: string;
    disable: string;
    update: string;
    ingestDescription: string;
    fieldName: string;
    fieldHomepageUrl: string;
    fieldDescription: string;
    fieldCategoryHints: string;
    startPipeline: string;
    marketplaceSubtitle: string;
    marketplaceEmpty: string;
    notInstalled: string;
    permissionsShort: string;
    depsShort: string;
    permissions: string;
    dependencies: string;
    noneDeclared: string;
    none: string;
    optional: string;
    versions: string;
    latest: string;
    latestManifest: string;
    registerViaWorker: string;
    settingsLocales: string;
    activeLlmProvider: string;
    authMode: string;
    authProduction: string;
    authDevBypass: string;
    authUnconfigured: string;
    authOpsSecret: string;
    llmVendorHint: string;
    registeredProviders: string;
    apiKeysHint: string;
    workflowLabel: string;
    fieldTool: string;
    fieldLabel: string;
    fieldUrl: string;
    fieldNetwork: string;
    fieldPriority: string;
    addGoLink: string;
    promptPlays: string;
    promptAffiliateClicks: string;
    promptConversions: string;
    score: string;
    plays: string;
    predictedScore: string;
    rewardPrompt: string;
    invalidAmount: string;
    opsSecret: string;
    signIn: string;
    signOut: string;
    oauthConnections: string;
    oauthConnectionsHint: string;
    oauthConnect: string;
    oauthReconnect: string;
    oauthRefreshNow: string;
    oauthValidate: string;
    oauthDisconnect: string;
    oauthRunRefresh: string;
    oauthRefreshQueued: string;
    oauthReauthNeeded: string;
    oauthReauthBanner: string;
    oauthEnvMissing: string;
    oauthConnectedFlash: string;
    opsDashboard: string;
    opsDashboardSubtitle: string;
    opsTodaySales: string;
    opsMonthSales: string;
    opsMonthProfit: string;
    opsConversions: string;
    opsTopTool: string;
    opsTopPost: string;
    opsHealth: string;
    opsCriticalAlerts: string;
    opsSafety: string;
    opsEmergencyStop: string;
    opsEmergencyOn: string;
    opsResume: string;
    opsRunTick: string;
    opsMode: string;
    opsModeFullAuto: string;
    opsModeApproval: string;
    opsModeDraftOnly: string;
    opsDailyLimit: string;
    opsRampHint: string;
    opsAckAlert: string;
    selfHealing: string;
    selfHealingTitle: string;
    selfHealingSubtitle: string;
    selfHealingCurrentErrors: string;
    selfHealingDetectedAt: string;
    selfHealingLocation: string;
    selfHealingCause: string;
    selfHealingSeverity: string;
    selfHealingStatus: string;
    selfHealingAttempts: string;
    selfHealingChangedFiles: string;
    selfHealingTestResults: string;
    selfHealingRollback: string;
    selfHealingNeedsApproval: string;
    selfHealingHistory: string;
    selfHealingEmergencyStop: string;
    selfHealingResume: string;
    selfHealingRunTick: string;
    selfHealingApprove: string;
    selfHealingReject: string;
    selfHealingAck: string;
    articles: string;
    categories: string;
    addTool: string;
    editTool: string;
    deleteTool: string;
    generateArticle: string;
  };
};

const ja: Dictionary = {
  common: {
    appName: "AI BASE",
    loading: "読み込み中…",
    save: "保存",
    cancel: "キャンセル",
    approve: "承認",
    reject: "却下",
    search: "検索",
    language: "言語",
    confirm: "確認",
    delete: "削除",
    edit: "編集",
    create: "作成",
    back: "戻る",
    next: "次へ",
    previous: "前へ",
    success: "完了しました",
    error: "エラーが発生しました",
    empty: "データがありません",
    status: "ステータス",
    all: "すべて",
    details: "詳細",
    close: "閉じる",
    refresh: "更新",
    yes: "はい",
    no: "いいえ",
  },
  status: {
    draft: "下書き",
    pending: "審査中",
    approved: "承認済み",
    rejected: "却下",
    published: "公開済み",
    ready: "投稿準備完了",
    building: "生成中",
    pendingApproval: "承認待ち",
    scheduled: "予約投稿",
    failed: "失敗",
    retry: "再試行",
  },
  public: {
    navTools: "AIツール",
    navCategories: "カテゴリー",
    navCompare: "比較",
    navSearch: "検索",
    footerTagline:
      "エージェントが継続評価し、人が承認して公開するAIツールメディア",
    homeEyebrow: "AI運営のメディア",
    homeSupport:
      "AIツールを発見・比較・導入。エージェントが継続評価し、人が承認して公開します。",
    browseTools: "AIツールを見る",
    searchCta: "検索する",
    homeDescription:
      "AIツールを発見・比較・導入。エージェントが継続評価し、人が承認して公開します。",
    toolsTitle: "AIツール一覧",
    toolsDescription: "エージェントが評価し、人が承認したAIツールを探す",
    toolsEmpty: "公開中のAIツールはまだありません",
    allCategories: "すべて",
    featured: "注目のAIツール",
    categoriesTitle: "カテゴリー",
    categoriesDescription: "用途別にAIツールを探す",
    categoriesEmpty: "カテゴリーがありません",
    categoryTools: "このカテゴリーのツール",
    searchTitle: "検索",
    searchDescription: "キーワードでAIツールを探す",
    searchPlaceholder: "ツール名や用途で検索",
    searchEmpty: "該当するツールが見つかりませんでした",
    searchSubmit: "検索",
    compareTitle: "AIツール比較",
    compareDescription: "気になるツールを並べて比較できます",
    compareSubmit: "比較する",
    compareEmpty: "比較するツールを選んでください",
    comparePickTools: "比較するツール",
    backToTools: "ツール一覧",
    visitWebsite: "公式サイトを開く",
    features: "できること",
    pros: "メリット",
    cons: "注意点",
    faq: "よくある質問",
    compareWith: "他のツールと比較",
    freePlan: "無料プランあり",
    pricing: "料金モデル",
    notFound: "ページが見つかりません",
    switchToEn: "English",
    switchToJa: "日本語",
    siteTitle: "AI BASE — AIツールを見つける",
    compareField: "項目",
    compareTable: "比較表",
    compareCurated: "公開中の比較記事",
    compareSelectMin: "ツールを2つ以上選んでください",
    compareSubtitle: "料金・機能・長所短所を横並びで確認できます。",
    summary: "概要",
    cta: "公式リンク",
    recommendation: "おすすめ",
    openCompareTable: "比較表を開く",
    toolSlot: "ツール {n}",
    toolsCount: "{n}件",
    categoryToolsEmpty: "このカテゴリーの公開ツールはまだありません",
    categoriesIntro: "用途・領域からAIツールを絞り込みます。",
    api: "API",
    vsPrefix: "vs ",
    toolFallbackDescription: "AI BASEで紹介するAIツール",
    overview: "概要",
    languages: "対応言語",
    useCases: "用途",
    recommendedUsers: "おすすめユーザー",
    pricingPlan: "料金プラン",
    similarTools: "類似AIツール",
    tags: "タグ",
    officialSite: "公式サイト",
    affiliateCta: "詳細・申し込み",
    breadcrumbHome: "ホーム",
    navArticles: "記事",
    articlesTitle: "AI活用記事",
    articlesDescription: "おすすめ・比較・使い方・ランキングなど、SEOを意識したガイド",
    articlesEmpty: "公開中の記事はまだありません",
    adminSignIn: "管理画面ログイン",
    adminSignInBody:
      "管理画面へ入るには ADMIN_OPS_SECRET を入力してください。本番では ADMIN_DEV_BYPASS は使えません。",
    adminSignInDevHint:
      "ローカル開発: NODE_ENV が production 以外のとき ADMIN_DEV_BYPASS=true を設定し、/admin を開いてください。",
    backHome: "← ホーム",
    visitShort: "公式へ",
    available: "あり",
    unavailable: "なし",
  },
  admin: {
    dashboard: "ダッシュボード",
    drafts: "下書き",
    agents: "エージェント",
    workflows: "ワークフロー",
    tools: "AIツール",
    logs: "ログ",
    settings: "設定",
    pendingApprovals: "承認待ち",
    approveDraft: "下書きを承認",
    rejectDraft: "下書きを却下",
    comment: "コメント",
    noItems: "項目がありません",
    ingest: "取り込み",
    affiliate: "アフィリエイト分析",
    social: "SNS投稿",
    snsLearning: "SNS学習",
    marketplace: "マーケットプレイス",
    publicSite: "公開サイトへ",
    adminLabel: "管理画面",
    ops: "運用",
    dashboardSubtitle:
      "承認・公開・アフィリエイト・SNS下書きをここから運用します。",
    manualIngest: "手動取り込み",
    affiliateLinks: "アフィリエイト",
    socialDrafts: "SNS下書き",
    socialTitle: "SNS投稿下書き",
    socialSubtitle:
      "投稿は管理者承認後に実行。Instagram/TikTokは初回OAuth連携後、トークン自動更新で運用します。",
    socialEmpty: "SNS下書きはまだありません。ツール公開後に生成されます。",
    markReady: "準備完了にする",
    markPublished: "公開済みにする",
    affiliateTitle: "アフィリエイト分析",
    affiliateSubtitle:
      "新規ツールは「アフィリエイト未確認」で登録。公式 / A8 / もしも / アクセストレード / バリューコマースを調査提案します。",
    affiliateKicker: "収益化",
    syncNow: "既存ツールを今すぐ同期",
    rescanAgents: "エージェント経由で再スキャン",
    recordConversion: "CV・売上を記録",
    addTrackingLink: "計測リンクを追加",
    cases: "案件",
    clicks: "クリック",
    conversions: "CV",
    salesReward: "売上 / 報酬",
    overallCvr: "全体CVR",
    overallEpc: "全体EPC",
    officialSite: "公式サイト",
    hasAffiliate: "アフィリエイト",
    reward: "報酬",
    cookie: "Cookie期間",
    conversionTerms: "成果条件",
    appliedAt: "申請日",
    approvedAt: "承認日",
    snsTitle: "SNS継続学習",
    snsSubtitle:
      "構造だけのトレンド分析 · 自社投稿実績を最優先 · 公開は人の承認 · スクレイピングなし",
    snsKicker: "学習ループ",
    runLearningLoop: "学習ループを実行",
    tabOverview: "概要",
    tabTrends: "トレンド",
    tabPatterns: "成功パターン",
    tabExperiments: "実験",
    tabRecommendations: "おすすめ",
    tabPosts: "投稿実績",
    tabLearning: "学習データ",
    tabImprovements: "改善履歴",
    trends: "トレンド",
    patterns: "成功パターン",
    experiments: "実験",
    recommendations: "おすすめ",
    learning: "学習データ",
    posts: "投稿",
    improvements: "改善履歴",
    activate: "有効化",
    invalidate: "無効化",
    accept: "採用",
    markRunning: "実行中にする",
    abort: "中止",
    ingestMetrics: "実績を取り込む",
    emptyTrends: "トレンド観測がありません",
    emptyPatterns: "成功パターンがありません",
    emptyExperiments: "実験がありません",
    emptyRecommendations: "おすすめがありません",
    emptyPosts: "投稿がありません",
    emptyLearning: "学習データがありません",
    emptyImprovements: "改善履歴がありません",
    ownPostRanking: "自社投稿ランキング（成約 → クリック → 再生）",
    automationHint:
      "自動: 分析 / 下書き / 採点 · 手動: 公開 · API接続後: 外部投稿",
    failedRuns: "失敗した実行",
    agentsActiveCount: "{active} 稼働 / {total}",
    agentsEmpty: "エージェントがまだ登録されていません。ワーカーを起動して登録してください。",
    heartbeat: "ハートビート",
    subscribeLabel: "購読",
    config: "設定",
    recentRuns: "最近の実行",
    enable: "有効化",
    disable: "無効化",
    update: "更新",
    ingestDescription:
      "ingest.manual.requested.v1 をアウトボックスへ投入します。Scout が受け取りパイプラインを開始します。",
    fieldName: "名前",
    fieldHomepageUrl: "公式サイトURL",
    fieldDescription: "説明",
    fieldCategoryHints: "カテゴリー候補（カンマ区切り）",
    startPipeline: "パイプラインを開始",
    marketplaceSubtitle:
      "エージェントプラグインの発見・インストール・有効化/無効化・更新。表示: free / paid / internal / community。",
    marketplaceEmpty:
      "パッケージがありません。エージェントワーカーを起動するとビルトインが自動登録されます。",
    notInstalled: "未インストール",
    permissionsShort: "権限",
    depsShort: "依存",
    permissions: "権限",
    dependencies: "依存関係",
    noneDeclared: "宣言なし",
    none: "なし",
    optional: "任意",
    versions: "バージョン",
    latest: "最新",
    latestManifest: "最新マニフェスト",
    registerViaWorker: "ワーカー起動時に登録",
    settingsLocales: "対応言語: ja, en",
    activeLlmProvider: "有効な LLM プロバイダ（環境変数）",
    authMode: "認証モード",
    authProduction: "production（セッション/Bearer）",
    authDevBypass: "dev_bypass",
    authUnconfigured: "未設定",
    authOpsSecret: "ops_secret（ADMIN_OPS_SECRET）",
    llmVendorHint:
      "エージェントは LLM ベンダー非依存です。LLM_PROVIDER またはエージェントごとの config.llmProvider で切り替えます。シークレットをエージェント設定 JSON に書かないでください。",
    registeredProviders: "登録済みプロバイダ",
    apiKeysHint:
      "APIキーは環境変数 / シークレットマネージャのみに置きます。UIには参照名だけを表示します。",
    workflowLabel: "ワークフロー",
    fieldTool: "ツール",
    fieldLabel: "ラベル",
    fieldUrl: "URL",
    fieldNetwork: "ASP / ネットワーク",
    fieldPriority: "優先度",
    addGoLink: "/go リンクを追加",
    promptPlays: "再生数（空欄 = null）",
    promptAffiliateClicks: "アフィリエイトクリック（空欄 = null）",
    promptConversions: "成約数（空欄 = null）",
    score: "スコア",
    plays: "再生",
    predictedScore: "予測スコア",
    rewardPrompt: "報酬額（円）",
    invalidAmount: "金額が不正です",
    opsSecret: "管理用シークレット",
    signIn: "ログイン",
    signOut: "ログアウト",
    oauthConnections: "SNS公式連携",
    oauthConnectionsHint:
      "初回のみ公式OAuthで許可。以降はトークンを暗号化保存し、期限前に自動更新します。ID/パスワードは保存しません。",
    oauthConnect: "公式OAuthで連携",
    oauthReconnect: "再認証する",
    oauthRefreshNow: "トークン更新",
    oauthValidate: "接続確認",
    oauthDisconnect: "連携解除",
    oauthRunRefresh: "期限前トークンを一括更新",
    oauthRefreshQueued: "トークン自動更新を実行・キューイングしました",
    oauthReauthNeeded: "再認証が必要です。公式OAuthから再度許可してください。",
    oauthReauthBanner:
      "SNS連携の再認証が必要です。権限解除・トークン失効・APIエラーを検知しました。",
    oauthEnvMissing: "アプリ認証情報（環境変数）が未設定です",
    oauthConnectedFlash: "の連携が完了しました",
    opsDashboard: "売上ダッシュボード",
    opsDashboardSubtitle: "日常は売上・成約・利益・重大異常だけを確認します。詳細分析は別画面へ。",
    opsTodaySales: "本日の売上",
    opsMonthSales: "今月の売上",
    opsMonthProfit: "今月の利益",
    opsConversions: "成約数（今月）",
    opsTopTool: "最も売れたAIツール",
    opsTopPost: "最も利益を生んだ投稿",
    opsHealth: "稼働状況",
    opsCriticalAlerts: "重大な異常",
    opsSafety: "安全装置・運用モード",
    opsEmergencyStop: "緊急停止",
    opsEmergencyOn: "緊急停止中",
    opsResume: "自動運用を再開",
    opsRunTick: "自動運用ティックを実行",
    opsMode: "運用モード",
    opsModeFullAuto: "完全自動",
    opsModeApproval: "承認制",
    opsModeDraftOnly: "下書きのみ",
    opsDailyLimit: "1日の投稿上限",
    opsRampHint: "初回は1日1投稿×7日テスト。問題なければ上限を段階的に増やせます。",
    opsAckAlert: "確認済みにする",
    selfHealing: "自動修復",
    selfHealingTitle: "Self-Healing Agent",
    selfHealingSubtitle: "実行時・ビルド・API・テスト失敗を検知し、安全な範囲だけ自動修復します。",
    selfHealingCurrentErrors: "現在のエラー",
    selfHealingDetectedAt: "検知日時",
    selfHealingLocation: "発生場所",
    selfHealingCause: "原因",
    selfHealingSeverity: "重要度",
    selfHealingStatus: "修正状況",
    selfHealingAttempts: "試行回数",
    selfHealingChangedFiles: "変更ファイル",
    selfHealingTestResults: "テスト結果",
    selfHealingRollback: "ロールバック結果",
    selfHealingNeedsApproval: "人間の承認が必要",
    selfHealingHistory: "修正履歴",
    selfHealingEmergencyStop: "緊急停止",
    selfHealingResume: "自動修復を再開",
    selfHealingRunTick: "修復サイクル実行",
    selfHealingApprove: "修正を承認して適用",
    selfHealingReject: "却下",
    selfHealingAck: "確認済み",
    articles: "記事",
    categories: "カテゴリー",
    addTool: "ツール追加",
    editTool: "編集",
    deleteTool: "削除",
    generateArticle: "記事を生成",
  },
};

const en: Dictionary = {
  common: {
    appName: "AI BASE",
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
    approve: "Approve",
    reject: "Reject",
    search: "Search",
    language: "Language",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    back: "Back",
    next: "Next",
    previous: "Previous",
    success: "Done",
    error: "Something went wrong",
    empty: "No data",
    status: "Status",
    all: "All",
    details: "Details",
    close: "Close",
    refresh: "Refresh",
    yes: "Yes",
    no: "No",
  },
  status: {
    draft: "Draft",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    published: "Published",
    ready: "Ready",
    building: "Building",
    pendingApproval: "Pending approval",
    scheduled: "Scheduled",
    failed: "Failed",
    retry: "Retry",
  },
  public: {
    navTools: "AI tools",
    navCategories: "Categories",
    navCompare: "Compare",
    navSearch: "Search",
    footerTagline:
      "AI tools continuously evaluated by agents, published with human approval",
    homeEyebrow: "AI-operated media",
    homeSupport:
      "Discover, compare, and adopt AI tools — continuously evaluated by agents, published with human approval.",
    browseTools: "Browse AI tools",
    searchCta: "Search",
    homeDescription:
      "Discover, compare, and adopt AI tools — continuously evaluated by agents, published with human approval.",
    toolsTitle: "AI tools",
    toolsDescription: "Discover AI tools evaluated by agents and approved by humans",
    toolsEmpty: "No published tools yet",
    allCategories: "All",
    featured: "Featured AI tools",
    categoriesTitle: "Categories",
    categoriesDescription: "Browse AI tools by use case",
    categoriesEmpty: "No categories yet",
    categoryTools: "Tools in this category",
    searchTitle: "Search",
    searchDescription: "Find AI tools by keyword",
    searchPlaceholder: "Search by name or use case",
    searchEmpty: "No matching tools",
    searchSubmit: "Search",
    compareTitle: "Compare AI tools",
    compareDescription: "Compare tools side by side",
    compareSubmit: "Compare",
    compareEmpty: "Pick tools to compare",
    comparePickTools: "Tools to compare",
    backToTools: "All tools",
    visitWebsite: "Visit website",
    features: "Features",
    pros: "Pros",
    cons: "Cons",
    faq: "FAQ",
    compareWith: "Compare with others",
    freePlan: "Free plan",
    pricing: "Pricing",
    notFound: "Not found",
    switchToEn: "English",
    switchToJa: "日本語",
    siteTitle: "AI BASE — Discover AI tools",
    compareField: "Field",
    compareTable: "Comparison table",
    compareCurated: "Published comparisons",
    compareSelectMin: "Select at least two tools",
    compareSubtitle: "See pricing, features, and tradeoffs side by side.",
    summary: "Summary",
    cta: "CTA",
    recommendation: "Recommendation",
    openCompareTable: "Open comparison table",
    toolSlot: "Tool {n}",
    toolsCount: "{n} tools",
    categoryToolsEmpty: "No published tools in this category yet",
    categoriesIntro: "Filter AI tools by use case and domain.",
    api: "API",
    vsPrefix: "vs ",
    toolFallbackDescription: "AI tool on AI BASE",
    overview: "Overview",
    languages: "Languages",
    useCases: "Use cases",
    recommendedUsers: "Best for",
    pricingPlan: "Pricing",
    similarTools: "Similar AI tools",
    tags: "Tags",
    officialSite: "Official site",
    affiliateCta: "Get started",
    breadcrumbHome: "Home",
    navArticles: "Articles",
    articlesTitle: "AI guides & rankings",
    articlesDescription: "Recommendations, comparisons, how-tos, and rankings built for SEO",
    articlesEmpty: "No published articles yet",
    adminSignIn: "Admin sign-in",
    adminSignInBody:
      "Enter ADMIN_OPS_SECRET to access the admin console. ADMIN_DEV_BYPASS is disabled in production.",
    adminSignInDevHint:
      "Local development: set ADMIN_DEV_BYPASS=true with NODE_ENV not equal to production, then open /admin.",
    backHome: "← Home",
    visitShort: "Visit",
    available: "Yes",
    unavailable: "No",
  },
  admin: {
    dashboard: "Dashboard",
    drafts: "Drafts",
    agents: "Agents",
    workflows: "Workflows",
    tools: "AI tools",
    logs: "Logs",
    settings: "Settings",
    pendingApprovals: "Pending approvals",
    approveDraft: "Approve draft",
    rejectDraft: "Reject draft",
    comment: "Comment",
    noItems: "No items",
    ingest: "Ingest",
    affiliate: "Affiliate intel",
    social: "Social",
    snsLearning: "SNS learning",
    marketplace: "Marketplace",
    publicSite: "Public site",
    adminLabel: "Admin",
    ops: "Ops",
    dashboardSubtitle:
      "Approve, publish, manage affiliates, and review social drafts.",
    manualIngest: "Manual ingest",
    affiliateLinks: "Affiliate",
    socialDrafts: "Social drafts",
    socialTitle: "Social drafts",
    socialSubtitle:
      "Posts run after admin approval. Instagram/TikTok use one-time OAuth then automatic token refresh.",
    socialEmpty: "No social posts yet. Publish a tool to generate drafts.",
    markReady: "Ready",
    markPublished: "Mark published",
    affiliateTitle: "Affiliate Intelligence",
    affiliateSubtitle:
      "New tools start as unconfirmed. AI proposes official / A8 / Moshimo / AccessTrade / ValueCommerce.",
    affiliateKicker: "Monetization",
    syncNow: "Sync existing tools now",
    rescanAgents: "Rescan via agents",
    recordConversion: "Record CV / sales",
    addTrackingLink: "Add tracking link",
    cases: "Cases",
    clicks: "Clicks",
    conversions: "CV",
    salesReward: "Sales / reward",
    overallCvr: "Overall CVR",
    overallEpc: "Overall EPC",
    officialSite: "Official site",
    hasAffiliate: "Affiliate",
    reward: "Reward",
    cookie: "Cookie window",
    conversionTerms: "Conversion terms",
    appliedAt: "Applied",
    approvedAt: "Approved",
    snsTitle: "SNS continuous learning",
    snsSubtitle:
      "Structure-only trends · own-post metrics first · human publish gate · no scraping",
    snsKicker: "Learning loop",
    runLearningLoop: "Run learning loop",
    tabOverview: "Overview",
    tabTrends: "Trends",
    tabPatterns: "Patterns",
    tabExperiments: "Experiments",
    tabRecommendations: "Recommendations",
    tabPosts: "Performance",
    tabLearning: "Learning",
    tabImprovements: "Improvements",
    trends: "Trends",
    patterns: "Patterns",
    experiments: "Experiments",
    recommendations: "Recommendations",
    learning: "Learning",
    posts: "Posts",
    improvements: "Improvements",
    activate: "Activate",
    invalidate: "Invalidate",
    accept: "Accept",
    markRunning: "Mark running",
    abort: "Abort",
    ingestMetrics: "Ingest metrics",
    emptyTrends: "No trend observations",
    emptyPatterns: "No patterns",
    emptyExperiments: "No experiments",
    emptyRecommendations: "No recommendations",
    emptyPosts: "No posts",
    emptyLearning: "No learning records",
    emptyImprovements: "No improvement logs",
    ownPostRanking: "Own-post ranking (conversions → clicks → plays)",
    automationHint:
      "Auto: analyze / draft / score · Manual: publish · After API: external post",
    failedRuns: "Failed runs",
    agentsActiveCount: "{active} active / {total}",
    agentsEmpty: "No agents registered yet. Start workers to register.",
    heartbeat: "Heartbeat",
    subscribeLabel: "Subscribed",
    config: "Config",
    recentRuns: "Recent runs",
    enable: "Enable",
    disable: "Disable",
    update: "Update",
    ingestDescription:
      "Emits ingest.manual.requested.v1 into the outbox. Scout picks it up and starts the pipeline.",
    fieldName: "Name",
    fieldHomepageUrl: "Homepage URL",
    fieldDescription: "Description",
    fieldCategoryHints: "Category hints (comma-separated)",
    startPipeline: "Start pipeline",
    marketplaceSubtitle:
      "Discover, install, enable/disable, and update agent plugins. Visibility: free / paid / internal / community.",
    marketplaceEmpty:
      "No packages yet. Start agent workers to auto-register builtin plugins.",
    notInstalled: "not installed",
    permissionsShort: "perms",
    depsShort: "deps",
    permissions: "Permissions",
    dependencies: "Dependencies",
    noneDeclared: "None declared",
    none: "None",
    optional: "optional",
    versions: "Versions",
    latest: "latest",
    latestManifest: "Latest manifest",
    registerViaWorker: "Register via worker boot",
    settingsLocales: "Locales: ja, en",
    activeLlmProvider: "Active LLM provider (env)",
    authMode: "Auth mode",
    authProduction: "production (session/bearer)",
    authDevBypass: "dev_bypass",
    authUnconfigured: "unconfigured",
    authOpsSecret: "ops_secret (ADMIN_OPS_SECRET)",
    llmVendorHint:
      "Agents are LLM-vendor agnostic. Switch via LLM_PROVIDER or per-agent config.llmProvider. Secrets must never be written into agent config JSON.",
    registeredProviders: "Registered providers",
    apiKeysHint:
      "API keys live only in the environment / secret manager. The UI lists reference names only.",
    workflowLabel: "Workflow",
    fieldTool: "Tool",
    fieldLabel: "Label",
    fieldUrl: "URL",
    fieldNetwork: "ASP / network",
    fieldPriority: "Priority",
    addGoLink: "Add /go link",
    promptPlays: "plays (empty = null)",
    promptAffiliateClicks: "affiliateClicks (empty = null)",
    promptConversions: "conversions (empty = null)",
    score: "score",
    plays: "plays",
    predictedScore: "pred",
    rewardPrompt: "Reward amount",
    invalidAmount: "Invalid amount",
    opsSecret: "Admin secret",
    signIn: "Sign in",
    signOut: "Sign out",
    oauthConnections: "SNS OAuth connections",
    oauthConnectionsHint:
      "One-time official OAuth consent. Tokens are encrypted at rest and auto-refreshed. Passwords are never stored.",
    oauthConnect: "Connect via OAuth",
    oauthReconnect: "Re-authenticate",
    oauthRefreshNow: "Refresh token",
    oauthValidate: "Validate",
    oauthDisconnect: "Disconnect",
    oauthRunRefresh: "Refresh due tokens",
    oauthRefreshQueued: "Token refresh ran and was queued",
    oauthReauthNeeded: "Re-authentication required. Complete official OAuth again.",
    oauthReauthBanner:
      "SNS re-authentication required. Revoked permissions, expired tokens, or API errors were detected.",
    oauthEnvMissing: "App credentials (env) are not configured",
    oauthConnectedFlash: " connected successfully",
    opsDashboard: "Revenue dashboard",
    opsDashboardSubtitle: "Check sales, conversions, profit, and critical alerts only. Details live elsewhere.",
    opsTodaySales: "Today sales",
    opsMonthSales: "Month sales",
    opsMonthProfit: "Month profit",
    opsConversions: "Conversions (month)",
    opsTopTool: "Best-selling AI tool",
    opsTopPost: "Highest-profit post",
    opsHealth: "Ops status",
    opsCriticalAlerts: "Critical alerts",
    opsSafety: "Safety & mode",
    opsEmergencyStop: "Emergency stop",
    opsEmergencyOn: "Emergency stop ON",
    opsResume: "Resume auto-ops",
    opsRunTick: "Run auto-ops tick",
    opsMode: "Mode",
    opsModeFullAuto: "Full auto",
    opsModeApproval: "Approval required",
    opsModeDraftOnly: "Draft only",
    opsDailyLimit: "Daily post limit",
    opsRampHint: "Start at 1 post/day for 7 days, then raise the cap gradually.",
    opsAckAlert: "Acknowledge",
    selfHealing: "Self-healing",
    selfHealingTitle: "Self-Healing Agent",
    selfHealingSubtitle: "Detect runtime, build, API, and test failures — auto-fix only within the safe allowlist.",
    selfHealingCurrentErrors: "Current errors",
    selfHealingDetectedAt: "Detected at",
    selfHealingLocation: "Location",
    selfHealingCause: "Cause",
    selfHealingSeverity: "Severity",
    selfHealingStatus: "Status",
    selfHealingAttempts: "Attempts",
    selfHealingChangedFiles: "Changed files",
    selfHealingTestResults: "Test results",
    selfHealingRollback: "Rollback result",
    selfHealingNeedsApproval: "Needs human approval",
    selfHealingHistory: "Healing history",
    selfHealingEmergencyStop: "Emergency stop",
    selfHealingResume: "Resume self-healing",
    selfHealingRunTick: "Run healing cycle",
    selfHealingApprove: "Approve & apply",
    selfHealingReject: "Reject",
    selfHealingAck: "Acknowledge",
    articles: "Articles",
    categories: "Categories",
    addTool: "Add tool",
    editTool: "Edit",
    deleteTool: "Delete",
    generateArticle: "Generate article",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { ja, en };

/** Deep-merge dictionaries so missing nested keys never yield undefined parents. */
function mergeDictionary(base: Dictionary, overlay: Dictionary): Dictionary {
  const mergeSection = <T extends Record<string, string>>(
    a: T,
    b: T | undefined,
  ): T => {
    const out = { ...a };
    if (!b) return out;
    for (const [k, v] of Object.entries(b)) {
      if (typeof v === "string" && v.length > 0) {
        (out as Record<string, string>)[k] = v;
      }
    }
    return out;
  };
  return {
    common: mergeSection(base.common, overlay.common),
    status: mergeSection(base.status, overlay.status),
    public: mergeSection(base.public, overlay.public),
    admin: mergeSection(base.admin, overlay.admin),
  };
}

/** Replace `{key}` placeholders in a translation string. */
export function tf(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`,
  );
}


/**
 * Always returns a complete Dictionary. Non-ja locales fill gaps from Japanese
 * so nested access like `dict.public.featured` never throws on undefined parents.
 */
export function getDictionary(locale: Locale): Dictionary {
  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const primary = dictionaries[resolved] ?? dictionaries[DEFAULT_LOCALE] ?? ja;
  if (resolved === "ja") return primary;
  return mergeDictionary(ja, primary);
}

/**
 * Resolve a dotted key. Falls back to Japanese, then the key itself.
 * Missing keys are recorded for detection.
 */
export function t(
  locale: Locale,
  path: string,
): string {
  const parts = path.split(".");
  const fromLocale = lookup(dictionaries[locale], parts);
  if (fromLocale != null) return fromLocale;
  const fromJa = lookup(dictionaries.ja, parts);
  if (fromJa != null) {
    missingKeys.add(`${locale}:${path}`);
    return fromJa;
  }
  missingKeys.add(`*:${path}`);
  return path;
}

function lookup(dict: unknown, parts: string[]): string | null {
  let cur: unknown = dict;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : null;
}

export function formatDate(
  value: Date | string | number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(BCP47[locale], {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  }).format(date);
}

export function formatDateTime(
  value: Date | string | number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return formatDate(value, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(
  amount: number,
  locale: Locale = DEFAULT_LOCALE,
  currency: "JPY" | "USD" = locale === "ja" ? "JPY" : "USD",
): string {
  return new Intl.NumberFormat(BCP47[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount);
}

export function formatNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(BCP47[locale], options).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(BCP47[locale], {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}

export function statusLabel(
  locale: Locale,
  raw: string,
): string {
  const dict = getDictionary(locale).status;
  const map: Record<string, string> = {
    draft: dict.draft,
    pending: dict.pending,
    pending_approval: dict.pendingApproval,
    approved: dict.approved,
    rejected: dict.rejected,
    published: dict.published,
    ready: dict.ready,
    building: dict.building,
    scheduled: dict.scheduled,
    failed: dict.failed,
    retry: dict.retry,
  };
  return map[raw] ?? raw;
}
