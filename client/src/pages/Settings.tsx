import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useStartPage } from "@/contexts/StartPageContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { startPage, setStartPage } = useStartPage();

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-auto pb-24">
      <h1 className="text-3xl font-bold">
        {language === "en" ? "Settings" : "設定"}
      </h1>

      <div className="space-y-6">
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
      </div>
    </div>
  );
}
