import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useStartPage } from "@/contexts/StartPageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Languages, Moon, Sun, Home } from "lucide-react";

export default function Settings() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { startPage, setStartPage } = useStartPage();

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {language === "en" ? "Settings" : "設定"}
        </h1>
        <p className="text-muted-foreground">
          {language === "en" 
            ? "Customize your learning experience" 
            : "自訂您的學習體驗"}
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {language === "en" ? "Language" : "語言"}
            </CardTitle>
            <CardDescription>
              {language === "en" 
                ? "Choose your preferred interface language" 
                : "選擇您偏好的介面語言"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={language === "en" ? "default" : "outline"}
                onClick={() => setLanguage("en")}
                className="flex-1"
                data-testid="button-language-english"
              >
                English
              </Button>
              <Button
                variant={language === "zh" ? "default" : "outline"}
                onClick={() => setLanguage("zh")}
                className="flex-1"
                data-testid="button-language-chinese"
              >
                繁體中文
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              {language === "en" ? "Theme" : "主題"}
            </CardTitle>
            <CardDescription>
              {language === "en" 
                ? "Choose between light and dark mode" 
                : "選擇淺色或深色模式"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
                className="flex-1"
                data-testid="button-theme-light"
              >
                <Sun className="h-4 w-4 mr-2" />
                {language === "en" ? "Light" : "淺色"}
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
                className="flex-1"
                data-testid="button-theme-dark"
              >
                <Moon className="h-4 w-4 mr-2" />
                {language === "en" ? "Dark" : "深色"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              {language === "en" ? "Start Page" : "起始頁面"}
            </CardTitle>
            <CardDescription>
              {language === "en" 
                ? "Choose which page to show when you open the app" 
                : "選擇開啟應用程式時要顯示的頁面"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              <Button
                variant={startPage === "query" ? "default" : "outline"}
                onClick={() => setStartPage("query")}
                className="w-full justify-start"
                data-testid="button-startpage-query"
              >
                {language === "en" ? "Query & Translation" : "查詢與翻譯"}
              </Button>
              <Button
                variant={startPage === "flashcards" ? "default" : "outline"}
                onClick={() => setStartPage("flashcards")}
                className="w-full justify-start"
                data-testid="button-startpage-flashcards"
              >
                {language === "en" ? "Flashcards" : "字卡"}
              </Button>
              <Button
                variant={startPage === "mindmaps" ? "default" : "outline"}
                onClick={() => setStartPage("mindmaps")}
                className="w-full justify-start"
                data-testid="button-startpage-mindmaps"
              >
                {language === "en" ? "Mind Maps" : "心智圖"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
