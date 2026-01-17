import { create } from "zustand";

export type Language = "zh" | "zh-TW" | "en" | "ja" | "ru" | "fr";

export const languages: { code: Language; name: string }[] = [
  { code: "zh", name: "简体中文" },
  { code: "zh-TW", name: "繁體中文" },
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "ru", name: "Русский" },
  { code: "fr", name: "Français" },
];

type Translations = {
 nav: {
   community: string;
   download: string;
   about: string;
   improveCommunity: string;
 };
 hero: {
   title: string;
 };
 search: {
   placeholder: string;
   cta: string;
   loading: string;
   emptyQuery: string;
   errorGeneric: string;
   resultsCount: string;
   lastUpdated: string;
   noResults: string;
   filterSource: string;
   allSources: string;
   selectSource: string;
   selectDrive: string;
   apply: string;
   cancel: string;
   prevPage: string;
   nextPage: string;
   starCallout: string;
   starCta: string;
   statsPlatformsLabel: string;
   statsIpLabel: string;
   statsCountryLabel: string;
   statsLatencyLabel: string;
   statsNotProvided: string;
   statsMeasuring: string;
   errors: {
     title: string;
     headline: string;
     verificationMissing: string;
     backendUnavailable: string;
     generic: string;
     detailsLabel: string;
     close: string;
   };
   captcha: {
     title: string;
     description: string;
   };
   suggest: {
     modalTitle: string;
     modalDesc: string;
     recommend: string;
     apply: string;
     search: string;
     floatingTitle: string;
     floatingDesc: string;
     loading: string;
     failed: string;
     close: string;
     captchaRequired: string;
   };
 };
 donate: {
   title: string;
   description: string;
   supportedMethods: string;
   methodDesc: string;
   addressNote: string;
   advantagesTitle: string;
   advantages: string[];
 };
 countdown: {
   launching: string;
   days: string;
   hours: string;
   minutes: string;
   seconds: string;
 };
 drives: {
   title: string;
   baidu: string;
   aliyun: string;
   quark: string;
   tianyi: string;
   pikpak: string;
   pan115: string;
   xunlei: string;
   uc: string;
   yidong: string;
   pan123: string;
   magnet: string;
   ed2k: string;
 };
 about: {
   title: string;
   content: string;
   contact: string;
 };
 footer: {
   terms: string;
   privacy: string;
   security: string;
   regions: string;
   cookies: string;
   doNotShare: string;
   rights: string;
 };
};

