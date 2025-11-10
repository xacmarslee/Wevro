import * as chineseConv from "chinese-conv";

export const ensureTraditional = (text: string): string => {
  if (!text) {
    return text;
  }

  try {
    return chineseConv.tify(text);
  } catch (error) {
    console.warn("Failed to convert to Traditional Chinese:", error);
    return text;
  }
};


