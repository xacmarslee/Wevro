import "dotenv/config";

function checkFirebaseKey() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!key) {
    console.error("❌ 找不到 FIREBASE_SERVICE_ACCOUNT_KEY 環境變數");
    return;
  }

  try {
    console.log("正在檢查 FIREBASE_SERVICE_ACCOUNT_KEY 格式...");
    const parsed = JSON.parse(key);
    
    // 檢查關鍵欄位
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    const missing = requiredFields.filter(f => !parsed[f]);

    if (missing.length > 0) {
      console.error("❌ JSON 解析成功，但缺少關鍵欄位:", missing.join(", "));
    } else {
      console.log("✅ FIREBASE_SERVICE_ACCOUNT_KEY 格式正確！");
      console.log(`   Project ID: ${parsed.project_id}`);
      console.log(`   Client Email: ${parsed.client_email}`);
    }

  } catch (error) {
    console.error("❌ JSON 解析失敗！環境變數格式錯誤。");
    console.error("錯誤訊息:", error.message);
    console.log("提示：請檢查 Vercel 環境變數中是否包含了多餘的引號，或者換行符號被破壞。");
  }
}

checkFirebaseKey();

