/**
 * Catalog of 100 published AI tools for public launch seed.
 * Affiliate: homepage as tracked `direct` link; optional `affiliateUrl` when ASP partner URL exists.
 */
export type SeedTool = {
  slug: string;
  homepageUrl: string;
  /** Prefer ASP / partner URL when set; else homepage. */
  affiliateUrl?: string;
  affiliateNetwork?: string;
  affiliateLabel?: string;
  pricingModel: "free" | "freemium" | "paid" | "enterprise";
  hasFreePlan: boolean;
  hasApi: boolean;
  categoryKey: string;
  en: {
    name: string;
    description: string;
    features: string[];
    pros: string[];
    cons: string[];
    languageSupport?: string[];
    tags?: string[];
    useCases?: string[];
    recommendedUsers?: string[];
    pricingNotes?: string;
  };
  ja: {
    name: string;
    description: string;
    features: string[];
    pros: string[];
    cons: string[];
    languageSupport?: string[];
    tags?: string[];
    useCases?: string[];
    recommendedUsers?: string[];
    pricingNotes?: string;
  };
};

function t(
  slug: string,
  name: string,
  homepageUrl: string,
  categoryKey: string,
  pricingModel: SeedTool["pricingModel"],
  hasFreePlan: boolean,
  hasApi: boolean,
  enDesc: string,
  jaDesc: string,
  extra?: Partial<SeedTool>,
): SeedTool {
  const pricingNotesEn =
    pricingModel === "free"
      ? "Free to use"
      : pricingModel === "freemium"
        ? "Free plan available; paid tiers unlock higher limits"
        : pricingModel === "enterprise"
          ? "Enterprise / custom pricing"
          : "Paid subscription or usage-based pricing";
  const pricingNotesJa =
    pricingModel === "free"
      ? "無料で利用可能"
      : pricingModel === "freemium"
        ? "無料プランあり。上位プランで制限緩和"
        : pricingModel === "enterprise"
          ? "法人向け・個別見積もり"
          : "有料サブスクまたは従量課金";

  return {
    slug,
    homepageUrl,
    pricingModel,
    hasFreePlan,
    hasApi,
    categoryKey,
    en: {
      name,
      description: enDesc,
      features: ["Core AI features", "Web app", "Team use", `Category: ${categoryKey}`],
      pros: ["Useful for daily work", "Actively maintained", "Clear product focus"],
      cons: ["Pricing can scale with usage", "Learning curve varies"],
      languageSupport: ["English", "Japanese (varies by product)"],
      tags: [categoryKey, pricingModel, hasApi ? "api" : "no-api"],
      useCases: [
        `Everyday ${categoryKey} workflows`,
        "Team collaboration",
        "Productivity acceleration",
      ],
      recommendedUsers: ["Individuals", "Startups", "Marketing / ops teams"],
      pricingNotes: pricingNotesEn,
    },
    ja: {
      name,
      description: jaDesc,
      features: ["主要AI機能", "Webアプリ", "チーム利用", `カテゴリー: ${categoryKey}`],
      pros: ["日常業務に使いやすい", "継続的に更新", "用途が明確"],
      cons: ["利用量で料金が上がることがある", "習得コストは製品による"],
      languageSupport: ["日本語（製品による）", "英語"],
      tags: [categoryKey, pricingModel, hasApi ? "api" : "no-api"],
      useCases: [`${categoryKey}領域の日常業務`, "チーム連携", "生産性向上"],
      recommendedUsers: ["個人", "スタートアップ", "マーケ / 業務担当"],
      pricingNotes: pricingNotesJa,
    },
    ...extra,
  };
}

