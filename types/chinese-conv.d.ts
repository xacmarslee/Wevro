declare module "chinese-conv" {
  interface ChineseConv {
    tify(input: string): string;
    sify(input: string): string;
  }

  const chineseConv: ChineseConv;
  export default chineseConv;
}

