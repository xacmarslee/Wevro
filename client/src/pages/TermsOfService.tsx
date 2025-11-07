/**
 * Terms of Service Page
 * 使用條款頁面
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function TermsOfService() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {language === "en" ? "Terms of Service" : "使用條款"}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {language === "en" ? <EnglishTerms /> : <ChineseTerms />}
        </div>
      </div>
    </div>
  );
}

function EnglishTerms() {
  return (
    <>
      <p className="text-sm text-muted-foreground mb-8">
        Last Updated: {new Date().toLocaleDateString("en-US", { 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        })}
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing and using Wevro ("the Service"), you agree to be bound by these Terms 
        of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Wevro is an AI-powered English learning application that provides:
      </p>
      <ul>
        <li>Mind map creation and editing for vocabulary learning</li>
        <li>Flashcard generation and spaced repetition practice</li>
        <li>AI-generated example sentences and definitions</li>
        <li>Synonym comparison and analysis</li>
        <li>Dictionary lookup services</li>
      </ul>

      <h2>3. User Accounts</h2>
      
      <h3>3.1 Registration</h3>
      <p>
        You must create an account to use certain features of the Service. You agree to:
      </p>
      <ul>
        <li>Provide accurate and complete information</li>
        <li>Maintain the security of your account credentials</li>
        <li>Notify us immediately of any unauthorized access</li>
        <li>Be responsible for all activities under your account</li>
      </ul>

      <h3>3.2 Account Termination</h3>
      <p>
        We reserve the right to suspend or terminate your account if:
      </p>
      <ul>
        <li>You violate these Terms</li>
        <li>You engage in fraudulent or illegal activities</li>
        <li>You abuse or misuse the Service</li>
        <li>Your account is inactive for an extended period</li>
      </ul>

      <h2>4. Token System and Pricing</h2>
      
      <h3>4.1 Free Tier</h3>
      <ul>
        <li>30 tokens upon registration</li>
        <li>1 token per day for daily login</li>
        <li>Unlimited mind map creation</li>
        <li>Unlimited dictionary lookups</li>
      </ul>

      <h3>4.2 Token Consumption</h3>
      <ul>
        <li>Flashcard generation: 1 token per 10 cards</li>
        <li>Example sentences: 2 tokens per query</li>
        <li>Synonym comparison: 2 tokens per query</li>
      </ul>

      <h3>4.3 Pro Subscription (Optional)</h3>
      <p>
        Pro subscription provides 180 tokens per month and additional benefits. Subscription 
        terms and pricing are displayed in the app and may change with notice.
      </p>

      <h2>5. User Content</h2>
      
      <h3>5.1 Your Content</h3>
      <p>
        You retain ownership of the content you create (mind maps, flashcards, notes). 
        By using the Service, you grant us a license to store, display, and process your 
        content to provide the Service.
      </p>

      <h3>5.2 Content Guidelines</h3>
      <p>You agree not to create or share content that:</p>
      <ul>
        <li>Violates laws or regulations</li>
        <li>Infringes on intellectual property rights</li>
        <li>Contains harmful, offensive, or inappropriate material</li>
        <li>Promotes illegal activities or violence</li>
      </ul>

      <h2>6. AI-Generated Content</h2>
      <p>
        The Service uses AI to generate content (definitions, examples, synonyms). While we 
        strive for accuracy, AI-generated content may occasionally contain errors or 
        inaccuracies. You should verify important information from authoritative sources.
      </p>

      <h2>7. Intellectual Property</h2>
      
      <h3>7.1 Our Rights</h3>
      <p>
        The Service, including its design, code, features, and branding, is protected by 
        intellectual property rights. You may not:
      </p>
      <ul>
        <li>Copy, modify, or reverse engineer the Service</li>
        <li>Use our trademarks or branding without permission</li>
        <li>Create derivative works based on the Service</li>
      </ul>

      <h3>7.2 User Rights</h3>
      <p>
        You retain all rights to your original content. We do not claim ownership of your 
        mind maps, flashcards, or other user-generated content.
      </p>

      <h2>8. Prohibited Activities</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for illegal purposes</li>
        <li>Attempt to hack, disrupt, or damage the Service</li>
        <li>Create fake accounts or impersonate others</li>
        <li>Share your account with others</li>
        <li>Use automated tools to scrape or harvest data</li>
        <li>Overload or abuse our servers</li>
        <li>Resell or redistribute the Service</li>
      </ul>

      <h2>9. Service Availability</h2>
      <p>
        We strive to provide reliable service but do not guarantee:
      </p>
      <ul>
        <li>Uninterrupted or error-free access</li>
        <li>Specific uptime percentages</li>
        <li>Compatibility with all devices</li>
      </ul>
      <p>
        We reserve the right to modify, suspend, or discontinue the Service at any time 
        with or without notice.
      </p>

      <h2>10. Disclaimer of Warranties</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL 
        WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS 
        FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </p>

      <h2>11. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, 
        PROFITS, OR BUSINESS OPPORTUNITIES.
      </p>

      <h2>12. Indemnification</h2>
      <p>
        You agree to indemnify and hold us harmless from any claims, damages, or expenses 
        arising from your use of the Service or violation of these Terms.
      </p>

      <h2>13. Modifications to Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify you of significant 
        changes by posting the updated Terms in the app. Your continued use after changes 
        constitutes acceptance of the new Terms.
      </p>

      <h2>14. Governing Law</h2>
      <p>
        These Terms are governed by the laws of [Your Jurisdiction]. Any disputes shall 
        be resolved in the courts of [Your Jurisdiction].
      </p>

      <h2>15. Contact Us</h2>
      <p>
        If you have questions about these Terms, please contact us:
      </p>
      <ul>
        <li><strong>Email:</strong> xacmarslee@gmail.com</li>
        <li><strong>App:</strong> Settings → Account</li>
      </ul>
    </>
  );
}

function ChineseTerms() {
  return (
    <>
      <p className="text-sm text-muted-foreground mb-8">
        最後更新：{new Date().toLocaleDateString("zh-TW", { 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        })}
      </p>

      <h2>1. 條款接受</h2>
      <p>
        使用 Wevro（「本服務」），即表示您同意受本使用條款（「條款」）的約束。
        如果您不同意這些條款，請勿使用本服務。
      </p>

      <h2>2. 服務說明</h2>
      <p>Wevro 是一個 AI 驅動的英文學習應用程式，提供：</p>
      <ul>
        <li>心智圖建立和編輯功能用於詞彙學習</li>
        <li>字卡生成和間隔重複練習</li>
        <li>AI 生成的例句和定義</li>
        <li>同義詞比較和分析</li>
        <li>字典查詢服務</li>
      </ul>

      <h2>3. 用戶帳號</h2>
      
      <h3>3.1 註冊</h3>
      <p>您必須建立帳號才能使用本服務的某些功能。您同意：</p>
      <ul>
        <li>提供準確和完整的資訊</li>
        <li>維護帳號憑證的安全</li>
        <li>立即通知我們任何未經授權的訪問</li>
        <li>對您帳號下的所有活動負責</li>
      </ul>

      <h3>3.2 帳號終止</h3>
      <p>在以下情況下，我們保留暫停或終止您帳號的權利：</p>
      <ul>
        <li>您違反這些條款</li>
        <li>您從事詐欺或非法活動</li>
        <li>您濫用或誤用本服務</li>
        <li>您的帳號長期處於非活動狀態</li>
      </ul>

      <h2>4. 點數系統和定價</h2>
      
      <h3>4.1 免費方案</h3>
      <ul>
        <li>註冊時獲得 30 點</li>
        <li>每日登入獲得 1 點</li>
        <li>無限制建立心智圖</li>
        <li>無限制字典查詢</li>
      </ul>

      <h3>4.2 點數消耗</h3>
      <ul>
        <li>字卡生成：每 10 張卡片 1 點</li>
        <li>例句生成：每次查詢 2 點</li>
        <li>同義詞比較：每次查詢 2 點</li>
      </ul>

      <h3>4.3 Pro 訂閱（可選）</h3>
      <p>
        Pro 訂閱每月提供 180 點和額外福利。訂閱條款和定價顯示在應用程式中，
        可能會在通知後變更。
      </p>

      <h2>5. 用戶內容</h2>
      
      <h3>5.1 您的內容</h3>
      <p>
        您保留對所建立內容（心智圖、字卡、筆記）的所有權。使用本服務即表示您
        授予我們儲存、顯示和處理您內容以提供服務的許可。
      </p>

      <h3>5.2 內容指南</h3>
      <p>您同意不建立或分享以下內容：</p>
      <ul>
        <li>違反法律或法規</li>
        <li>侵犯智慧財產權</li>
        <li>包含有害、冒犯或不當的材料</li>
        <li>宣傳非法活動或暴力</li>
      </ul>

      <h2>6. AI 生成的內容</h2>
      <p>
        本服務使用 AI 生成內容（定義、例句、同義詞）。雖然我們力求準確，但 AI 
        生成的內容偶爾可能包含錯誤或不準確之處。您應該從權威來源驗證重要資訊。
      </p>

      <h2>7. 智慧財產權</h2>
      
      <h3>7.1 我們的權利</h3>
      <p>
        本服務，包括其設計、程式碼、功能和品牌，受智慧財產權保護。您不得：
      </p>
      <ul>
        <li>複製、修改或逆向工程本服務</li>
        <li>未經許可使用我們的商標或品牌</li>
        <li>基於本服務建立衍生作品</li>
      </ul>

      <h3>7.2 用戶權利</h3>
      <p>
        您保留對原創內容的所有權利。我們不主張對您的心智圖、字卡或其他
        用戶生成內容的所有權。
      </p>

      <h2>8. 禁止活動</h2>
      <p>您同意不：</p>
      <ul>
        <li>將本服務用於非法目的</li>
        <li>嘗試駭入、破壞或損害本服務</li>
        <li>建立假帳號或冒充他人</li>
        <li>與他人共享您的帳號</li>
        <li>使用自動化工具抓取或收集數據</li>
        <li>超載或濫用我們的伺服器</li>
        <li>轉售或重新分發本服務</li>
      </ul>

      <h2>9. 服務可用性</h2>
      <p>我們努力提供可靠的服務，但不保證：</p>
      <ul>
        <li>不間斷或無錯誤的訪問</li>
        <li>特定的正常運行時間百分比</li>
        <li>與所有設備的兼容性</li>
      </ul>
      <p>
        我們保留隨時修改、暫停或終止本服務的權利，無論是否通知。
      </p>

      <h2>10. 免責聲明</h2>
      <p>
        本服務按「現狀」提供，不提供任何形式的保證。我們不承擔所有明示或暗示的保證，
        包括適銷性、特定用途適用性和不侵權的保證。
      </p>

      <h2>11. 責任限制</h2>
      <p>
        在法律允許的最大範圍內，我們不對任何間接、附帶、特殊、後果性或懲罰性損害負責，
        包括數據、利潤或商業機會的損失。
      </p>

      <h2>12. 賠償</h2>
      <p>
        您同意賠償並使我們免受因您使用本服務或違反這些條款而產生的任何索賠、
        損害或費用。
      </p>

      <h2>13. 條款修改</h2>
      <p>
        我們可能會不時更新這些條款。我們將通過在應用程式中發布更新後的條款來
        通知您重大變更。在變更後繼續使用即表示接受新條款。
      </p>

      <h2>14. 管轄法律</h2>
      <p>
        這些條款受 [您的管轄區] 法律管轄。任何爭議應在 [您的管轄區] 法院解決。
      </p>

      <h2>15. 聯繫我們</h2>
      <p>如果您對這些條款有疑問，請聯繫我們：</p>
      <ul>
        <li><strong>電子郵件：</strong>xacmarslee@gmail.com</li>
        <li><strong>應用程式：</strong>設定 → 帳號管理</li>
      </ul>
    </>
  );
}

