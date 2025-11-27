import { randomUUID } from "crypto";
import type { MindMap, FlashcardDeck, Flashcard, User, UpsertUser } from "../shared/schema.js";
import { db } from "./db.js";
import { mindMaps, flashcardDecks, flashcards, users, userQuotas, tokenTransactions } from "../shared/schema.js";
import { eq, and, desc, inArray, asc, sql } from "drizzle-orm";
import { ensureTraditional } from "./utils/chinese.js";
type FlashcardRowSelect = typeof flashcards.$inferSelect;
type UserQuotaRow = typeof userQuotas.$inferSelect;
type FlashcardEssentialFields = Pick<FlashcardRowSelect, "id" | "word" | "definition" | "partOfSpeech" | "known">;
type TokenChargeResult = {
  tokenBalance: number;
  tokensCharged: number;
};

const TOKEN_PRECISION = 2;
const MINDMAP_EXPANSION_COST = 0.5;

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
};

const toTokenString = (value: number): string => value.toFixed(TOKEN_PRECISION);

export type MindmapExpansionSnapshot = {
  tokenBalance: number;
  usedMindmapExpansions: number;
};

const createMindmapTokenError = (tokenBalance: number, usedMindmapExpansions: number) => {
  const error: any = new Error("INSUFFICIENT_TOKENS");
  error.code = "INSUFFICIENT_TOKENS";
  error.tokenBalance = tokenBalance;
  error.usedMindmapExpansions = usedMindmapExpansions;
  return error;
};

const createTokenError = (tokenBalance: number) => {
  const error: any = new Error("INSUFFICIENT_TOKENS");
  error.code = "INSUFFICIENT_TOKENS";
  error.tokenBalance = tokenBalance;
  return error;
};

export interface IStorage {
  // Users (Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  getUserQuota(userId: string): Promise<any>;

  // Mind maps
  getMindMap(id: string, userId: string): Promise<MindMap | undefined>;
  getAllMindMaps(userId: string): Promise<{ id: string; userId: string; name: string; nodeCount: number; createdAt: string }[]>;
  createMindMap(mindMap: Omit<MindMap, "id" | "createdAt">, userId: string): Promise<MindMap>;
  updateMindMap(id: string, userId: string, mindMap: Partial<MindMap>): Promise<MindMap | undefined>;
  deleteMindMap(id: string, userId: string): Promise<boolean>;

  // Flashcard decks
  getFlashcardDeck(id: string, userId: string): Promise<FlashcardDeck | undefined>;
  getAllFlashcardDecks(userId: string): Promise<{ id: string; name: string; cardCount: number; createdAt: string }[]>;
  createFlashcardDeck(deck: Omit<FlashcardDeck, "id" | "createdAt">, userId: string, cards?: Flashcard[]): Promise<FlashcardDeck>;
  updateFlashcardDeck(id: string, userId: string, deck: Partial<FlashcardDeck>): Promise<FlashcardDeck | undefined>;
  deleteFlashcardDeck(id: string, userId: string): Promise<boolean>;

  // Flashcards
  getFlashcard(id: string): Promise<Flashcard | undefined>;
  getFlashcardsByDeck(deckId: string): Promise<Flashcard[]>;
  updateFlashcard(id: string, flashcard: Partial<Flashcard>): Promise<Flashcard | undefined>;
  addFlashcard(deckId: string, flashcard: Omit<Flashcard, "id" | "known">): Promise<Flashcard | undefined>;
  deleteFlashcard(id: string): Promise<boolean>;

  consumeTokens(userId: string, amount: number, feature: string, metadata?: Record<string, unknown>): Promise<TokenChargeResult>;

  // Tokens
  ensureMindmapExpansionAllowance(userId: string): Promise<MindmapExpansionSnapshot>;
  consumeMindmapExpansion(
    userId: string,
    snapshot?: MindmapExpansionSnapshot
  ): Promise<{
    tokenBalance: number;
    usedMindmapExpansions: number;
    tokensCharged: number;
  }>;

  addTokens(userId: string, amount: number, source: string, metadata?: Record<string, unknown>): Promise<number>;
}

const mapFlashcardRow = (card: FlashcardEssentialFields) => ({
  id: card.id,
  word: card.word,
  definition: ensureTraditional(card.definition),
  partOfSpeech: card.partOfSpeech,
  known: card.known,
});

