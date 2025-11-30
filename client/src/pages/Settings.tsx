import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useStartPage } from "@/contexts/StartPageContext";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, CreditCard, User2, FileText, Shield } from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/Header";

export default function Settings() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { startPage, setStartPage } = useStartPage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();


  return (
    <div className="h-full overflow-y-auto bg-background relative">
      <Header 
        title={language === "en" ? "Settings" : "設定"} 
        showLogo={false} 
        showTokens={false}
      />

      <div className="px-6 pb-32 space-y-6" style={{ paddingTop: '20px' }}>
        {/* Language Setting */}
        <div className="flex items-center justify-between gap-4">
          <Label className="text-base">
            {language === "en" ? "Language" : "語言"}
          </Label>
          <div className="flex gap-2">
            <Button
              variant={language === "en" ? "default" : "outline"}
              onClick={() => setLanguage("en")}
              size="sm"
              data-testid="button-language-english"
            >
              English
            </Button>
            <Button
              variant={language === "zh" ? "default" : "outline"}
              onClick={() => setLanguage("zh")}
              size="sm"
              data-testid="button-language-chinese"
            >
              繁體中文
            </Button>
          </div>
        </div>

        {/* Theme Setting */}
        <div className="flex items-center justify-between gap-4">
          <Label className="text-base">
            {language === "en" ? "Theme" : "主題"}
          </Label>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              size="sm"
              data-testid="button-theme-light"
            >
              {language === "en" ? "Light" : "淺色"}
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              size="sm"
              data-testid="button-theme-dark"
            >
              {language === "en" ? "Dark" : "深色"}
            </Button>
          </div>
        </div>

        {/* Start Page Setting */}
        <div className="flex items-center justify-between gap-4">
          <Label className="text-base">
            {language === "en" ? "Start Page" : "起始頁面"}
          </Label>
          <Select value={startPage} onValueChange={setStartPage}>
            <SelectTrigger className="w-48" data-testid="select-startpage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="query" data-testid="select-startpage-query">
                {language === "en" ? "Query" : "查詢"}
              </SelectItem>
              <SelectItem value="flashcards" data-testid="select-startpage-flashcards">
                {language === "en" ? "Flashcards" : "字卡"}
              </SelectItem>
              <SelectItem value="mindmaps" data-testid="select-startpage-mindmaps">
                {language === "en" ? "Mind Maps" : "心智圖"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Navigation Items */}
        <div className="space-y-3">
          {/* Pricing */}
          <button
            onClick={() => setLocation("/pricing")}
            className="flex items-center justify-between gap-4 w-full p-4 -mx-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
            data-testid="button-pricing"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">
                  {language === "en" ? "Pricing & Subscription" : "訂閱方案"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === "en" ? "View plans and upgrade" : "查看方案與升級"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Account */}
          {authLoading ? (
            <div className="flex items-center justify-between gap-4 w-full p-4 -mx-4 rounded-lg border border-dashed border-muted animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted/70" />
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-muted/70" />
                  <div className="h-3 w-32 rounded bg-muted/60" />
                </div>
              </div>
              <div className="w-5 h-5 rounded bg-muted/70" />
            </div>
          ) : isAuthenticated && user ? (
            <button
              onClick={() => setLocation("/account")}
              className="flex items-center justify-between gap-4 w-full p-4 -mx-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
              data-testid="button-account"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">
                    {language === "en" ? "Account" : "帳號管理"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {user.email}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ) : null}
        </div>

        <Separator />

        {/* Legal Section */}
        <div className="space-y-3">
          <button
            onClick={() => setLocation("/privacy-policy")}
            className="flex items-center justify-between gap-4 w-full p-4 -mx-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
            data-testid="button-privacy-policy"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">
                  {language === "en" ? "Privacy Policy" : "隱私政策"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => setLocation("/terms-of-service")}
            className="flex items-center justify-between gap-4 w-full p-4 -mx-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
            data-testid="button-terms"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">
                  {language === "en" ? "Terms of Service" : "使用條款"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Version Info */}
        <div className="pt-6 text-center text-xs text-muted-foreground">
          <div>Wevro v1.0.31</div>
          <div className="mt-1">© 2025 Wevro. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
