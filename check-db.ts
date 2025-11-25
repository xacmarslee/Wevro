import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function checkSchema() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ 錯誤: 找不到 DATABASE_URL 環境變數");
    return;
  }

  console.log("正在連線到資料庫...");
  const sql = neon(process.env.DATABASE_URL);

  try {
    // 查詢 user_quotas 表的所有欄位
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_quotas';
    `;

    console.log("\n📋 user_quotas 表的欄位列表:");
    console.log("----------------------------------------");
    
    const columnNames = columns.map(c => c.column_name);
    columns.forEach(c => {
      const isNew = ['is_email_verified', 'reward_claimed'].includes(c.column_name);
      console.log(`${isNew ? '✅' : '  '} ${c.column_name} (${c.data_type})`);
    });
    console.log("----------------------------------------");

    const hasEmailVerified = columnNames.includes('is_email_verified');
    const hasRewardClaimed = columnNames.includes('reward_claimed');

    if (hasEmailVerified && hasRewardClaimed) {
      console.log("\n✨ 驗證成功：新欄位已存在於資料庫中！");
    } else {
      console.log("\n❌ 驗證失敗：資料庫缺少新欄位！");
      if (!hasEmailVerified) console.log("   - 缺少: is_email_verified");
      if (!hasRewardClaimed) console.log("   - 缺少: reward_claimed");
    }

  } catch (error) {
    console.error("\n❌ 連線或查詢失敗:", error);
  }
}

checkSchema();