const normalizeQuotaRow = (quota: UserQuotaRow) => ({
  ...quota,
  tokenBalance: toNumber(quota.tokenBalance),
});

export class DbStorage implements IStorage {
  // User methods (Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // 檢查用戶是否已存在
    const existingUser = await this.getUser(userData.id);
    // const isNewUser = !existingUser; // 移除這裡的 isNewUser 判斷
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // 移除這裡自動建立 Quota 的邏輯
    // 讓 getUserQuota 來全權處理初始化，避免 Race Condition 和 外鍵約束問題
    
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Delete user (cascading deletes will handle related data)
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getUserQuota(userId: string): Promise<any> {
    const [quota] = await db
      .select()
      .from(userQuotas)
      .where(eq(userQuotas.userId, userId))
      .limit(1);
    
    // 如果用戶沒有 quota 記錄，創建預設值
    if (!quota) {
      // 重要修復：在建立 Quota 之前，必須確保 Users 表中已有此用戶
      // 因為是外鍵約束，直接 insert Quota 會失敗 (500 Error)
      let user = await this.getUser(userId);
      
      if (!user) {
        console.log(`⚠️ getUserQuota: User ${userId} not found in users table. Creating fallback user record.`);
        // 嘗試從 Firebase 獲取用戶資訊（這裡只能先建立一個基礎記錄）
        // 實際的資料同步會在 /api/auth/user 端點進行
        try {
          await db.insert(users).values({
            id: userId,
            email: null, // 暫時為空，稍後會更新
            firstName: null,
            lastName: null,
            profileImageUrl: null,
          }).onConflictDoNothing(); // 如果並發請求已建立，則忽略
        } catch (userError) {
          console.error(`❌ Failed to create fallback user ${userId}:`, userError);
          // 繼續嘗試建立 quota，如果失敗則拋出異常
        }
      }

      const [newQuota] = await db
        .insert(userQuotas)
        .values({
          userId,
          plan: "free",
          tokenBalance: toTokenString(10), // 註冊送 10 點（試用額度）
          monthlyTokens: 0,
          usedMindmapExpansions: 0,
          isEmailVerified: false,
          rewardClaimed: false, // 尚未領取驗證獎勵
          quotaResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
        })
        .onConflictDoUpdate({ // 防止並發衝突
            target: userQuotas.userId,
            set: { updatedAt: new Date() } 
        })
        .returning();
        
      // 如果 onConflictDoUpdate 沒有返回（因為只是 update），則重新獲取
      if (!newQuota) {
          return this.getUserQuota(userId);
      }

      return normalizeQuotaRow(newQuota);
    }
    
    return normalizeQuotaRow(quota);
  }

  // Mind map methods
  async getMindMap(id: string, userId: string): Promise<MindMap | undefined> {
    const [dbMindMap] = await db
      .select()
      .from(mindMaps)
      .where(and(eq(mindMaps.id, id), eq(mindMaps.userId, userId)));

    if (!dbMindMap) return undefined;

    return {
      id: dbMindMap.id,
      userId: dbMindMap.userId,
      name: dbMindMap.name,
      nodes: dbMindMap.nodes,
      createdAt: dbMindMap.createdAt.toISOString(),
    };
  }

