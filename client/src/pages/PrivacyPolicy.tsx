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
        <li><strong>Email address</strong> (required for login)</li>
        <li><strong>Password</strong> (encrypted, only if using email registration)</li>
        <li><strong>Google profile data</strong> (only if signing in with Google):
          <ul>
            <li>Display name (optional, automatically provided by Google)</li>
            <li>Profile photo (optional, automatically provided by Google)</li>
          </ul>
        </li>
      </ul>
      <p><em>Note: We do NOT ask you to provide your name separately. Name information only comes from Google sign-in if you choose that option.</em></p>

      <h3>2.2 Learning Content</h3>
      <p>We store the content you create:</p>
      <ul>
        <li>Mind maps (words and their relationships)</li>
        <li>Flashcard decks (words and definitions)</li>
        <li>Learning progress (which cards you've marked as known)</li>
      </ul>

      <h3>2.3 Usage Data</h3>
      <p>We track feature usage for token management:</p>
      <ul>
        <li>Number of AI queries (example sentences, synonym comparisons, flashcard generation)</li>
        <li>Token balance and usage history</li>
        <li>Subscription plan (free or pro)</li>
      </ul>

      <h3>2.4 Technical Information</h3>
      <p>We automatically collect minimal technical data:</p>
      <ul>
        <li>Error logs (only when errors occur, for debugging)</li>
        <li>Language preference setting</li>
        <li>Theme preference (light/dark mode)</li>
      </ul>
      <p><em>We do NOT collect device IDs, location data, or browsing history.</em></p>

      <h3>2.5 App Usage Analytics</h3>
      <p>We use Firebase Analytics to understand app usage patterns. This helps us improve the app and identify which features are most valuable to users.</p>
      <ul>
        <li>Feature usage (e.g., number of times you generate example sentences or create flashcards)</li>
        <li>Device type and operating system version</li>
        <li>Language preference (English or Traditional Chinese)</li>
        <li>App version</li>
      </ul>
      <p><em>Analytics data is anonymous and aggregated. We cannot identify individual users from analytics data.</em></p>

      <h2>3. How We Use Your Information</h2>
      <p>We use your information ONLY to:</p>
      <ul>
        <li><strong>Provide Services:</strong> Enable mind maps, flashcards, and AI-generated content (definitions, examples, synonyms)</li>
        <li><strong>Save Your Work:</strong> Store your mind maps and flashcards so you can access them anytime</li>
        <li><strong>Manage Tokens:</strong> Track your token usage and balance for AI features</li>
        <li><strong>Authentication:</strong> Verify your identity when you sign in</li>
        <li><strong>Support:</strong> Help you if you contact us with issues</li>
      </ul>
      <p><em>We do NOT use your data for advertising, marketing, or selling to third parties.</em></p>

      <h2>4. Third-Party Services</h2>
      <p>We use the following third-party services:</p>
      
      <h3>4.1 Firebase (Google)</h3>
      <ul>
        <li><strong>Purpose:</strong> User authentication and app usage analytics</li>
        <li><strong>Data Shared:</strong> Email address and authentication tokens</li>
        <li><strong>Analytics:</strong> We use Firebase Analytics to understand how users interact with our app. This includes anonymous usage statistics such as feature usage (e.g., how many times users generate example sentences), device type, and language preference. No personal information (email, name) is shared with Analytics.</li>
        <li><strong>NOT Used:</strong> Firebase Crashlytics or other tracking services</li>
        <li><strong>Privacy Policy:</strong> <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener">Firebase Privacy</a></li>
      </ul>

      <h3>4.2 OpenAI</h3>
      <ul>
        <li><strong>Purpose:</strong> Generate AI content (word definitions, example sentences, synonym comparisons)</li>
        <li><strong>Data Shared:</strong> ONLY the English words/phrases you query (e.g., "happy", "accomplish")</li>
        <li><strong>NOT Shared:</strong> Your email, profile data, or any other personal information</li>
        <li><strong>Data Retention:</strong> OpenAI does not store the words we send after processing</li>
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
        <li><strong>Email:</strong> support@wevro.co</li>
        <li><strong>App:</strong> Settings → Account</li>
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
        <li><strong>電子郵件地址</strong>（用於登入，必需）</li>
        <li><strong>密碼</strong>（已加密，僅在使用 Email 註冊時）</li>
        <li><strong>Google 個人資料</strong>（僅在使用 Google 登入時）：
          <ul>
            <li>顯示名稱（選用，由 Google 自動提供）</li>
            <li>大頭照（選用，由 Google 自動提供）</li>
          </ul>
        </li>
      </ul>
      <p><em>注意：我們「不會」要求您填寫姓名。姓名資訊僅在您選擇 Google 登入時由 Google 自動提供。</em></p>

      <h3>2.2 學習內容</h3>
      <p>我們儲存您建立的內容：</p>
      <ul>
        <li>心智圖（單字及其關聯）</li>
        <li>字卡組（單字和定義）</li>
        <li>學習進度（您標記為已知的字卡）</li>
      </ul>

      <h3>2.3 使用數據</h3>
      <p>我們追蹤功能使用情況以管理點數：</p>
      <ul>
        <li>AI 查詢次數（例句生成、同義詞比較、字卡生成）</li>
        <li>點數餘額和使用歷史</li>
        <li>訂閱方案（免費或 Pro）</li>
      </ul>

      <h3>2.4 技術資訊</h3>
      <p>我們自動收集最少量的技術資料：</p>
      <ul>
        <li>錯誤日誌（僅在發生錯誤時，用於除錯）</li>
        <li>語言偏好設定</li>
        <li>主題偏好（亮色/暗色模式）</li>
      </ul>
      <p><em>我們「不會」收集裝置 ID、位置資訊或瀏覽歷史。</em></p>

      <h3>2.5 應用程式使用分析</h3>
      <p>我們使用 Firebase Analytics 來了解應用程式使用模式。這有助於我們改進應用程式並識別哪些功能對使用者最有價值。</p>
      <ul>
        <li>功能使用情況（例如您生成例句或建立字卡的次數）</li>
        <li>裝置類型和作業系統版本</li>
        <li>語言偏好（英文或繁體中文）</li>
        <li>應用程式版本</li>
      </ul>
      <p><em>分析資料是匿名且匯總的。我們無法從分析資料中識別個別使用者。</em></p>

      <h2>3. 我們如何使用您的資訊</h2>
      <p>我們「僅」將您的資訊用於：</p>
      <ul>
        <li><strong>提供服務：</strong>啟用心智圖、字卡和 AI 生成內容（定義、例句、同義詞）</li>
        <li><strong>保存您的作品：</strong>儲存您的心智圖和字卡，讓您隨時可以存取</li>
        <li><strong>管理點數：</strong>追蹤您的點數使用情況和餘額</li>
        <li><strong>身份驗證：</strong>在您登入時驗證您的身份</li>
        <li><strong>客戶支援：</strong>在您聯繫我們時協助解決問題</li>
      </ul>
      <p><em>我們「不會」將您的資料用於廣告、行銷或販售給第三方。</em></p>

      <h2>4. 第三方服務</h2>
      <p>我們使用以下第三方服務：</p>
      
      <h3>4.1 Firebase (Google)</h3>
      <ul>
        <li><strong>用途：</strong>使用者身份驗證和應用程式使用分析</li>
        <li><strong>共享數據：</strong>電子郵件地址和身份驗證令牌</li>
        <li><strong>分析服務：</strong>我們使用 Firebase Analytics 來了解使用者如何使用我們的應用程式。這包括匿名使用統計資料，例如功能使用情況（例如使用者生成例句的次數）、裝置類型和語言偏好。不會將個人資訊（電子郵件、姓名）與 Analytics 共享。</li>
        <li><strong>未使用：</strong>Firebase Crashlytics 或其他追蹤服務</li>
        <li><strong>隱私政策：</strong><a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener">Firebase 隱私</a></li>
      </ul>

      <h3>4.2 OpenAI</h3>
      <ul>
        <li><strong>用途：</strong>生成 AI 內容（單字定義、例句、同義詞比較）</li>
        <li><strong>共享數據：</strong>「僅」您查詢的英文單字/短語（例如：「happy」、「accomplish」）</li>
        <li><strong>不會共享：</strong>您的電子郵件、個人資料或任何其他個人資訊</li>
        <li><strong>資料保留：</strong>OpenAI 處理完畢後不會儲存我們發送的單字</li>
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
        <li><strong>電子郵件：</strong>support@wevro.co</li>
        <li><strong>應用程式：</strong>設定 → 帳號管理</li>
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

