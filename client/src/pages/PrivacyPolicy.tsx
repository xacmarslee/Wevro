/**
 * Privacy Policy Page
 * 隱私政策頁面
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
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
            {language === "en" ? "Privacy Policy" : "隱私政策"}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {language === "en" ? <EnglishPolicy /> : <ChinesePolicy />}
        </div>
      </div>
    </div>
  );
}

function EnglishPolicy() {
  return (
    <>
      <p className="text-sm text-muted-foreground mb-8">
        Last Updated: {new Date().toLocaleDateString("en-US", { 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        })}
      </p>

      <h2>1. Introduction</h2>
      <p>
        Welcome to Wevro ("we," "our," or "us"). We are committed to protecting your privacy 
        and ensuring the security of your personal information. This Privacy Policy explains 
        how we collect, use, and protect your information when you use our mobile application 
        and services.
      </p>

      <h2>2. Information We Collect</h2>
      
      <h3>2.1 Account Information</h3>
      <p>When you create an account, we collect:</p>
      <ul>
        <li>Email address</li>
        <li>Name (optional)</li>
        <li>Profile information</li>
        <li>Authentication credentials</li>
      </ul>

      <h3>2.2 Usage Data</h3>
      <p>We collect information about how you use Wevro:</p>
      <ul>
        <li>Mind maps you create</li>
        <li>Flashcards you generate and practice</li>
        <li>Words you look up</li>
        <li>AI features you use (example sentences, synonyms)</li>
        <li>Learning progress and statistics</li>
      </ul>

      <h3>2.3 Device Information</h3>
      <p>We automatically collect certain device information:</p>
      <ul>
        <li>Device type and model</li>
        <li>Operating system version</li>
        <li>App version</li>
        <li>Language preference</li>
        <li>Error logs and crash reports</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li><strong>Provide Services:</strong> Enable core features like mind maps, flashcards, and AI-generated content</li>
        <li><strong>Personalization:</strong> Customize your learning experience and track your progress</li>
        <li><strong>Improvement:</strong> Analyze usage patterns to improve our app and features</li>
        <li><strong>Communication:</strong> Send important updates, notifications, and support messages</li>
        <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security issues</li>
      </ul>

      <h2>4. Third-Party Services</h2>
      <p>We use the following third-party services:</p>
      
      <h3>4.1 Firebase (Google)</h3>
      <ul>
        <li><strong>Purpose:</strong> Authentication, database, and analytics</li>
        <li><strong>Data Shared:</strong> Email, usage data, device information</li>
        <li><strong>Privacy Policy:</strong> <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener">Firebase Privacy</a></li>
      </ul>

      <h3>4.2 OpenAI</h3>
      <ul>
        <li><strong>Purpose:</strong> AI-powered content generation (definitions, examples, synonyms)</li>
        <li><strong>Data Shared:</strong> Words and phrases you query (no personal information)</li>
        <li><strong>Privacy Policy:</strong> <a href="https://openai.com/privacy" target="_blank" rel="noopener">OpenAI Privacy</a></li>
      </ul>

      <h3>4.3 Neon Database</h3>
      <ul>
        <li><strong>Purpose:</strong> Secure data storage</li>
        <li><strong>Data Shared:</strong> Your learning data (mind maps, flashcards)</li>
        <li><strong>Privacy Policy:</strong> <a href="https://neon.tech/privacy-policy" target="_blank" rel="noopener">Neon Privacy</a></li>
      </ul>

      <h2>5. Data Storage and Security</h2>
      <p>
        We implement industry-standard security measures to protect your data:
      </p>
      <ul>
        <li><strong>Encryption:</strong> All data is encrypted in transit (HTTPS) and at rest</li>
        <li><strong>Authentication:</strong> Secure Firebase authentication with token-based sessions</li>
        <li><strong>Access Control:</strong> Strict access controls to prevent unauthorized access</li>
        <li><strong>Regular Backups:</strong> Automated backups to prevent data loss</li>
      </ul>

      <h2>6. Your Rights</h2>
      <p>You have the following rights regarding your data:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of your personal data</li>
        <li><strong>Correction:</strong> Update or correct inaccurate information</li>
        <li><strong>Deletion:</strong> Request deletion of your account and data</li>
        <li><strong>Export:</strong> Download your learning data in a portable format</li>
        <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
      </ul>

      <h2>7. Data Retention</h2>
      <p>
        We retain your data for as long as your account is active. If you delete your account, 
        we will permanently delete your personal data within 30 days, except for:
      </p>
      <ul>
        <li>Data required by law to be retained</li>
        <li>Anonymous usage statistics (no personal identifiers)</li>
        <li>Backup copies (deleted within 90 days)</li>
      </ul>

      <h2>8. Children's Privacy</h2>
      <p>
        Wevro is not intended for children under 13 years old. We do not knowingly collect 
        personal information from children under 13. If you believe we have collected 
        information from a child under 13, please contact us immediately.
      </p>

      <h2>9. International Data Transfers</h2>
      <p>
        Your data may be processed and stored in different countries where our service 
        providers operate. We ensure appropriate safeguards are in place to protect your 
        data in accordance with this Privacy Policy.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any 
        significant changes by posting the new policy in the app and updating the "Last 
        Updated" date. Your continued use of Wevro after changes constitutes acceptance 
        of the updated policy.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        If you have questions or concerns about this Privacy Policy or your data, please 
        contact us:
      </p>
      <ul>
        <li><strong>Email:</strong> privacy@wevro.app</li>
        <li><strong>App:</strong> Settings → Help & Support</li>
      </ul>

      <h2>12. GDPR Compliance (For EU Users)</h2>
      <p>
        If you are in the European Union, you have additional rights under the General 
        Data Protection Regulation (GDPR):
      </p>
      <ul>
        <li>Right to be informed about data processing</li>
        <li>Right to access your personal data</li>
        <li>Right to rectification of inaccurate data</li>
        <li>Right to erasure ("right to be forgotten")</li>
        <li>Right to restrict processing</li>
        <li>Right to data portability</li>
        <li>Right to object to processing</li>
        <li>Rights related to automated decision-making</li>
      </ul>
      <p>
        Our legal basis for processing your data is your consent, contract performance, 
        and legitimate interests in providing and improving our services.
      </p>
    </>
  );
}

function ChinesePolicy() {
  return (
    <>
      <p className="text-sm text-muted-foreground mb-8">
        最後更新：{new Date().toLocaleDateString("zh-TW", { 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        })}
      </p>

      <h2>1. 簡介</h2>
      <p>
        歡迎使用 Wevro（「我們」、「我們的」）。我們致力於保護您的隱私並確保您個人資料的安全。
        本隱私政策說明當您使用我們的行動應用程式和服務時，我們如何收集、使用和保護您的資訊。
      </p>

      <h2>2. 我們收集的資訊</h2>
      
      <h3>2.1 帳號資訊</h3>
      <p>當您建立帳號時，我們會收集：</p>
      <ul>
        <li>電子郵件地址</li>
        <li>姓名（選填）</li>
        <li>個人資料</li>
        <li>身份驗證憑證</li>
      </ul>

      <h3>2.2 使用數據</h3>
      <p>我們收集您如何使用 Wevro 的資訊：</p>
      <ul>
        <li>您建立的心智圖</li>
        <li>您生成和練習的字卡</li>
        <li>您查詢的單字</li>
        <li>您使用的 AI 功能（例句、同義詞）</li>
        <li>學習進度和統計數據</li>
      </ul>

      <h3>2.3 設備資訊</h3>
      <p>我們自動收集某些設備資訊：</p>
      <ul>
        <li>設備類型和型號</li>
        <li>作業系統版本</li>
        <li>應用程式版本</li>
        <li>語言偏好</li>
        <li>錯誤日誌和崩潰報告</li>
      </ul>

      <h2>3. 我們如何使用您的資訊</h2>
      <p>我們使用您的資訊來：</p>
      <ul>
        <li><strong>提供服務：</strong>啟用核心功能，如心智圖、字卡和 AI 生成內容</li>
        <li><strong>個人化：</strong>自訂您的學習體驗並追蹤您的進度</li>
        <li><strong>改進：</strong>分析使用模式以改進我們的應用程式和功能</li>
        <li><strong>通訊：</strong>發送重要更新、通知和支援訊息</li>
        <li><strong>安全：</strong>偵測和防止詐騙、濫用和安全問題</li>
      </ul>

      <h2>4. 第三方服務</h2>
      <p>我們使用以下第三方服務：</p>
      
      <h3>4.1 Firebase (Google)</h3>
      <ul>
        <li><strong>用途：</strong>身份驗證、資料庫和分析</li>
        <li><strong>共享數據：</strong>電子郵件、使用數據、設備資訊</li>
        <li><strong>隱私政策：</strong><a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener">Firebase 隱私</a></li>
      </ul>

      <h3>4.2 OpenAI</h3>
      <ul>
        <li><strong>用途：</strong>AI 驅動的內容生成（定義、例句、同義詞）</li>
        <li><strong>共享數據：</strong>您查詢的單字和短語（不包含個人資訊）</li>
        <li><strong>隱私政策：</strong><a href="https://openai.com/privacy" target="_blank" rel="noopener">OpenAI 隱私</a></li>
      </ul>

      <h3>4.3 Neon Database</h3>
      <ul>
        <li><strong>用途：</strong>安全數據存儲</li>
        <li><strong>共享數據：</strong>您的學習數據（心智圖、字卡）</li>
        <li><strong>隱私政策：</strong><a href="https://neon.tech/privacy-policy" target="_blank" rel="noopener">Neon 隱私</a></li>
      </ul>

      <h2>5. 數據存儲和安全</h2>
      <p>我們實施業界標準的安全措施來保護您的數據：</p>
      <ul>
        <li><strong>加密：</strong>所有數據在傳輸（HTTPS）和儲存時都經過加密</li>
        <li><strong>身份驗證：</strong>使用基於令牌的會話進行安全的 Firebase 身份驗證</li>
        <li><strong>訪問控制：</strong>嚴格的訪問控制以防止未經授權的訪問</li>
        <li><strong>定期備份：</strong>自動備份以防止數據丟失</li>
      </ul>

      <h2>6. 您的權利</h2>
      <p>您對您的數據擁有以下權利：</p>
      <ul>
        <li><strong>訪問：</strong>請求獲取您個人資料的副本</li>
        <li><strong>更正：</strong>更新或更正不準確的資訊</li>
        <li><strong>刪除：</strong>請求刪除您的帳號和數據</li>
        <li><strong>匯出：</strong>以可攜式格式下載您的學習數據</li>
        <li><strong>選擇退出：</strong>取消訂閱行銷通訊</li>
      </ul>

      <h2>7. 數據保留</h2>
      <p>
        只要您的帳號處於活動狀態，我們就會保留您的數據。如果您刪除帳號，
        我們將在 30 天內永久刪除您的個人資料，除了：
      </p>
      <ul>
        <li>法律要求保留的數據</li>
        <li>匿名使用統計（無個人識別資訊）</li>
        <li>備份副本（90 天內刪除）</li>
      </ul>

      <h2>8. 兒童隱私</h2>
      <p>
        Wevro 不適用於 13 歲以下的兒童。我們不會故意收集 13 歲以下兒童的個人資訊。
        如果您認為我們收集了 13 歲以下兒童的資訊，請立即與我們聯繫。
      </p>

      <h2>9. 國際數據傳輸</h2>
      <p>
        您的數據可能會在我們的服務提供商營運的不同國家/地區進行處理和存儲。
        我們確保採取適當的保護措施，根據本隱私政策保護您的數據。
      </p>

      <h2>10. 政策變更</h2>
      <p>
        我們可能會不時更新本隱私政策。我們將通過在應用程式中發布新政策並更新
        「最後更新」日期來通知您任何重大變更。在變更後繼續使用 Wevro 即表示
        接受更新後的政策。
      </p>

      <h2>11. 聯繫我們</h2>
      <p>如果您對本隱私政策或您的數據有疑問或疑慮，請聯繫我們：</p>
      <ul>
        <li><strong>電子郵件：</strong>privacy@wevro.app</li>
        <li><strong>應用程式：</strong>設定 → 幫助與支援</li>
      </ul>

      <h2>12. GDPR 合規（歐盟用戶）</h2>
      <p>如果您在歐盟，根據一般資料保護規範 (GDPR)，您擁有額外的權利：</p>
      <ul>
        <li>知情權（了解數據處理）</li>
        <li>訪問個人資料的權利</li>
        <li>更正不準確數據的權利</li>
        <li>刪除權（「被遺忘權」）</li>
        <li>限制處理的權利</li>
        <li>數據可攜性權利</li>
        <li>反對處理的權利</li>
        <li>與自動化決策相關的權利</li>
      </ul>
      <p>
        我們處理您數據的法律依據是您的同意、合約履行以及提供和改進我們服務的合法利益。
      </p>
    </>
  );
}

