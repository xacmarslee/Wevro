/**
 * Account Management Page
 * 
 * 帳號管理頁面 - 顯示帳號資訊、登出、刪除帳號等功能
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Trash2, User, Mail, Calendar, ChevronLeft, Key, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Account() {
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // 修改密碼對話框狀態
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/user", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete account");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: language === "en" ? "Account deleted" : "帳號已刪除",
        description: language === "en" 
          ? "Your account has been permanently deleted." 
          : "您的帳號已永久刪除。",
      });
      // Redirect to home page after deletion
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: () => {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" 
          ? "Failed to delete account. Please try again." 
          : "刪除帳號失敗，請重試。",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      const { signOut } = await import("@/lib/firebase");
      await signOut();
      toast({
        title: language === "en" ? "Signed out" : "已登出",
        description: language === "en" ? "You have been signed out successfully" : "您已成功登出",
      });
    } catch (error) {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" ? "Failed to sign out" : "登出失敗",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { 
      currentPassword: string; 
      newPassword: string; 
    }) => {
      const { changePassword } = await import("@/lib/firebase");
      await changePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      toast({
        title: language === "en" ? "Password updated" : "密碼已更新",
        description: language === "en" 
          ? "Your password has been successfully updated." 
          : "您的密碼已成功更新。",
      });
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      let errorMessage = language === "en" 
        ? "Failed to update password" 
        : "更新密碼失敗";
      
      if (error.message.includes("incorrect")) {
        errorMessage = language === "en" 
          ? "Current password is incorrect" 
          : "目前密碼不正確";
      } else if (error.message.includes("weak")) {
        errorMessage = language === "en" 
          ? "New password is too weak" 
          : "新密碼強度不足";
      } else if (error.message.includes("recent")) {
        errorMessage = language === "en" 
          ? "Please sign out and sign in again first" 
          : "請先登出並重新登入";
      }
      
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = () => {
    // 驗證輸入
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" 
          ? "Please fill in all fields" 
          : "請填寫所有欄位",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" 
          ? "New passwords do not match" 
          : "新密碼不一致",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" 
          ? "Password must be at least 6 characters" 
          : "密碼至少需要 6 個字元",
        variant: "destructive",
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: language === "en" 
          ? "New password must be different from current password" 
          : "新密碼必須與目前密碼不同",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <p className="text-muted-foreground">
          {language === "en" ? "Please sign in to view account details" : "請登入以查看帳號資訊"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/settings")}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {language === "en" ? "Account" : "帳號管理"}
          </h1>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Account Info Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-muted-foreground">
                  {language === "en" ? "Email" : "電子郵件"}
                </div>
                <div className="text-base font-medium truncate">
                  {user.email}
                </div>
              </div>
            </div>

            <Separator />

            {/* User ID */}
            {user.id && (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-muted-foreground">
                      {language === "en" ? "User ID" : "使用者 ID"}
                    </div>
                    <div className="text-sm font-mono truncate text-muted-foreground">
                      {user.id}
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Account Created */}
            {user.createdAt && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-muted-foreground">
                    {language === "en" ? "Member Since" : "註冊時間"}
                  </div>
                  <div className="text-base">
                    {new Date(user.createdAt).toLocaleDateString(
                      language === "en" ? "en-US" : "zh-TW",
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {/* Change Password Button */}
          <Button 
            onClick={() => setShowPasswordDialog(true)}
            variant="outline"
            size="lg"
            className="w-full justify-start"
            data-testid="button-change-password"
          >
            <Key className="h-5 w-5 mr-3" />
            {language === "en" ? "Change Password" : "修改密碼"}
          </Button>

          {/* Sign Out Button */}
          <Button 
            onClick={handleLogout}
            variant="outline"
            size="lg"
            className="w-full justify-start"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 mr-3" />
            {language === "en" ? "Sign Out" : "登出"}
          </Button>

          {/* Delete Account Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline"
                size="lg"
                className="w-full justify-start text-destructive hover:text-destructive"
                data-testid="button-delete-account"
              >
                <Trash2 className="h-5 w-5 mr-3" />
                {language === "en" ? "Delete Account" : "刪除帳號"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {language === "en" 
                    ? "Are you absolutely sure?" 
                    : "您確定要刪除帳號嗎？"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {language === "en"
                    ? "This action cannot be undone. This will permanently delete your account and remove all your data from our servers."
                    : "此操作無法復原。這將永久刪除您的帳號，並從我們的伺服器移除所有資料。"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {language === "en" ? "Cancel" : "取消"}
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteAccountMutation.isPending ? (
                    <span>{language === "en" ? "Deleting..." : "刪除中..."}</span>
                  ) : (
                    <span>{language === "en" ? "Delete Account" : "刪除帳號"}</span>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Warning Notice */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 space-y-2 text-sm text-muted-foreground">
            <p>
              {language === "en" 
                ? "⚠️ Deleting your account will permanently remove:"
                : "⚠️ 刪除帳號後，以下資料將永久移除："}
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{language === "en" ? "All flashcard decks" : "所有字卡組"}</li>
              <li>{language === "en" ? "All mind maps" : "所有心智圖"}</li>
              <li>{language === "en" ? "Query history" : "查詢紀錄"}</li>
              <li>{language === "en" ? "Personal settings" : "個人設定"}</li>
            </ul>
            <p className="pt-2">
              {language === "en" 
                ? "This action cannot be undone. Please be certain before proceeding."
                : "此操作無法復原，請謹慎考慮。"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-sm rounded-2xl" data-testid="dialog-change-password">
          <DialogHeader>
            <DialogTitle>
              {language === "en" ? "Change Password" : "修改密碼"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === "en" ? "Current Password" : "目前密碼"}
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={language === "en" ? "Enter current password" : "輸入目前密碼"}
                data-testid="input-current-password"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === "en" ? "New Password" : "新密碼"}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={language === "en" ? "Enter new password (min. 6 characters)" : "輸入新密碼（至少 6 個字元）"}
                data-testid="input-new-password"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === "en" ? "Confirm New Password" : "確認新密碼"}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && currentPassword && newPassword && confirmPassword) {
                    handleChangePassword();
                  }
                }}
                placeholder={language === "en" ? "Re-enter new password" : "再次輸入新密碼"}
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              data-testid="button-cancel-change-password"
            >
              {language === "en" ? "Cancel" : "取消"}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}
              data-testid="button-confirm-change-password"
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {language === "en" ? "Updating..." : "更新中..."}
                </>
              ) : (
                language === "en" ? "Update" : "更新"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

