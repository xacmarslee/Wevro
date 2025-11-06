/**
 * 測試資料庫連接和基本操作
 * 執行方式: node test-db-connection.js
 */

import 'dotenv/config';
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// 設定 WebSocket
neonConfig.webSocketConstructor = ws;

async function testDatabaseConnection() {
  console.log("🔍 測試資料庫連接...\n");

  // 檢查環境變數
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL 環境變數未設定！");
    console.log("\n請在 .env 檔案中設定 DATABASE_URL");
    process.exit(1);
  }

  console.log("✅ DATABASE_URL 已設定");
  console.log(`   URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@')}\n`);

  try {
    // 建立資料庫連接
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    console.log("🔌 嘗試連接資料庫...");
    
    // 測試基本查詢
    const result = await pool.query('SELECT NOW() as current_time');
    console.log("✅ 資料庫連接成功！");
    console.log(`   當前時間: ${result.rows[0].current_time}\n`);

    // 檢查資料表是否存在
    console.log("📋 檢查資料表...");
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tables.rows.length === 0) {
      console.log("⚠️  沒有找到任何資料表！");
      console.log("\n請執行資料庫遷移：");
      console.log("   npm run db:push\n");
    } else {
      console.log(`✅ 找到 ${tables.rows.length} 個資料表：`);
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log();
    }

    // 檢查必要的資料表
    const requiredTables = ['users', 'user_quotas', 'mind_maps', 'flashcard_decks', 'flashcards'];
    const existingTables = new Set(tables.rows.map(row => row.table_name));
    const missingTables = requiredTables.filter(table => !existingTables.has(table));

    if (missingTables.length > 0) {
      console.log("⚠️  缺少以下資料表：");
      missingTables.forEach(table => {
        console.log(`   - ${table}`);
      });
      console.log("\n請執行資料庫遷移：");
      console.log("   npm run db:push\n");
    } else {
      console.log("✅ 所有必要的資料表都存在\n");
    }

    // 測試查詢 users 資料表
    try {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`👤 使用者數量: ${userCount.rows[0].count}`);
    } catch (error) {
      console.log("⚠️  無法查詢 users 資料表");
    }

    // 測試查詢 mind_maps 資料表
    try {
      const mindMapCount = await pool.query('SELECT COUNT(*) as count FROM mind_maps');
      console.log(`🧠 心智圖數量: ${mindMapCount.rows[0].count}`);
    } catch (error) {
      console.log("⚠️  無法查詢 mind_maps 資料表");
    }

    // 測試查詢 flashcard_decks 資料表
    try {
      const deckCount = await pool.query('SELECT COUNT(*) as count FROM flashcard_decks');
      console.log(`📚 字卡組數量: ${deckCount.rows[0].count}\n`);
    } catch (error) {
      console.log("⚠️  無法查詢 flashcard_decks 資料表\n");
    }

    console.log("✅ 資料庫測試完成！\n");
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ 資料庫連接失敗！\n");
    console.error("錯誤訊息：", error.message);
    console.error("\n請檢查：");
    console.error("1. DATABASE_URL 是否正確");
    console.error("2. 資料庫伺服器是否正在運行");
    console.error("3. 網路連接是否正常");
    console.error("4. 防火牆設定是否允許連接\n");
    process.exit(1);
  }
}

testDatabaseConnection();