  async getAllMindMaps(userId: string): Promise<{ id: string; userId: string; name: string; nodeCount: number; createdAt: string }[]> {
    const dbMindMaps = await db
      .select({
        id: mindMaps.id,
        userId: mindMaps.userId,
        name: mindMaps.name,
        createdAt: mindMaps.createdAt,
        nodeCount: sql<number>`jsonb_array_length(${mindMaps.nodes})`
      })
      .from(mindMaps)
      .where(eq(mindMaps.userId, userId))
      .orderBy(desc(mindMaps.updatedAt));

    return dbMindMaps.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.name,
      nodeCount: Number(m.nodeCount),
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async createMindMap(mindMap: Omit<MindMap, "id" | "createdAt">, userId: string): Promise<MindMap> {
    const id = randomUUID();
    const [created] = await db
      .insert(mindMaps)
      .values({
        id,
        userId,
        name: mindMap.name,
        nodes: mindMap.nodes,
      })
      .returning();

    return {
      id: created.id,
      userId: created.userId,
      name: created.name,
      nodes: created.nodes,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async updateMindMap(id: string, userId: string, mindMap: Partial<MindMap>): Promise<MindMap | undefined> {
    const [updated] = await db
      .update(mindMaps)
      .set({
        ...(mindMap.name && { name: mindMap.name }),
        ...(mindMap.nodes && { nodes: mindMap.nodes }),
        updatedAt: new Date(),
      })
      .where(and(eq(mindMaps.id, id), eq(mindMaps.userId, userId)))
      .returning();

    if (!updated) return undefined;

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      nodes: updated.nodes,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteMindMap(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(mindMaps)
      .where(and(eq(mindMaps.id, id), eq(mindMaps.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Flashcard deck methods
  async getFlashcardDeck(id: string, userId: string): Promise<FlashcardDeck | undefined> {
    const [deck] = await db
      .select()
      .from(flashcardDecks)
      .where(and(eq(flashcardDecks.id, id), eq(flashcardDecks.userId, userId)));

    if (!deck) return undefined;

    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, id))
      .orderBy(asc(flashcards.createdAt));

    return {
      id: deck.id,
      name: deck.name,
      cards: cards.map(mapFlashcardRow),
      createdAt: deck.createdAt.toISOString(),
    };
  }

  async getAllFlashcardDecks(userId: string): Promise<{ id: string; name: string; cardCount: number; createdAt: string }[]> {
    // Fetch all decks for this user with card count
    const decks = await db
      .select({
        id: flashcardDecks.id,
        name: flashcardDecks.name,
        createdAt: flashcardDecks.createdAt,
        updatedAt: flashcardDecks.updatedAt,
        cardCount: sql<number>`count(${flashcards.id})`
      })
      .from(flashcardDecks)
      .leftJoin(flashcards, eq(flashcardDecks.id, flashcards.deckId))
      .where(eq(flashcardDecks.userId, userId))
      .groupBy(flashcardDecks.id)
      .orderBy(desc(flashcardDecks.updatedAt));

    return decks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      cardCount: Number(deck.cardCount),
      createdAt: deck.createdAt.toISOString(),
    }));
  }

  async createFlashcardDeck(
    deck: Omit<FlashcardDeck, "id" | "createdAt">,
    userId: string,
    cards?: Flashcard[]
  ): Promise<FlashcardDeck> {
    const deckId = randomUUID();
    const [created] = await db
      .insert(flashcardDecks)
      .values({
        id: deckId,
        userId,
        name: deck.name,
      })
      .returning();

    const createdCards: Flashcard[] = [];
    if (cards && cards.length > 0) {
      const cardValues = cards.map((card) => ({
        id: randomUUID(),
        deckId,
        word: card.word,
        definition: ensureTraditional(card.definition),
        partOfSpeech: card.partOfSpeech,
        known: card.known || false,
      }));

      const insertedCards = await db.insert(flashcards).values(cardValues).returning();
      createdCards.push(
        ...insertedCards.map(mapFlashcardRow)
      );
    }

    return {
      id: created.id,
      name: created.name,
      cards: createdCards,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async updateFlashcardDeck(id: string, userId: string, deck: Partial<FlashcardDeck>): Promise<FlashcardDeck | undefined> {
    const [updated] = await db
      .update(flashcardDecks)
      .set({
        ...(deck.name && { name: deck.name }),
        updatedAt: new Date(),
      })
      .where(and(eq(flashcardDecks.id, id), eq(flashcardDecks.userId, userId)))
      .returning();

    if (!updated) return undefined;

    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, id))
      .orderBy(asc(flashcards.createdAt));

    return {
      id: updated.id,
      name: updated.name,
      cards: cards.map(mapFlashcardRow),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteFlashcardDeck(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(flashcardDecks)
      .where(and(eq(flashcardDecks.id, id), eq(flashcardDecks.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Flashcard methods
  async getFlashcard(id: string): Promise<Flashcard | undefined> {
    const [card] = await db.select().from(flashcards).where(eq(flashcards.id, id));
    if (!card) return undefined;

    return mapFlashcardRow(card);
  }

  async getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, deckId))
      .orderBy(asc(flashcards.createdAt));
    return cards.map(mapFlashcardRow);
  }

  async updateFlashcard(id: string, flashcard: Partial<Flashcard>): Promise<Flashcard | undefined> {
    const [updated] = await db
      .update(flashcards)
      .set({
        ...(flashcard.known !== undefined && { known: flashcard.known }),
        ...(flashcard.word && { word: flashcard.word }),
        ...(flashcard.definition && { definition: ensureTraditional(flashcard.definition) }),
        ...(flashcard.partOfSpeech && { partOfSpeech: flashcard.partOfSpeech }),
      })
      .where(eq(flashcards.id, id))
      .returning();

    if (!updated) return undefined;

    return mapFlashcardRow(updated);
  }

  async addFlashcard(deckId: string, flashcard: Omit<Flashcard, "id" | "known">): Promise<Flashcard | undefined> {
    // Check if deck exists
    const [deck] = await db.select().from(flashcardDecks).where(eq(flashcardDecks.id, deckId));
    if (!deck) return undefined;

    const id = randomUUID();
    const [created] = await db
      .insert(flashcards)
      .values({
        id,
        deckId,
        word: flashcard.word,
        definition: ensureTraditional(flashcard.definition),
        partOfSpeech: flashcard.partOfSpeech,
        known: false,
        reviewCount: 0,
        easeFactor: 2.5,
        interval: 0,
        nextReviewDate: null,
      })
      .returning();

    return mapFlashcardRow(created);
  }

  async consumeTokens(userId: string, amount: number, feature: string, metadata?: Record<string, unknown>): Promise<TokenChargeResult> {
    if (amount <= 0) {
      const quota = await this.getUserQuota(userId);
      return {
        tokenBalance: quota.tokenBalance,
        tokensCharged: 0,
      };
    }

    const quota = await this.getUserQuota(userId);
    const currentBalance = toNumber(quota.tokenBalance);

    if (currentBalance + 1e-9 < amount) {
      throw createTokenError(currentBalance);
    }

    const newBalance = Number((currentBalance - amount).toFixed(TOKEN_PRECISION));

    await db
      .update(userQuotas)
      .set({
        tokenBalance: toTokenString(newBalance),
        updatedAt: new Date(),
      })
      .where(eq(userQuotas.userId, userId));

    await db.insert(tokenTransactions).values({
      id: randomUUID(),
      userId,
      amount: toTokenString(-amount),
      type: "consume",
      feature,
      metadata: metadata ?? null,
    });

    return {
      tokenBalance: newBalance,
      tokensCharged: amount,
    };
  }

  async ensureMindmapExpansionAllowance(userId: string): Promise<MindmapExpansionSnapshot> {
    // 使用 getUserQuota 確保 quota 存在（如果不存在會自動創建）
    const quota = await this.getUserQuota(userId);

    const snapshot: MindmapExpansionSnapshot = {
      tokenBalance: quota.tokenBalance,
      usedMindmapExpansions: quota.usedMindmapExpansions ?? 0,
    };

    if (snapshot.tokenBalance + 1e-9 < MINDMAP_EXPANSION_COST) {
      throw createMindmapTokenError(snapshot.tokenBalance, snapshot.usedMindmapExpansions);
    }

    return snapshot;
  }

  async consumeMindmapExpansion(
    userId: string,
    providedSnapshot?: MindmapExpansionSnapshot
  ): Promise<{
    tokenBalance: number;
    usedMindmapExpansions: number;
    tokensCharged: number;
  }> {
    const snapshot = providedSnapshot ?? (await this.ensureMindmapExpansionAllowance(userId));

    const previousBalance = snapshot.tokenBalance;
    const newBalance = Number(Math.max(previousBalance - MINDMAP_EXPANSION_COST, 0).toFixed(TOKEN_PRECISION));
    const updatedAt = new Date();

    const updateResult = await db
      .update(userQuotas)
      .set({
        tokenBalance: toTokenString(newBalance),
        usedMindmapExpansions: snapshot.usedMindmapExpansions + 1,
        updatedAt,
      })
      .where(
        and(
          eq(userQuotas.userId, userId),
          eq(userQuotas.tokenBalance, toTokenString(previousBalance)),
          eq(userQuotas.usedMindmapExpansions, snapshot.usedMindmapExpansions)
        )
      )
      .returning();

    if (updateResult.length === 0) {
      // 資料在期間已被更新，重新嘗試一次以取得最新 quota
      return this.consumeMindmapExpansion(userId);
    }

      await db.insert(tokenTransactions).values({
        id: randomUUID(),
        userId,
      amount: toTokenString(-MINDMAP_EXPANSION_COST),
        type: "consume",
        feature: "mindmapExpansion",
        metadata: {
        costPerExpansion: MINDMAP_EXPANSION_COST,
        },
      });

    return {
      tokenBalance: newBalance,
      usedMindmapExpansions: snapshot.usedMindmapExpansions + 1,
      tokensCharged: MINDMAP_EXPANSION_COST,
    };
  }

  async deleteFlashcard(id: string): Promise<boolean> {
    const result = await db.delete(flashcards).where(eq(flashcards.id, id)).returning();
    return result.length > 0;
  }

  /**
   * Check email verification status and claim verification reward if eligible
   * @param userId - User ID
   * @param isEmailVerified - Firebase Auth emailVerified status from token
   * @returns Reward claim result with new token balance, or null if not eligible
   */
  async claimVerificationReward(userId: string, isEmailVerified: boolean): Promise<{
    success: boolean;
    tokenBalance: number;
    rewardClaimed: boolean;
    message?: string;
  } | null> {
    // Ensure quota exists
    const quota = await this.getUserQuota(userId);
    
    // If already claimed, return current state
    if (quota.rewardClaimed) {
      return {
        success: false,
        tokenBalance: quota.tokenBalance,
        rewardClaimed: true,
        message: 'Reward already claimed',
      };
    }
    
    // If email not verified, cannot claim reward
    if (!isEmailVerified) {
      return {
        success: false,
        tokenBalance: quota.tokenBalance,
        rewardClaimed: false,
        message: 'Email not verified',
      };
    }
    
    // User is verified and hasn't claimed reward yet - give them 20 tokens
    const currentBalance = toNumber(quota.tokenBalance);
    const rewardAmount = 20;
    const newBalance = Number((currentBalance + rewardAmount).toFixed(TOKEN_PRECISION));
    
    // Update quota: add tokens, mark as verified and reward claimed
    const [updated] = await db
      .update(userQuotas)
      .set({
        tokenBalance: toTokenString(newBalance),
        isEmailVerified: true,
        rewardClaimed: true,
        updatedAt: new Date(),
      })
      .where(eq(userQuotas.userId, userId))
      .returning();
    
    if (!updated) {
      throw new Error('Failed to update quota');
    }
    
    // Record transaction
    await db.insert(tokenTransactions).values({
      id: randomUUID(),
      userId,
      amount: toTokenString(rewardAmount),
      type: 'gift',
      feature: 'email_verification_reward',
      metadata: {
        rewardType: 'email_verification',
        amount: rewardAmount,
      },
    });
    
    console.log(`✅ Verification reward claimed for user ${userId}: +${rewardAmount} tokens (new balance: ${newBalance})`);
    
    return {
      success: true,
      tokenBalance: newBalance,
      rewardClaimed: true,
      message: 'Reward claimed successfully',
    };
  }

  /**
   * Update email verification status in database (sync with Firebase Auth)
   * @param userId - User ID
   * @param isEmailVerified - Firebase Auth emailVerified status
   */
  async updateEmailVerificationStatus(userId: string, isEmailVerified: boolean): Promise<void> {
    await db
      .update(userQuotas)
      .set({
        isEmailVerified,
        updatedAt: new Date(),
      })
      .where(eq(userQuotas.userId, userId));
  }

  async addTokens(userId: string, amount: number, source: string, metadata?: Record<string, unknown>): Promise<number> {
    const quota = await this.getUserQuota(userId);
    const currentBalance = toNumber(quota.tokenBalance);
    const newBalance = Number((currentBalance + amount).toFixed(TOKEN_PRECISION));

    await db
      .update(userQuotas)
      .set({
        tokenBalance: toTokenString(newBalance),
        updatedAt: new Date(),
      })
      .where(eq(userQuotas.userId, userId));

    await db.insert(tokenTransactions).values({
      id: randomUUID(),
      userId,
      amount: toTokenString(amount),
      type: "purchase",
      feature: source,
      metadata: metadata ?? null,
    });

    return newBalance;
  }
}

export const storage = new DbStorage();
