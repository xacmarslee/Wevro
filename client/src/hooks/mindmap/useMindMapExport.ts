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
          // 中心節點：添加透明的第二行作為佔位符
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
      const canvas = await html2canvas(tempContainer, {
        backgroundColor,
        scale: SCALE,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      // 清理臨時容器
      document.body.removeChild(tempContainer);
      
      // 下載圖片
      const link = document.createElement('a');
      const filename = centerNode 
        ? `${centerNode.word}-Wevro-mindmap.png` 
        : 'mindmap.png';
      
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
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

