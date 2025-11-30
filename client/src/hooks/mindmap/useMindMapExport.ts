/**
 * Mind Map Export Hook
 * 
 * 處理心智圖匯出為 PNG 圖片功能
 */

import html2canvas from "html2canvas";
import { type MindMapNode } from "@shared/schema";
import { getCategoryColor, getCategoryLabel } from "@shared/categoryColors";
import { EXPORT } from "@/utils/mindmap/constants";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

export function useMindMapExport() {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { toast } = useToast();

  /**
   * 匯出心智圖為 PNG 圖片
   */
  const exportToPNG = async (nodes: MindMapNode[]) => {
    if (nodes.length === 0) {
      toast({
        title: language === "en" ? "Export failed" : "匯出失敗",
        description: language === "en" ? "No nodes to export" : "沒有節點可匯出",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // 確保字體就緒，避免 fallback 字體導致度量變化
      if ('fonts' in document) {
        try { await (document as any).fonts.ready; } catch {}
      }
      
      const { PADDING, SCALE, NODE_WIDTH_APPROX, NODE_HEIGHT_APPROX } = EXPORT;
      
      // 計算所有節點的邊界框
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      nodes.forEach(node => {
        minX = Math.min(minX, node.x - NODE_WIDTH_APPROX / 2);
        minY = Math.min(minY, node.y - NODE_HEIGHT_APPROX / 2);
        maxX = Math.max(maxX, node.x + NODE_WIDTH_APPROX / 2);
        maxY = Math.max(maxY, node.y + NODE_HEIGHT_APPROX / 2);
      });
      
      const width = maxX - minX + PADDING * 2;
      const height = maxY - minY + PADDING * 2;
      const backgroundColor = theme === 'dark' ? '#14151a' : '#ffffff';
      
      // 建立臨時容器
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.top = '-99999px';
      tempContainer.style.left = '-99999px';
      tempContainer.style.width = `${width}px`;
      tempContainer.style.height = `${height}px`;
      tempContainer.style.backgroundColor = backgroundColor;
      document.body.appendChild(tempContainer);
      
      // 檢查畫布元素是否存在
      const canvasElement = document.querySelector('[data-mindmap-canvas]') as HTMLElement;
      if (!canvasElement) {
        document.body.removeChild(tempContainer);
        toast({
          title: language === "en" ? "Export failed" : "匯出失敗",
          description: language === "en" ? "Canvas not found" : "找不到畫布",
          variant: "destructive",
        });
        return;
      }
      
      // 建立 SVG 繪製連接線
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', width.toString());
      svg.setAttribute('height', height.toString());
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      
      // 繪製類別連接線
      const centerNode = nodes.find(n => n.isCenter);
      if (centerNode) {
        // 按類別分組節點
        const categoryThreads = nodes.reduce((acc, node) => {
          if (node.category && node.parentId === centerNode.id) {
            if (!acc[node.category]) {
              acc[node.category] = [];
            }
            acc[node.category].push(node);
          }
          return acc;
        }, {} as Record<string, MindMapNode[]>);
        
        // 為每個類別繪製連接線（連到最遠的節點）
        Object.entries(categoryThreads).forEach(([category, categoryNodes]) => {
          if (categoryNodes.length === 0) return;
          
          // 找出最遠的節點
          const sortedNodes = [...categoryNodes].sort((a, b) => {
            const distA = Math.sqrt(
              Math.pow(a.x - centerNode.x, 2) + Math.pow(a.y - centerNode.y, 2)
            );
            const distB = Math.sqrt(
              Math.pow(b.x - centerNode.x, 2) + Math.pow(b.y - centerNode.y, 2)
            );
            return distB - distA;
          });
          const furthestNode = sortedNodes[0];
          
          // 繪製線條
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', (centerNode.x - minX + PADDING).toString());
          line.setAttribute('y1', (centerNode.y - minY + PADDING).toString());
          line.setAttribute('x2', (furthestNode.x - minX + PADDING).toString());
          line.setAttribute('y2', (furthestNode.y - minY + PADDING).toString());
          line.setAttribute('stroke', getCategoryColor(category as any, theme === 'dark'));
          line.setAttribute('stroke-width', '1.5');
          line.setAttribute('opacity', '0.6');
          svg.appendChild(line);
        });
      }
      
      tempContainer.appendChild(svg);
      
      // 渲染所有節點
      nodes.forEach(node => {
        const nodeDiv = document.createElement('div');
        nodeDiv.style.position = 'absolute';
        nodeDiv.style.left = `${node.x - minX + PADDING}px`;
        nodeDiv.style.top = `${node.y - minY + PADDING}px`;
        nodeDiv.style.transform = 'translate(-50%, -50%)';
        
        const isCenter = node.id === centerNode?.id;
        const categoryColor = node.category 
          ? getCategoryColor(node.category, theme === 'dark') 
          : undefined;
        
        // 建立節點內容
        const contentDiv = document.createElement('div');
        contentDiv.style.borderRadius = '12px';
        contentDiv.style.fontWeight = '600';
        contentDiv.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        contentDiv.style.border = '2px solid';
        contentDiv.style.padding = '14px 20px';  // 增加上下 padding
        contentDiv.style.fontSize = '18px';
        contentDiv.style.minWidth = '100px';
        contentDiv.style.textAlign = 'center';
        contentDiv.style.display = 'grid';
        (contentDiv.style as any).placeItems = 'center';
        contentDiv.style.rowGap = (node.category && !isCenter) ? '2px' : '0';
        
        if (isCenter) {
          // 中心節點樣式
          contentDiv.style.backgroundColor = theme === 'dark' 
            ? 'hsl(250, 75%, 50%)' 
            : 'hsl(250, 75%, 60%)';
          contentDiv.style.color = '#ffffff';
          contentDiv.style.borderColor = theme === 'dark' 
            ? 'hsl(250, 75%, 40%)' 
            : 'hsl(250, 75%, 50%)';
        } else {
          // 一般節點樣式
          contentDiv.style.backgroundColor = theme === 'dark' 
            ? 'hsl(240, 10%, 10%)' 
            : '#ffffff';
          contentDiv.style.color = categoryColor || (theme === 'dark' ? '#ffffff' : '#000000');
          contentDiv.style.borderColor = categoryColor || (
            theme === 'dark' ? 'hsl(240, 10%, 20%)' : 'hsl(240, 5%, 90%)'
          );
        }
        
        // 單字文字
        const wordSpan = document.createElement('div');
        wordSpan.textContent = node.word;
        wordSpan.style.whiteSpace = 'nowrap';
        wordSpan.style.lineHeight = '1.15';  // 略放鬆，更接近視覺置中
        wordSpan.style.marginTop = '0';
        contentDiv.appendChild(wordSpan);
        
        // 類別標籤（非中心節點）或透明佔位符（中心節點）
        if (node.category && !isCenter) {
          const categorySpan = document.createElement('div');
          categorySpan.textContent = getCategoryLabel(node.category, language);
          categorySpan.style.fontSize = '12px';
          categorySpan.style.opacity = '0.7';
          categorySpan.style.lineHeight = '1.15';
          contentDiv.appendChild(categorySpan);
        } else if (isCenter) {
          // 中心節點：新增透明的第二行作為佔位符
          const placeholderSpan = document.createElement('div');
          placeholderSpan.textContent = '中心字';
          placeholderSpan.style.fontSize = '12px';
          placeholderSpan.style.lineHeight = '1.15';
          placeholderSpan.style.opacity = '0';  // 完全透明
          placeholderSpan.style.pointerEvents = 'none';
          contentDiv.appendChild(placeholderSpan);
        }
        
        nodeDiv.appendChild(contentDiv);
        tempContainer.appendChild(nodeDiv);
      });
      
      // 使用 html2canvas 截圖
      // 在移動端 WebView 中，html2canvas 可能無法正常工作
      // 新增錯誤處理和備用方案
      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(tempContainer, {
          backgroundColor,
          scale: SCALE,
          logging: false,
          useCORS: true,
          allowTaint: true,
          // 在移動端，可能需要這些選項
          foreignObjectRendering: false,
        });
        
        // 檢查 canvas 是否有效
        if (!canvas || !canvas.getContext) {
          throw new Error('Canvas creation failed');
        }
      } catch (canvasError: any) {
        console.error('html2canvas error:', canvasError);
        // 清理臨時容器
        document.body.removeChild(tempContainer);
        toast({
          title: language === "en" ? "Export failed" : "匯出失敗",
          description: language === "en" 
            ? "Canvas export is not supported in this environment. Please use a different device or browser." 
            : "此環境不支援畫布匯出。請使用其他裝置或瀏覽器。",
          variant: "destructive",
        });
        return;
      }
      
      // 清理臨時容器
      document.body.removeChild(tempContainer);
      
      // 生成文件名
      const filename = centerNode 
        ? `${centerNode.word}-Wevro-mindmap.png` 
        : 'mindmap.png';
      
      // 檢測是否在 Capacitor 環境中
      const isCapacitor = Capacitor.isNativePlatform();
      
      try {
        // 將 canvas 轉換為 base64
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1]; // 移除 data:image/png;base64, 前綴
        
        if (isCapacitor) {
          // 在 Capacitor 環境中使用 Filesystem API
          console.log('[Export] Using Capacitor Filesystem API');
          
          try {
            // 嘗試保存到 Downloads 目錄（用戶更容易找到）
            // 如果失敗，回退到 Documents 目錄
            let result;
            let savePath = '';
            
            try {
              result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.ExternalStorage,
                recursive: true,
              });
              savePath = `Downloads/${filename}`;
            } catch (externalError) {
              // 如果外部存儲失敗，使用 Documents 目錄
              console.log('[Export] External storage failed, using Documents directory');
              result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Documents,
                recursive: true,
              });
              savePath = `Documents/${filename}`;
            }
            
            console.log('[Export] File saved successfully:', result.uri);
            
            toast({
              title: language === "en" ? "Export successful" : "匯出成功",
              variant: "default",
            });
          } catch (filesystemError: any) {
            console.error('[Export] Filesystem error:', filesystemError);
            toast({
              title: language === "en" ? "Export failed" : "匯出失敗",
              variant: "destructive",
            });
            return;
          }
        } else {
          // 在 Web 環境中使用傳統的下載方式
          console.log('[Export] Using web download method');
          
          const link = document.createElement('a');
          link.download = filename;
          link.href = dataUrl;
          
          // 將 link 添加到 DOM 並觸發點擊（某些瀏覽器需要）
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (dataUrlError: any) {
        console.error('[Export] toDataURL error:', dataUrlError);
        toast({
          title: language === "en" ? "Export failed" : "匯出失敗",
          variant: "destructive",
        });
        return;
      }
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: language === "en" ? "Export failed" : "匯出失敗",
        description: language === "en" ? "Failed to export mind map" : "匯出心智圖失敗",
        variant: "destructive",
      });
    }
  };

  return {
    exportToPNG,
  };
}