/** 100+ tools across categories for public catalog / monetization. */
export const LAUNCH_TOOLS: SeedTool[] = [
  t("chatgpt", "ChatGPT", "https://chatgpt.com", "text", "freemium", true, true, "General-purpose conversational AI for drafting, coding, and research.", "文章作成・調査・コーディング支援に使える汎用対話AI。"),
  t("claude", "Claude", "https://claude.ai", "text", "freemium", true, true, "Long-context assistant strong at writing, analysis, and coding.", "長文コンテキストに強い執筆・分析・コーディング向けAI。"),
  t("gemini", "Google Gemini", "https://gemini.google.com", "text", "freemium", true, true, "Google multimodal AI integrated with Search and Workspace.", "GoogleのマルチモーダルAI。検索やWorkspace連携が強み。"),
  t("perplexity", "Perplexity", "https://www.perplexity.ai", "text", "freemium", true, true, "Answer engine with cited web sources for research.", "出典付きで調べられるAI検索・リサーチエンジン。"),
  t("copilot-microsoft", "Microsoft Copilot", "https://copilot.microsoft.com", "productivity", "freemium", true, true, "Microsoft AI assistant across Bing, Edge, and Microsoft 365.", "BingやMicrosoft 365と連携するマイクロソフトのAIアシスタント。"),
  t("notion-ai", "Notion AI", "https://www.notion.so/product/ai", "productivity", "freemium", true, false, "AI writing and Q&A inside Notion workspaces.", "Notion内での執筆・要約・ドキュメントQ&A向けAI。"),
  t("grammarly", "Grammarly", "https://www.grammarly.com", "text", "freemium", true, true, "Writing assistant for grammar, tone, and clarity.", "英文の文法・トーン・明瞭さを整えるライティング支援。"),
  t("jasper", "Jasper", "https://www.jasper.ai", "marketing", "paid", false, true, "Marketing copy and brand-voice content generation.", "マーケ向けコピーとブランドボイス生成。"),
  t("copy-ai", "Copy.ai", "https://www.copy.ai", "marketing", "freemium", true, true, "Go-to-market workflows and AI copy generation.", "GTMワークフローとコピー生成向けAI。"),
  t("writesonic", "Writesonic", "https://writesonic.com", "marketing", "freemium", true, true, "SEO articles and marketing content generation.", "SEO記事やマーケコンテンツ生成。"),
  t("rytr", "Rytr", "https://rytr.me", "text", "freemium", true, true, "Lightweight AI writing for short-form content.", "短文コンテンツ向けの軽量ライティングAI。"),
  t("quillbot", "QuillBot", "https://quillbot.com", "text", "freemium", true, false, "Paraphrasing and summarization for writers and students.", "言い換え・要約に強いライティング支援。"),
  t("wordtune", "Wordtune", "https://www.wordtune.com", "text", "freemium", true, false, "Rewrite suggestions to improve clarity and tone.", "文章の明瞭さとトーンを改善するリライト支援。"),
  t("deepl", "DeepL", "https://www.deepl.com", "text", "freemium", true, true, "High-quality neural machine translation.", "高品質なニューラル機械翻訳。"),
  t("otter", "Otter.ai", "https://otter.ai", "audio", "freemium", true, true, "Meeting transcription and AI notes.", "会議の文字起こしとAIノート。"),
  t("fireflies", "Fireflies.ai", "https://fireflies.ai", "audio", "freemium", true, true, "AI meeting notes with searchable transcripts.", "検索可能な文字起こし付き会議AIノート。"),
  t("descript", "Descript", "https://www.descript.com", "audio", "freemium", true, false, "Audio/video editing via text transcript.", "文字起こしベースの音声・動画編集。"),
  t("elevenlabs", "ElevenLabs", "https://elevenlabs.io", "audio", "freemium", true, true, "Natural AI voice synthesis and cloning.", "自然なAI音声合成・クローニング。"),
  t("murf", "Murf AI", "https://murf.ai", "audio", "freemium", true, true, "Studio-quality AI voiceovers for video and training.", "動画・研修向けのスタジオ品質AIナレーション。"),
  t("suno", "Suno", "https://suno.com", "audio", "freemium", true, false, "AI music generation from text prompts.", "テキストから楽曲を生成するAI。"),
  t("udio", "Udio", "https://www.udio.com", "audio", "freemium", true, false, "AI music creation with style controls.", "スタイル制御付きのAI音楽生成。"),
  t("midjourney", "Midjourney", "https://www.midjourney.com", "image", "paid", false, false, "High-quality text-to-image generation for creative work.", "クリエイティブ向け高品質テキスト画像生成。"),
  t("dall-e", "DALL·E", "https://openai.com/dall-e", "image", "paid", true, true, "OpenAI image generation via ChatGPT and API.", "OpenAIの画像生成（ChatGPT / API）。"),
  t("stable-diffusion", "Stable Diffusion", "https://stability.ai", "image", "freemium", true, true, "Open image models and Stability AI platform.", "オープンな画像モデルとStability AIプラットフォーム。"),
  t("leonardo", "Leonardo.ai", "https://leonardo.ai", "image", "freemium", true, true, "Game and product art generation with fine controls.", "ゲーム・プロダクト向け画像生成。"),
  t("ideogram", "Ideogram", "https://ideogram.ai", "image", "freemium", true, false, "Text-in-image generation with strong typography.", "文字入り画像生成に強いAI。"),
  t("flux", "FLUX", "https://blackforestlabs.ai", "image", "paid", false, true, "High-fidelity image models from Black Forest Labs.", "Black Forest Labsの高精細画像モデル。"),
  t("canva-magic", "Canva Magic Studio", "https://www.canva.com/magic", "design", "freemium", true, false, "Design suite with AI image, text, and layout tools.", "AI画像・テキスト・レイアウトを備えたデザインスイート。"),
  t("figma-ai", "Figma AI", "https://www.figma.com", "design", "freemium", true, true, "Design collaboration with AI-assisted workflows.", "AI支援ワークフロー付きデザインコラボ。"),
  t("adobe-firefly", "Adobe Firefly", "https://www.adobe.com/products/firefly.html", "design", "freemium", true, true, "Generative AI inside Adobe Creative Cloud.", "Adobe Creative Cloud内の生成AI。"),
  t("runway", "Runway", "https://runwayml.com", "video", "freemium", true, true, "AI video generation and creative editing tools.", "AI動画生成とクリエイティブ編集。"),
  t("pika", "Pika", "https://pika.art", "video", "freemium", true, false, "Text-to-video generation for short clips.", "短尺向けテキスト動画生成。"),
  t("kling", "Kling AI", "https://klingai.com", "video", "freemium", true, false, "Cinematic AI video generation platform.", "シネマティックなAI動画生成。"),
  t("luma-dream-machine", "Luma Dream Machine", "https://lumalabs.ai/dream-machine", "video", "freemium", true, true, "Fast AI video generation from Luma AI.", "Lumaの高速AI動画生成。"),
  t("synthesia", "Synthesia", "https://www.synthesia.io", "video", "paid", false, true, "AI avatar videos for training and marketing.", "研修・マーケ向けAIアバター動画。"),
  t("heygen", "HeyGen", "https://www.heygen.com", "video", "freemium", true, true, "AI avatar and video translation platform.", "AIアバターと動画翻訳。"),
  t("capcut", "CapCut", "https://www.capcut.com", "video", "freemium", true, false, "Mobile/desktop video editor with AI effects.", "AIエフェクト付き動画編集。"),
  t("github-copilot", "GitHub Copilot", "https://github.com/features/copilot", "coding", "paid", false, true, "AI pair programmer in the IDE and on GitHub.", "IDEとGitHub上のAIペアプログラマー。"),
  t("cursor", "Cursor", "https://cursor.com", "coding", "freemium", true, false, "AI-native code editor built for agentic coding.", "エージェント型コーディング向けAIエディタ。"),
  t("replit-agent", "Replit Agent", "https://replit.com", "coding", "freemium", true, true, "Build and deploy apps with AI in the browser.", "ブラウザ上でアプリを構築・デプロイするAI。"),
  t("tabnine", "Tabnine", "https://www.tabnine.com", "coding", "freemium", true, true, "Privacy-focused AI code completion.", "プライバシー重視のAIコード補完。"),
  t("codeium", "Codeium", "https://codeium.com", "coding", "freemium", true, true, "Fast free AI coding autocomplete and chat.", "高速な無料AIコーディング補完・チャット。"),
  t("sourcegraph-cody", "Sourcegraph Cody", "https://sourcegraph.com/cody", "coding", "freemium", true, true, "Codebase-aware AI assistant for developers.", "コードベースを理解する開発者向けAI。"),
  t("v0", "v0", "https://v0.dev", "coding", "freemium", true, true, "Generate UI with AI from text prompts (Vercel).", "テキストからUIを生成するVercelのAI。"),
  t("bolt-new", "Bolt.new", "https://bolt.new", "coding", "freemium", true, false, "Full-stack app generation in the browser.", "ブラウザでフルスタックアプリを生成。"),
  t("lovable", "Lovable", "https://lovable.dev", "coding", "freemium", true, false, "Ship full-stack apps from natural language.", "自然言語からフルスタックアプリを構築。"),
  t("zapier-central", "Zapier", "https://zapier.com", "automation", "freemium", true, true, "Automation platform with AI-assisted workflows.", "AI支援ワークフローの自動化プラットフォーム。"),
  t("make", "Make", "https://www.make.com", "automation", "freemium", true, true, "Visual automation for apps and AI steps.", "アプリ連携とAIステップのビジュアル自動化。"),
  t("n8n", "n8n", "https://n8n.io", "automation", "freemium", true, true, "Open-source workflow automation with AI nodes.", "AIノード付きオープンソース自動化。"),
  t("bardeen", "Bardeen", "https://www.bardeen.ai", "automation", "freemium", true, false, "Browser automation and AI playbooks.", "ブラウザ自動化とAIプレイブック。"),
  t("relevance-ai", "Relevance AI", "https://relevanceai.com", "automation", "freemium", true, true, "Build AI agents and workforce automations.", "AIエージェントと業務自動化の構築。"),
  t("hubspot-ai", "HubSpot AI", "https://www.hubspot.com/products/artificial-intelligence", "sales", "freemium", true, true, "CRM AI for content, chat, and sales assist.", "コンテンツ・チャット・営業支援のCRM AI。"),
  t("salesforce-einstein", "Salesforce Einstein", "https://www.salesforce.com/products/einstein", "sales", "enterprise", false, true, "AI across Salesforce CRM clouds.", "Salesforce CRM全体のAI。"),
  t("apollo", "Apollo.io", "https://www.apollo.io", "sales", "freemium", true, true, "B2B data platform with AI sequencing.", "AIシーケンス付きB2Bデータプラットフォーム。"),
  t("clay", "Clay", "https://www.clay.com", "sales", "paid", false, true, "Creative GTM data enrichment and outreach.", "GTM向けデータエンリッチメントとアウトリーチ。"),
  t("gong", "Gong", "https://www.gong.io", "sales", "enterprise", false, true, "Revenue intelligence from sales conversations.", "商談会話から収益インテリジェンスを抽出。"),
  t("intercom-fin", "Intercom Fin", "https://www.intercom.com/fin", "sales", "paid", false, true, "AI customer agent for support automation.", "サポート自動化向けAIカスタマーエージェント。"),
  t("zendesk-ai", "Zendesk AI", "https://www.zendesk.com/service/ai", "sales", "paid", false, true, "AI for ticketing, answers, and agent assist.", "チケット・回答・エージェント支援のAI。"),
  t("surfer", "Surfer SEO", "https://surferseo.com", "marketing", "paid", false, true, "On-page SEO content optimization with AI.", "AIによるオンページSEO最適化。"),
  t("frase", "Frase", "https://www.frase.io", "marketing", "paid", false, true, "SEO research and AI content briefs.", "SEOリサーチとAIコンテンツブリーフ。"),
  t("semrush-ai", "Semrush", "https://www.semrush.com", "marketing", "paid", false, true, "SEO and marketing suite with AI writing tools.", "AIライティング付きSEO・マーケスイート。"),
  t("ahrefs", "Ahrefs", "https://ahrefs.com", "marketing", "paid", false, true, "SEO toolkit for backlinks, keywords, and content.", "被リンク・キーワード・コンテンツのSEOツール。"),
  t("buffer-ai", "Buffer", "https://buffer.com", "marketing", "freemium", true, true, "Social scheduling with AI caption help.", "AIキャプション付きSNSスケジュール。"),
  t("hootsuite", "Hootsuite", "https://www.hootsuite.com", "marketing", "paid", false, true, "Enterprise social management with AI insights.", "AIインサイト付きエンタープライズSNS管理。"),
  t("later", "Later", "https://later.com", "marketing", "freemium", true, false, "Visual social planner for Instagram and more.", "Instagram等のビジュアルSNSプランナー。"),
  t("gamma", "Gamma", "https://gamma.app", "productivity", "freemium", true, false, "AI presentations, docs, and webpages.", "AIで作るプレゼン・ドキュメント・Webページ。"),
  t("beautiful-ai", "Beautiful.ai", "https://www.beautiful.ai", "productivity", "paid", false, false, "Smart presentation design that auto-layouts slides.", "自動レイアウトのスマートプレゼン作成。"),
  t("tome", "Tome", "https://tome.app", "productivity", "freemium", true, false, "Narrative presentations generated with AI.", "AIで物語型プレゼンを生成。"),
  t("memo", "Mem", "https://get.mem.ai", "productivity", "freemium", true, false, "Self-organizing AI notes and knowledge.", "自己整理するAIノートとナレッジ。"),
  t("reflect", "Reflect", "https://reflect.app", "productivity", "paid", false, false, "Networked notes with AI backlinking help.", "AIバックリンク支援付きネットワークノート。"),
  t("mem-ai", "Mem.ai", "https://mem.ai", "productivity", "freemium", true, false, "AI notes that surface the right context.", "必要な文脈を浮かび上がらせるAIノート。"),
  t("taskade", "Taskade", "https://www.taskade.com", "productivity", "freemium", true, true, "AI agents for tasks, docs, and mind maps.", "タスク・ドキュメント・マインドマップのAIエージェント。"),
  t("clickup-ai", "ClickUp Brain", "https://clickup.com/ai", "productivity", "freemium", true, true, "Work OS AI for tasks, docs, and search.", "タスク・ドキュメント・検索向けWork OS AI。"),
  t("monday-ai", "monday.com AI", "https://monday.com", "productivity", "paid", false, true, "Work management platform with AI assistants.", "AIアシスタント付きワーク管理。"),
  t("asana-ai", "Asana Intelligence", "https://asana.com", "productivity", "paid", false, true, "Work management with AI status and goals help.", "AIで進捗・目標を支援するワーク管理。"),
  t("linear", "Linear", "https://linear.app", "productivity", "freemium", true, true, "Issue tracking with AI triage features.", "AIトリアージ付き課題管理。"),
  t("height", "Height", "https://height.app", "productivity", "freemium", true, true, "Autonomous project management with AI.", "AIによる自律的プロジェクト管理。"),
  t("miro-ai", "Miro AI", "https://miro.com/ai", "design", "freemium", true, true, "Collaborative whiteboard with AI summarization.", "AI要約付きコラボホワイトボード。"),
  t("whimsical", "Whimsical", "https://whimsical.com", "design", "freemium", true, false, "Flowcharts, wireframes, and AI docs.", "フローチャート・ワイヤー・AIドキュメント。"),
  t("uizard", "Uizard", "https://uizard.io", "design", "freemium", true, false, "Turn sketches and prompts into UI mockups.", "スケッチやプロンプトからUIモックを生成。"),
  t("galileo", "Galileo AI", "https://www.usegalileo.ai", "design", "paid", false, false, "UI generation from text for product design.", "プロダクトデザイン向けテキストUI生成。"),
  t("khroma", "Khroma", "https://www.khroma.co", "design", "free", true, false, "AI color palette generator for designers.", "デザイナー向けAIカラーパレット生成。"),
  t("remove-bg", "remove.bg", "https://www.remove.bg", "image", "freemium", true, true, "One-click background removal for images.", "画像のワンクリック背景除去。"),
  t("photopea", "Photopea", "https://www.photopea.com", "image", "freemium", true, false, "Browser photo editor compatible with PSD files.", "PSD対応のブラウザ画像編集。"),
  t("photoroom", "PhotoRoom", "https://www.photoroom.com", "image", "freemium", true, true, "Product photo editing and background AI.", "商品写真編集と背景AI。"),
  t("duolingo-max", "Duolingo Max", "https://www.duolingo.com", "education", "paid", false, false, "Language learning with GPT-powered explanations.", "GPT説明付き語学学習。"),
  t("khanmigo", "Khanmigo", "https://www.khanmigo.ai", "education", "paid", false, false, "AI tutor from Khan Academy.", "Khan AcademyのAIチューター。"),
  t("quizlet", "Quizlet", "https://quizlet.com", "education", "freemium", true, false, "Study tools with AI-generated practice.", "AI生成練習付き学習ツール。"),
  t("coursera-coach", "Coursera Coach", "https://www.coursera.org", "education", "freemium", true, false, "AI learning coach on Coursera courses.", "CourseraコースのAIラーニングコーチ。"),
  t("elicit", "Elicit", "https://elicit.com", "education", "freemium", true, true, "AI research assistant for academic papers.", "学術論文向けAIリサーチアシスタント。"),
  t("consensus", "Consensus", "https://consensus.app", "education", "freemium", true, false, "Evidence-based answers from research papers.", "論文エビデンスに基づく回答エンジン。"),
  t("researchrabbit", "ResearchRabbit", "https://www.researchrabbit.ai", "education", "free", true, false, "Literature discovery maps for researchers.", "研究者向け文献ディスカバリーマップ。"),
  t("scite", "Scite", "https://scite.ai", "education", "paid", false, true, "Smart citations showing supporting/contrasting claims.", "支持・反論を示すスマート引用。"),
  t("character-ai", "Character.AI", "https://character.ai", "text", "freemium", true, false, "Conversational character chatbots.", "キャラクター対話チャットボット。"),
  t("poe", "Poe", "https://poe.com", "text", "freemium", true, true, "Multi-bot chat hub for many AI models.", "複数AIモデルを使えるチャットハブ。"),
  t("you-com", "You.com", "https://you.com", "text", "freemium", true, true, "AI search and chat with customizable agents.", "カスタムエージェント付きAI検索・チャット。"),
  t("phind", "Phind", "https://www.phind.com", "coding", "freemium", true, true, "Developer-focused AI search and coding help.", "開発者向けAI検索とコーディング支援。"),
  t("together-ai", "Together AI", "https://www.together.ai", "coding", "paid", false, true, "Inference platform for open-source models.", "オープンソースモデルの推論プラットフォーム。"),
  t("groq", "Groq", "https://groq.com", "coding", "paid", true, true, "Ultra-fast LLM inference hardware and API.", "超高速LLM推論ハードウェアとAPI。"),
  t("huggingface", "Hugging Face", "https://huggingface.co", "coding", "freemium", true, true, "Model hub, spaces, and inference for ML builders.", "ML向けモデルハブ・Spaces・推論。"),
  t("replicate", "Replicate", "https://replicate.com", "coding", "paid", true, true, "Run open models via simple cloud API.", "オープンモデルを簡単APIで実行。"),
  t("fal", "fal.ai", "https://fal.ai", "image", "paid", true, true, "Fast generative media APIs for developers.", "開発者向け高速生成メディアAPI。"),
  t("openai-api", "OpenAI Platform", "https://platform.openai.com", "coding", "paid", true, true, "GPT, embeddings, and multimodal APIs.", "GPT・埋め込み・マルチモーダルAPI。"),
  t("anthropic-api", "Anthropic API", "https://www.anthropic.com/api", "coding", "paid", false, true, "Claude models via official API.", "公式API経由のClaudeモデル。"),
  t("aws-bedrock", "Amazon Bedrock", "https://aws.amazon.com/bedrock", "coding", "enterprise", false, true, "Managed foundation models on AWS.", "AWS上のマネージド基盤モデル。"),
  t("cohere", "Cohere", "https://cohere.com", "text", "paid", true, true, "Enterprise LLM platform for RAG and agents.", "企業向けRAG・エージェント向けLLMプラットフォーム。"),
  t("mistral", "Mistral AI", "https://mistral.ai", "text", "freemium", true, true, "European open-weight and hosted LLM models.", "欧州発のオープンウェイト／ホスト型LLM。"),
  t("xai-grok", "Grok", "https://x.ai", "text", "paid", true, true, "xAI assistant with real-time knowledge access.", "xAIのリアルタイム知識アクセス付きアシスタント。"),
  t("notebooklm", "NotebookLM", "https://notebooklm.google.com", "education", "free", true, false, "Google AI notebook that grounds answers in your sources.", "自分の資料を根拠に答えるGoogleのAIノート。"),
  t("chatgpt-team", "ChatGPT Team", "https://chatgpt.com", "productivity", "paid", false, true, "Shared ChatGPT workspace for teams with admin controls.", "管理機能付きのチーム向けChatGPTワークスペース。"),
  t("windsurf", "Windsurf", "https://windsurf.com", "coding", "freemium", true, false, "Agentic IDE for cascade-style coding workflows.", "カスケード型コーディング向けエージェントIDE。"),
  t("manus", "Manus", "https://manus.im", "automation", "freemium", true, false, "General AI agent for multi-step computer tasks.", "複数ステップのPC作業を行う汎用AIエージェント。"),
  t("grok-x", "Grok on X", "https://x.com/i/grok", "text", "freemium", true, false, "Grok chat integrated into the X social platform.", "X上で使えるGrokチャット。"),
  t("pictory", "Pictory", "https://pictory.ai", "video", "paid", false, false, "Turn scripts and blogs into short AI videos.", "脚本やブログから短尺AI動画を生成。"),
  t("invideo", "InVideo AI", "https://invideo.io", "video", "freemium", true, false, "Text-to-video marketing clips with templates.", "テンプレート付きテキスト動画マーケ生成。"),
  t("napkin", "Napkin AI", "https://www.napkin.ai", "design", "freemium", true, false, "Turn text into visual diagrams instantly.", "テキストを即座に図解へ変換。"),
  t("tldv", "tl;dv", "https://tldv.io", "audio", "freemium", true, true, "Meeting recording, AI notes, and clip sharing.", "会議録画・AIノート・クリップ共有。"),
  t("granola", "Granola", "https://www.granola.ai", "productivity", "freemium", true, false, "AI meeting notes that stay under your control.", "自分でコントロールできるAI会議ノート。"),
];
