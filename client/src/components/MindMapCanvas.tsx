import { useRef, useState, useEffect } from "react";
import { type MindMapNode, type WordCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCategoryColor, getCategoryLabel } from "@shared/categoryColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface MindMapCanvasProps {
  nodes: MindMapNode[];
  onNodeClick: (nodeId: string) => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeAdd?: (parentNodeId: string, category: WordCategory) => void;
  centerNodeId?: string;
  focusNodeId?: string;
  maxNodes?: number;
}

export function MindMapCanvas({
  nodes,
  onNodeClick,
  onNodeDelete,
  onNodeAdd,
  centerNodeId,
  focusNodeId,
  maxNodes = 60,
}: MindMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const pinchStateRef = useRef<{
    distance: number;
    zoom: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === "dark";
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 3;

  const clampZoom = (value: number) => Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);

  // Auto-center the center node when it's created, or focus on a specific node
  useEffect(() => {
    const targetNodeId = focusNodeId || centerNodeId;
    if (!targetNodeId || !containerRef.current) return;
    
    const targetNode = nodes.find((n) => n.id === targetNodeId);
    if (!targetNode) return;

    // Calculate the center of the viewport
    const rect = containerRef.current.getBoundingClientRect();
    const viewportCenterX = rect.width / 2;
    const viewportCenterY = rect.height / 2;

    // Calculate the pan needed to center the node
    setPan({
      x: viewportCenterX - targetNode.x * zoom,
      y: viewportCenterY - targetNode.y * zoom,
    });
  }, [centerNodeId, focusNodeId, nodes, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    const touch = e.touches[0];
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      pinchStateRef.current = null;
    } else if (e.touches.length === 2) {
      const [t1, t2] = Array.from(e.touches);
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const worldX = (centerX - pan.x) / zoom;
      const worldY = (centerY - pan.y) / zoom;
      pinchStateRef.current = {
        distance,
        zoom,
        worldX,
        worldY,
      };
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStateRef.current) {
      const [t1, t2] = Array.from(e.touches);
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const { distance: startDistance, zoom: startZoom, worldX, worldY } = pinchStateRef.current;

      if (startDistance === 0) return;

      const ratio = distance / startDistance;
      const nextZoom = clampZoom(startZoom * ratio);
      const nextPan = {
        x: centerX - worldX * nextZoom,
        y: centerY - worldY * nextZoom,
      };

      setZoom(nextZoom);
      setPan(nextPan);
      e.preventDefault();
      return;
    }

    if (!isDragging) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStateRef.current = null;
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Add non-passive wheel and touch event listeners to fix passive event errors
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((prev) => clampZoom(prev * delta));
    };

    const handleTouchMoveEvent = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault(); // Prevent scrolling while dragging
      }
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    container.addEventListener('touchmove', handleTouchMoveEvent, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheelEvent);
      container.removeEventListener('touchmove', handleTouchMoveEvent);
    };
  }, [isDragging]);

  // Group nodes by parent AND category to preserve all connections
  const centerNode = nodes.find((n) => n.id === centerNodeId);
  
  // Create a map of parent -> category -> nodes
  const connectionsByParent = nodes.reduce((acc, node) => {
    if (node.category && node.parentId) {
      if (!acc[node.parentId]) {
        acc[node.parentId] = {};
      }
      if (!acc[node.parentId][node.category]) {
        acc[node.parentId][node.category] = [];
      }
      acc[node.parentId][node.category].push(node);
    }
    return acc;
  }, {} as Record<string, Record<string, MindMapNode[]>>);

  // Create spider thread lines for all parent-child relationships
  const spiderThreads: Array<{ category: string; from: MindMapNode; to: MindMapNode }> = [];
  
  Object.entries(connectionsByParent).forEach(([parentId, categories]) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;
    
    Object.entries(categories).forEach(([category, categoryNodes]) => {
      if (categoryNodes.length === 0) return;
      
      // Sort nodes by distance from parent to get the furthest one
      const sortedNodes = [...categoryNodes].sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a.x - parentNode.x, 2) + Math.pow(a.y - parentNode.y, 2));
        const distB = Math.sqrt(Math.pow(b.x - parentNode.x, 2) + Math.pow(b.y - parentNode.y, 2));
        return distB - distA;
      });

      const furthestNode = sortedNodes[0];

      spiderThreads.push({
        category,
        from: parentNode,
        to: furthestNode,
      });
    });
  });

  return (
    <div 
      className="relative h-full w-full overflow-hidden bg-background"
      style={{
        backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
      data-mindmap-canvas
    >
      {/* Canvas */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          className="absolute inset-0 pointer-events-none z-0"
          width="100%"
          height="100%"
          style={{ overflow: "visible" }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {spiderThreads.map((thread) => {
              if (!thread) return null;
              const { category, from, to } = thread;
              const categoryColor = getCategoryColor(category as WordCategory, isDark) || "#999";
              
              return (
                <line
                  key={`thread-${category}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={categoryColor}
                  strokeWidth={1.5}
                  opacity={0.6}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>
        </svg>

        <div
          className="absolute inset-0 z-10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Add buttons at the end of each category thread */}
          {onNodeAdd && spiderThreads.map((thread) => {
            if (!thread) return null;
            const { category, from, to } = thread;
            const categoryColor = getCategoryColor(category as WordCategory, isDark) || "#999";
            
            // Calculate button position: same distance as node spacing (boundaryGap = 80px)
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const unitX = dx / distance;
            const unitY = dy / distance;
            
            // Estimate the furthest node's width
            const estimateNodeWidth = (text: string) => {
              const charWidth = 12;
              const padding = 32;
              const minWidth = 100;
              return Math.max(minWidth, text.length * charWidth + padding);
            };
            
            const toNodeWidth = estimateNodeWidth(to.word);
            const buttonWidth = 40; // w-10 = 40px
            const boundaryGap = 80; // Same gap as between nodes
            
            // Position button: furthest node center + half its width + gap + half button width
            const buttonDistance = toNodeWidth / 2 + boundaryGap + buttonWidth / 2;
            const buttonX = to.x + unitX * buttonDistance;
            const buttonY = to.y + unitY * buttonDistance;
            
            return (
              <div
                key={`add-btn-${category}`}
                className="absolute"
                style={{
                  left: buttonX,
                  top: buttonY,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <motion.button
                  data-node
                  data-add-button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.3 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.1, opacity: 0.7 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onNodeAdd(from.id, category as WordCategory);
                  }}
                  className="w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center shadow-md"
                  style={{
                    borderColor: categoryColor,
                    backgroundColor: isDark ? 'hsl(240, 10%, 10%)' : '#ffffff',
                    color: categoryColor,
                  }}
                  aria-label={`Add ${category} node`}
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              </div>
            );
          })}
          
          <AnimatePresence>
            {nodes.map((node) => {
              const isCenter = node.id === centerNodeId;
              const categoryColor = node.category ? getCategoryColor(node.category, isDark) : undefined;
              
              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{
                    left: node.x,
                    top: node.y,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <motion.div
                    data-node
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="relative group"
                    data-testid={`node-${node.word}`}
                  >
                    {/* Delete button - only show on non-center nodes */}
                    {!isCenter && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onNodeDelete(node.id);
                        }}
                        className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground border border-border opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex items-center justify-center hover:scale-110 shadow-md"
                        data-testid={`button-delete-${node.word}`}
                        aria-label="Delete node"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    
                    <div
                      className={`
                        rounded-xl font-semibold shadow-lg border-2 transition-all cursor-pointer
                        px-4 py-2.5 text-lg min-w-[100px] hover-elevate active-elevate-2 hover:scale-105
                        ${
                          isCenter
                            ? "bg-primary text-primary-foreground border-primary-border shadow-xl ring-4 ring-primary/20"
                            : "bg-card text-card-foreground"
                        }
                      `}
                      style={!isCenter && categoryColor ? {
                        borderColor: categoryColor,
                        color: categoryColor,
                      } : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNodeClick(node.id);
                      }}
                    >
                      <div className="text-center whitespace-nowrap">
                        {node.word}
                      </div>
                      {node.category && !isCenter && (
                        <div className="text-xs text-muted-foreground text-center mt-1 font-normal">
                          {getCategoryLabel(node.category, language)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Node count indicator - fixed in bottom right */}
      <div className="absolute bottom-4 right-4 z-50 pointer-events-none">
        <div className={`
          font-mono text-xs
          ${nodes.length >= maxNodes 
            ? 'text-destructive/70' 
            : nodes.length >= maxNodes * 0.8
            ? 'text-yellow-600/70 dark:text-yellow-500/70'
            : 'text-muted-foreground/50'
          }
        `}>
          {nodes.length}/{maxNodes}
        </div>
      </div>
    </div>
  );
}