const translations: Record<Language, Translations> = {
  zh: {
    nav: {
      community: "社区",
      download: "下载",
      about: "关于我们",
      improveCommunity: "与我们一起完善社区",
    },
    hero: {
      title: "无需登录即可搜索全部动漫资源",
    },
    search: {
      placeholder: "搜索动漫…",
      cta: "搜索",
      loading: "正在查找更多资源…",
      emptyQuery: "请输入搜索关键词",
      errorGeneric: "搜索失败，请稍后重试",
      resultsCount: "找到 {count} 条结果",
      lastUpdated: "最后更新",
      noResults: "暂无相关结果",
      filterSource: "筛选来源",
      allSources: "全部来源",
      selectSource: "选择来源",
      selectDrive: "全部类型",
      apply: "确认",
      cancel: "取消",
      prevPage: "上一页",
      nextPage: "下一页",
      starCallout: "如果你觉得 Limitless-search 很好用请给我们一个 star",
      starCta: "GitHub Star",
      statsPlatformsLabel: "平台来源",
      statsIpLabel: "请求IP",
      statsCountryLabel: "国家/地区",
      statsLatencyLabel: "搜索延迟",
      statsNotProvided: "未提供",
      statsMeasuring: "测量中",
      errors: {
        title: "搜索异常",
        headline: "暂时无法完成搜索请求",
        verificationMissing: "未检测到人机验证配置，请在后台启用或关闭验证后重试。",
        backendUnavailable: "搜索服务暂不可用，请确认后端容器是否已经启动。",
        generic: "发生未知错误，请稍后再试。",
        detailsLabel: "详细信息",
        close: "我知道了",
      },
      captcha: {
        title: "安全验证",
        description: "请完成人机验证以继续搜索",
      },
      suggest: {
        modalTitle: "没有你想要的资源尝试原版名称",
        modalDesc: "AI 正在为你匹配日文或英文原版名称，点击一键替换后再次搜索。",
        recommend: "推荐名称",
        apply: "一键替换",
        search: "重新搜索",
        floatingTitle: "没有想要的结果？",
        floatingDesc: "试试原版名称（AI 推荐）",
        loading: "AI 正在分析…",
        failed: "AI 推荐失败，请稍后重试",
        close: "关闭",
        captchaRequired: "请完成人机验证后再试 AI 推荐",
      },
    },
    donate: {
      title: "捐助 Freeanime.org",
      description: "Freeanime.org获得的全部捐助全部利用与Freeanime.org社区",
      supportedMethods: "支持的捐助方式",
      methodDesc: "暂时仅支持 使用solana区块链向我们发送USDT",
      addressNote: "我们会在捐助页面不间断更新捐助名单",
      advantagesTitle: "Freeanime.org 有什么优势",
      advantages: [
        "无广告",
        "多语言支持",
        "GOlang",
        "Next.js",
        "React",
      ],
    },
    countdown: {
      launching: "即将上线",
      days: "天",
      hours: "时",
      minutes: "分",
      seconds: "秒",
    },
    drives: {
      title: "Limitless Search 支持",
      baidu: "百度网盘",
      aliyun: "阿里云盘",
      quark: "夸克网盘",
      tianyi: "天翼云盘",
      pikpak: "PikPak",
      pan115: "115 网盘",
      xunlei: "迅雷网盘",
      uc: "UC 网盘",
      yidong: "移动云盘",
      pan123: "123 网盘",
      magnet: "磁力链接",
      ed2k: "电驴链接",
    },
    about: {
      title: "关于 Limitless Search",
      content:
        "Limitless Search 由 Maishan, Inc 与 SMV 维护，统一接口聚合网盘动漫资源，免登录即可快速搜索。",
      contact: "Limitless Search Powered by Maishan,Inc",
    },
    footer: {
      terms: "用户协议",
      privacy: "隐私政策",
      security: "安全政策",
      regions: "支持的地区",
      cookies: "管理 Cookies",
      doNotShare: "不分享我的个人信息",
      rights:
        "Copyright © {year} Maishan,Inc All rights reserved Limitless Search",
    },
  },
  "zh-TW": {
    nav: {
      community: "社群",
      download: "下載",
      about: "關於我們",
      improveCommunity: "一起完善社群",
    },
    hero: {
      title: "免登入即可搜尋全部動漫資源",
    },
    search: {
      placeholder: "搜尋動漫…",
      cta: "搜尋",
      loading: "正在尋找更多資源…",
      emptyQuery: "請輸入搜尋關鍵字",
      errorGeneric: "搜尋失敗，請稍後重試",
      resultsCount: "找到 {count} 筆結果",
      lastUpdated: "最後更新",
      noResults: "暫無相關結果",
      filterSource: "篩選來源",
      allSources: "全部來源",
      selectSource: "選擇來源",
      selectDrive: "全部類型",
      apply: "確認",
      cancel: "取消",
      prevPage: "上一頁",
      nextPage: "下一頁",
      starCallout: "如果你覺得 Limitless-search 很好用請給我們一個 star",
      starCta: "GitHub Star",
      statsPlatformsLabel: "平台來源",
      statsIpLabel: "請求IP",
      statsCountryLabel: "國家/地區",
      statsLatencyLabel: "搜尋延遲",
      statsNotProvided: "未提供",
      statsMeasuring: "測量中",
      errors: {
        title: "搜尋異常",
        headline: "暫時無法完成搜尋請求",
        verificationMissing: "未偵測到人機驗證設定，請在後端啟用或停用驗證後再試。",
        backendUnavailable: "搜尋服務暫不可用，請確認後端容器是否已啟動。",
        generic: "發生未知錯誤，請稍後重試。",
        detailsLabel: "詳細資訊",
        close: "知道了",
      },
      captcha: {
        title: "安全驗證",
        description: "請完成人機驗證以繼續搜尋",
      },
      suggest: {
        modalTitle: "結果不足？試試原版名稱",
        modalDesc: "AI 會推測日文/英文官方名稱，套用後再次搜尋。",
        recommend: "推薦名稱",
        apply: "一鍵替換",
        search: "重新搜尋",
        floatingTitle: "找不到想要的？",
        floatingDesc: "試試原版名稱（AI）",
        loading: "AI 分析中…",
        failed: "AI 推薦失敗，稍後再試",
        close: "關閉",
        captchaRequired: "完成人機驗證後再試 AI 推薦",
      },
    },
    donate: {
      title: "贊助 Freeanime.org",
      description: "Freeanime.org獲得的全部贊助全部利用與Freeanime.org社群",
      supportedMethods: "支援的贊助方式",
      methodDesc: "暫時僅支援 使用solana區塊鏈向我們發送USDT",
      addressNote: "我們會在贊助頁面不間斷更新贊助名單",
      advantagesTitle: "Freeanime.org 的優勢",
      advantages: [
        "無廣告",
        "多語言支援",
        "GOlang",
        "Next.js",
        "React",
      ],
    },
    countdown: {
      launching: "即將上線",
      days: "天",
      hours: "時",
      minutes: "分",
      seconds: "秒",
    },
    drives: {
      title: "Limitless Search 支援",
      baidu: "百度網盤",
      aliyun: "阿里雲盤",
      quark: "夸克網盤",
      tianyi: "天翼雲盤",
      pikpak: "PikPak",
      pan115: "115 網盤",
      xunlei: "迅雷網盤",
      uc: "UC 網盤",
      yidong: "移動雲盤",
      pan123: "123 網盤",
      magnet: "磁力連結",
      ed2k: "電驢連結",
    },
    about: {
      title: "關於 Limitless Search",
      content:
        "Limitless Search 由 Maishan, Inc 與 SMV 維護，統一介面聚合網盤動漫資源，免登入即可快速搜尋。",
      contact: "Limitless Search Powered by Maishan,Inc",
    },
    footer: {
      terms: "使用者條款",
      privacy: "隱私政策",
      security: "安全政策",
      regions: "支援的地區",
      cookies: "管理 Cookies",
      doNotShare: "不要分享我的個人資訊",
      rights:
        "Copyright © {year} Maishan,Inc All rights reserved Limitless Search",
    },
  },
  en: {
    nav: {
      community: "Community",
      download: "Download",
      about: "About Us",
      improveCommunity: "Help Improve the Community",
    },
    hero: {
      title: "Search all anime resources without login",
    },
    search: {
      placeholder: "Search anime…",
      cta: "Search",
      loading: "Searching for more resources…",
      emptyQuery: "Please enter a search term",
      errorGeneric: "Search failed, please try again later",
      resultsCount: "Found {count} results",
      lastUpdated: "Last updated",
      noResults: "No results found",
      filterSource: "Filter source",
      allSources: "All sources",
      selectSource: "Select source",
      selectDrive: "All Types",
      apply: "Apply",
      cancel: "Cancel",
      prevPage: "Previous",
      nextPage: "Next",
      starCallout: "If Limitless-search helps you, please give us a star",
      starCta: "GitHub Star",
      statsPlatformsLabel: "Platforms",
      statsIpLabel: "Client IP",
      statsCountryLabel: "Country/Region",
      statsLatencyLabel: "Search Latency",
      statsNotProvided: "Not provided",
      statsMeasuring: "Measuring",
      errors: {
        title: "Search issue",
        headline: "Unable to complete the search request",
        verificationMissing:
          "Verification service is not configured. Enable or disable it on the backend and try again.",
        backendUnavailable:
          "Search service is unreachable. Please make sure the backend container is running.",
        generic: "An unknown error occurred. Please try again later.",
        detailsLabel: "Technical details",
        close: "Dismiss",
      },
      captcha: {
        title: "Security Verification",
        description: "Please complete the captcha to continue searching",
      },
      suggest: {
        modalTitle: "Not enough results? Try original title",
        modalDesc: "AI can infer Japanese/English official names. Apply and search again.",
        recommend: "Recommended",
        apply: "Apply",
        search: "Search again",
        floatingTitle: "Missing the title?",
        floatingDesc: "Try original name (AI)",
        loading: "AI thinking…",
        failed: "AI suggestion failed, retry later",
        close: "Close",
        captchaRequired: "Complete captcha before AI suggestion",
      },
    },
    donate: {
      title: "Donate to Freeanime.org",
      description: "All donations received by Freeanime.org are used for the Freeanime.org community",
      supportedMethods: "Supported Donation Methods",
      methodDesc: "Currently only supports sending USDT via Solana blockchain",
      addressNote: "We will continuously update the donation list on the donation page",
      advantagesTitle: "Why Freeanime.org",
      advantages: [
        "No Ads",
        "Multi-language",
        "GOlang",
        "Next.js",
        "React",
      ],
    },
    countdown: {
      launching: "Launching soon",
      days: "Days",
      hours: "Hours",
      minutes: "Minutes",
      seconds: "Seconds",
    },
    drives: {
      title: "Limitless Search supports",
      baidu: "Baidu Netdisk",
      aliyun: "Aliyun Drive",
      quark: "Quark Drive",
      tianyi: "Tianyi Cloud",
      pikpak: "PikPak",
      pan115: "115 Drive",
      xunlei: "Xunlei Drive",
      uc: "UC Drive",
      yidong: "Mobile Cloud",
      pan123: "123 Drive",
      magnet: "Magnet Link",
      ed2k: "eDonkey Link",
    },
    about: {
      title: "About Limitless Search",
      content:
        "Limitless Search, maintained by Maishan, Inc & SMV, unifies cloud search so you can find anime resources quickly without logging in.",
      contact: "Limitless Search Powered by Maishan,Inc",
    },
    footer: {
      terms: "Terms of Use",
      privacy: "Privacy Policy",
      security: "Security Policy",
      regions: "Supported Regions",
      cookies: "Manage Cookies",
      doNotShare: "Do Not Share My Personal Info",
      rights:
        "Copyright © {year} Maishan,Inc All rights reserved Limitless Search",
    },
  },
  ja: {
    nav: {
      community: "コミュニティ",
      download: "ダウンロード",
      about: "私たちについて",
      improveCommunity: "コミュニティ改善に参加",
    },
    hero: {
      title: "ログインなしで全アニメを検索",
    },
    search: {
      placeholder: "アニメを検索…",
      cta: "検索",
      loading: "さらにリソースを検索中…",
      emptyQuery: "検索キーワードを入力してください",
      errorGeneric: "検索に失敗しました。後でもう一度お試しください",
      resultsCount: "{count} 件見つかりました",
      lastUpdated: "最終更新",
      noResults: "結果がありません",
      filterSource: "ソースを絞り込み",
      allSources: "すべてのソース",
      selectSource: "ソースを選択",
      selectDrive: "すべてのタイプ",
      apply: "決定",
      cancel: "キャンセル",
      prevPage: "前へ",
      nextPage: "次へ",
      starCallout: "Limitless-search が役立ったら、スターをお願いします",
      starCta: "GitHub Star",
      statsPlatformsLabel: "プラットフォーム数",
      statsIpLabel: "リクエストIP",
      statsCountryLabel: "国/地域",
      statsLatencyLabel: "検索レイテンシ",
      statsNotProvided: "未提供",
      statsMeasuring: "計測中",
      errors: {
        title: "検索エラー",
        headline: "検索リクエストを完了できません",
        verificationMissing:
          "人間認証の設定がありません。バックエンドで有効化するか無効化してから再試行してください。",
        backendUnavailable:
          "検索サービスに接続できません。バックエンドコンテナが起動しているか確認してください。",
        generic: "不明なエラーが発生しました。時間を置いて再度お試しください。",
        detailsLabel: "詳細",
        close: "閉じる",
      },
      captcha: {
        title: "セキュリティ認証",
        description: "検索を続けるには認証を完了してください",
      },
      suggest: {
        modalTitle: "結果が少ない？ 原題で検索",
        modalDesc: "AI が日本語/英語の公式名を推測します。適用して再検索。",
        recommend: "おすすめ",
        apply: "適用",
        search: "再検索",
        floatingTitle: "欲しい結果がない？",
        floatingDesc: "原題を試す（AI）",
        loading: "AI が分析中…",
        failed: "AI 推薦に失敗しました",
        close: "閉じる",
        captchaRequired: "認証後に AI 推薦を再試行してください",
      },
    },
    donate: {
      title: "Freeanime.org に寄付",
      description: "Freeanime.org が受け取った寄付はすべて Freeanime.org コミュニティのために使用されます",
      supportedMethods: "対応している寄付方法",
      methodDesc: "現在は Solana ブロックチェーン経由での USDT 送金のみ対応しています",
      addressNote: "寄付者リストは寄付ページにて随時更新されます",
      advantagesTitle: "Freeanime.org の強み",
      advantages: [
        "広告なし",
        "多言語対応",
        "GOlang",
        "Next.js",
        "React",
      ],
    },
    countdown: {
      launching: "まもなく公開",
      days: "日",
      hours: "時間",
      minutes: "分",
      seconds: "秒",
    },
    drives: {
      title: "Limitless Search が対応",
      baidu: "Baidu Netdisk",
      aliyun: "Aliyun Drive",
      quark: "Quark Drive",
      tianyi: "Tianyi Cloud",
      pikpak: "PikPak",
      pan115: "115 Drive",
      xunlei: "Xunlei Drive",
      uc: "UC Drive",
      yidong: "Mobile Cloud",
      pan123: "123 Drive",
      magnet: "Magnet Link",
      ed2k: "eDonkey Link",
    },
    about: {
      title: "Limitless Search とは",
      content:
        "Limitless Search は Maishan, Inc と SMV が運営し、ログイン不要でアニメ資源を素早く見つけられる統合クラウド検索です。",
      contact: "Limitless Search Powered by Maishan,Inc",
    },
    footer: {
      terms: "利用規約",
      privacy: "プライバシーポリシー",
      security: "セキュリティポリシー",
      regions: "対応地域",
      cookies: "Cookie の管理",
      doNotShare: "個人情報を共有しない",
      rights:
        "Copyright © {year} Maishan,Inc All rights reserved Limitless Search",
    },
  },
  ru: {
    nav: {
      community: "Сообщество",
      download: "Скачать",
      about: "О нас",
      improveCommunity: "Помочь развивать сообщество",
    },
    hero: {
      title: "Ищите все аниме без входа в систему",
    },
    search: {
      placeholder: "Поиск аниме…",
      cta: "Искать",
      loading: "Поиск дополнительных ресурсов…",
      emptyQuery: "Введите поисковый запрос",
      errorGeneric: "Поиск не удался, попробуйте позже",
      resultsCount: "Найдено {count} результатов",
      lastUpdated: "Последнее обновление",
      noResults: "Результатов нет",
      filterSource: "Фильтр по источнику",
      allSources: "Все источники",
      selectSource: "Выбрать источник",
      selectDrive: "Все типы",
      apply: "Применить",
      cancel: "Отмена",
      prevPage: "Назад",
      nextPage: "Вперед",
      starCallout: "Если Limitless-search помогает вам, пожалуйста, поставьте звезду",
      starCta: "GitHub Star",
      statsPlatformsLabel: "Платформы",
      statsIpLabel: "IP клиента",
      statsCountryLabel: "Страна/регион",
      statsLatencyLabel: "Задержка поиска",
      statsNotProvided: "Не указано",
      statsMeasuring: "Измеряется",
      errors: {
        title: "Проблема с поиском",
        headline: "Не удалось выполнить запрос",
        verificationMissing:
          "Сервис проверки не настроен. Включите или отключите его на сервере и повторите попытку.",
        backendUnavailable:
          "Поисковый сервис недоступен. Убедитесь, что контейнер backend запущен.",
        generic: "Произошла неизвестная ошибка. Повторите попытку позже.",
        detailsLabel: "Подробности",
        close: "Закрыть",
      },
      captcha: {
        title: "Проверка безопасности",
        description: "Пожалуйста, пройдите проверку, чтобы продолжить поиск",
      },
      suggest: {
        modalTitle: "Мало результатов? Попробуйте оригинал",
        modalDesc: "AI подскажет официальное название на японском/английском. Примените и ищите снова.",
        recommend: "Рекомендация",
        apply: "Применить",
        search: "Искать снова",
        floatingTitle: "Нет нужного?",
        floatingDesc: "Попробуйте оригинальное имя (AI)",
        loading: "AI думает…",
        failed: "Сбой AI-рекомендации",
        close: "Закрыть",
        captchaRequired: "Пройдите капчу перед AI-рекомендацией",
      },
    },
    donate: {
      title: "Пожертвовать Freeanime.org",
      description: "Все пожертвования, полученные Freeanime.org, используются для сообщества Freeanime.org",
      supportedMethods: "Поддерживаемые способы пожертвования",
      methodDesc: "В настоящее время поддерживается только отправка USDT через блокчейн Solana",
      addressNote: "Мы будем постоянно обновлять список пожертвований на странице пожертвований",
      advantagesTitle: "Преимущества Freeanime.org",
      advantages: [
        "Без рекламы",
        "Мультиязычность",
        "GOlang",
        "Next.js",
        "React",
      ],
    },
    countdown: {
      launching: "Скоро запуск",
      days: "Дней",
      hours: "Часов",
      minutes: "Минут",
      seconds: "Секунд",
    },
    drives: {
      title: "Limitless Search поддерживает",
      baidu: "Baidu Netdisk",
      aliyun: "Aliyun Drive",
      quark: "Quark Drive",
      tianyi: "Tianyi Cloud",
      pikpak: "PikPak",
      pan115: "115 Drive",
      xunlei: "Xunlei Drive",
      uc: "UC Drive",
      yidong: "Mobile Cloud",
      pan123: "123 Drive",
      magnet: "Magnet Link",
      ed2k: "eDonkey Link",
    },
    about: {
      title: "О Limitless Search",
      content:
        "Limitless Search, поддерживаемый Maishan, Inc и SMV, объединяет облачные поиски, позволяя быстро находить аниме без входа.",
      contact: "Limitless Search Powered by Maishan,Inc",
    },
    footer: {
      terms: "Условия использования",
      privacy: "Политика конфиденциальности",
      security: "Политика безопасности",
      regions: "Поддерживаемые регионы",
      cookies: "Управление Cookies",
      doNotShare: "Не передавать мои персональные данные",
      rights:
        "Copyright © {year} Maishan,Inc All rights reserved Limitless Search",
    },
  },
  fr: {
    nav: {
      community: "Communauté",
      download: "Télécharger",
      about: "À propos",
      improveCommunity: "Améliorer la communauté avec nous",
    },
    hero: {
      title: "Recherchez tous les animés sans connexion",
    },
    search: {
      placeholder: "Rechercher un animé…",
      cta: "Rechercher",
      loading: "Recherche de nouvelles ressources…",
      emptyQuery: "Veuillez saisir un terme de recherche",
      errorGeneric: "Échec de la recherche, réessayez plus tard",
      resultsCount: "{count} résultats trouvés",
      lastUpdated: "Dernière mise à jour",
      noResults: "Aucun résultat",
      filterSource: "Filtrer par source",
      allSources: "Toutes les sources",
      selectSource: "Choisir une source",
      selectDrive: "Tous les types",
      apply: "Valider",
      cancel: "Annuler",
      prevPage: "Précédent",
      nextPage: "Suivant",
      starCallout: "Si Limitless-search vous aide, merci de nous donner une étoile",
      starCta: "GitHub Star",
      statsPlatformsLabel: "Plateformes",
      statsIpLabel: "IP de la requête",
      statsCountryLabel: "Pays/Région",
      statsLatencyLabel: "Latence de recherche",
      statsNotProvided: "Non fourni",
      statsMeasuring: "Mesure en cours",
      errors: {
        title: "Problème de recherche",
        headline: "Impossible de terminer la recherche",
        verificationMissing:
          "Le service de vérification n'est pas configuré. Activez-le ou désactivez-le côté backend puis réessayez.",
        backendUnavailable:
          "Le service de recherche est indisponible. Vérifiez que le conteneur backend est en cours d'exécution.",
        generic: "Une erreur inconnue s’est produite. Veuillez réessayer plus tard.",
        detailsLabel: "Détails techniques",
        close: "Fermer",
      },
      captcha: {
        title: "Vérification de sécurité",
        description: "Veuillez compléter le captcha pour continuer la recherche",
      },
      suggest: {
        modalTitle: "Pas assez de résultats ? Essaye le titre original",
        modalDesc: "L’IA peut deviner le nom officiel japonais/anglais. Appliquez puis relancez la recherche.",
        recommend: "Recommandation",
        apply: "Appliquer",
        search: "Relancer",
        floatingTitle: "Rien de trouvé ?",
        floatingDesc: "Essayer le nom original (IA)",
        loading: "IA en réflexion…",
        failed: "Suggestion IA échouée",
        close: "Fermer",
        captchaRequired: "Validez le captcha avant l’IA",
      },
    },
    donate: {
      title: "Faire un don à Freeanime.org",
      description: "Tous les dons reçus par Freeanime.org sont utilisés pour la communauté Freeanime.org",
      supportedMethods: "Méthodes de don prises en charge",
      methodDesc: "Actuellement, seul l'envoi d'USDT via la blockchain Solana est pris en charge",
      addressNote: "Nous mettrons continuellement à jour la liste des dons sur la page de dons",
      advantagesTitle: "Les atouts de Freeanime.org",
      advantages: [
        "Sans publicité",
        "Multilingue",
        "GOlang",
        "Next.js",
        "React",
      ],
    },
    countdown: {
      launching: "Bientôt disponible",
      days: "Jours",
      hours: "Heures",
      minutes: "Minutes",
      seconds: "Secondes",
    },
    drives: {
      title: "Limitless Search prend en charge",
      baidu: "Baidu Netdisk",
      aliyun: "Aliyun Drive",
      quark: "Quark Drive",
      tianyi: "Tianyi Cloud",
      pikpak: "PikPak",
      pan115: "115 Drive",
      xunlei: "Xunlei Drive",
      uc: "UC Drive",
      yidong: "Mobile Cloud",
      pan123: "123 Drive",
      magnet: "Lien Magnet",
      ed2k: "Lien eDonkey",
    },
    about: {
      title: "À propos de Limitless Search",
      content:
        "Limitless Search, maintenu par Maishan, Inc et SMV, unifie la recherche cloud pour trouver rapidement des animés sans connexion.",
      contact: "Limitless Search Powered by Maishan,Inc",
    },
    footer: {
      terms: "Conditions d'utilisation",
      privacy: "Politique de confidentialité",
      security: "Politique de sécurité",
      regions: "Régions prises en charge",
      cookies: "Gérer les cookies",
      doNotShare: "Ne pas partager mes informations personnelles",
      rights:
        "Copyright © {year} Maishan,Inc All rights reserved Limitless Search",
    },
  },
};

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const useLanguage = create<LanguageState>((set) => ({
  language: "zh",
  setLanguage: (lang) => set({ language: lang, t: translations[lang] }),
  t: translations["zh"],
}));
