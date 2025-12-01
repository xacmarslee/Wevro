import { useRef, useState, useEffect, useMemo } from "react";
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
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void;
  onNodeEdit?: (nodeId: string) => void;
  centerNodeId?: string;
  focusNodeId?: string;
  maxNodes?: number;
}

export function MindMapCanvas({
  nodes,
  onNodeClick,
  onNodeDelete,
  onNodeAdd,
  onNodeDragEnd,
  onNodeEdit,
  centerNodeId,
  focusNodeId,
  maxNodes = 60,
}: MindMapCanvasProps) {
  console.log("[MindMapCanvas] Rendering with nodes:", nodes.length, "centerNodeId:", centerNodeId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 80, y: 80 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Node dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState({ x: 0, y: 0 });
  const [nodeOriginalPos, setNodeOriginalPos] = useState({ x: 0, y: 0 });
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });

  // Hover state for interaction
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);

  const highlightedIds = useMemo(() => {
    if (!hoverNodeId) return null;
    
    const ids = new Set<string>();
    ids.add(hoverNodeId);

    // Add ancestors
    let current = nodes.find(n => n.id === hoverNodeId);
    while (current && current.parentId) {
      ids.add(current.parentId);
      current = nodes.find(n => n.id === current.parentId); // eslint-disable-line no-loop-func
    }

    // Add children (recursive)
    const addChildren = (parentId: string) => {
      const children = nodes.filter(n => n.parentId === parentId);
      children.forEach(child => {
        ids.add(child.id);
        addChildren(child.id);
      });
    };
    addChildren(hoverNodeId);

    return ids;
  }, [hoverNodeId, nodes]);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setCanvasSize((prev) => {
        if (prev.width === rect.width && prev.height === rect.height) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    return () => {
      ro.disconnect();
    };
  }, []);

  // Auto-center the center node when it's created, or focus on a specific node
  useEffect(() => {
    const targetNodeId = focusNodeId || centerNodeId;
    if (!targetNodeId || !containerRef.current) return;
    if (canvasSize.width === 0 || canvasSize.height === 0) return;
    
    const targetNode = nodes.find((n) => n.id === targetNodeId);
    if (!targetNode) return;

    const raf = requestAnimationFrame(() => {
      const viewportCenterX = canvasSize.width / 2;
      const viewportCenterY = canvasSize.height / 2;

    setPan({
      x: viewportCenterX - targetNode.x * zoom,
      y: viewportCenterY - targetNode.y * zoom,
    });
    });

    return () => cancelAnimationFrame(raf);
  }, [centerNodeId, focusNodeId, nodes, canvasSize.width, canvasSize.height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const scale = zoom;
      const deltaX = (e.clientX - nodeDragStart.x) / scale;
      const deltaY = (e.clientY - nodeDragStart.y) / scale;
      setNodeDragOffset({ x: deltaX, y: deltaY });
      return;
    }

    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    if (draggingNodeId && onNodeDragEnd) {
      const finalX = nodeOriginalPos.x + nodeDragOffset.x;
      const finalY = nodeOriginalPos.y + nodeDragOffset.y;
      if (nodeDragOffset.x !== 0 || nodeDragOffset.y !== 0) {
        onNodeDragEnd(draggingNodeId, finalX, finalY);
      }
    }

    setIsDragging(false);
    setDraggingNodeId(null);
    setNodeDragOffset({ x: 0, y: 0 });
  };

  // Node mouse down handler
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string, x: number, y: number) => {
    e.stopPropagation(); // Prevent canvas panning
    // Allow clicking delete button/add button without dragging
    if ((e.target as HTMLElement).closest("button")) return;
    
    setDraggingNodeId(nodeId);
    setNodeDragStart({ x: e.clientX, y: e.clientY });
    setNodeOriginalPos({ x, y });
    setNodeDragOffset({ x: 0, y: 0 });
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
      const nextZoom = clampZoom(zoom * delta);
      if (nextZoom === zoom) return;

      const rect = container.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      const worldX = (pointerX - pan.x) / zoom;
      const worldY = (pointerY - pan.y) / zoom;

      setPan({
        x: pointerX - worldX * nextZoom,
        y: pointerY - worldY * nextZoom,
      });

      setZoom(nextZoom);
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
  }, [
    isDragging,
    zoom,
    pan,
    canvasSize.width,
    canvasSize.height,
  ]);

  const centerNode = nodes.find((n) => n.id === centerNodeId);
  
  const { immediateThreads, categoryFurthest } = useMemo(() => {
  const connectionsByParent = nodes.reduce((acc, node) => {
      if (node.parentId) {
      if (!acc[node.parentId]) {
          acc[node.parentId] = [];
      }
        acc[node.parentId].push(node);
    }
    return acc;
    }, {} as Record<string, MindMapNode[]>);

    const threads: Array<{ category?: string; from: MindMapNode; to: MindMapNode }> = [];
    const furthestByCategory: Record<string, Array<{ category?: string; from: MindMapNode; to: MindMapNode }>> = {};
  
    Object.entries(connectionsByParent).forEach(([parentId, childNodes]) => {
      const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode) return;
    
      const groupedByCategory = childNodes.reduce((acc, node) => {
        const key = node.category || "default";
        if (!acc[key]) acc[key] = [];
        acc[key].push(node);
        return acc;
      }, {} as Record<string, MindMapNode[]>);

      childNodes.forEach((child) => {
        threads.push({
          category: child.category,
          from: parentNode,
          to: child,
        });
      });

      Object.entries(groupedByCategory).forEach(([categoryKey, categoryNodes]) => {
      if (categoryNodes.length === 0) return;
        const furthestNode = categoryNodes.reduce((furthest, current) => {
          const distFurthest = Math.hypot(furthest.x - parentNode.x, furthest.y - parentNode.y);
          const distCurrent = Math.hypot(current.x - parentNode.x, current.y - parentNode.y);
          return distCurrent > distFurthest ? current : furthest;
        }, categoryNodes[0]);

        const record = {
          category: furthestNode.category,
        from: parentNode,
        to: furthestNode,
        };

        if (!furthestByCategory[parentNode.id]) {
          furthestByCategory[parentNode.id] = [];
        }
        furthestByCategory[parentNode.id].push(record);
      });
    });

    const categoryFurthestRecords = Object.values(furthestByCategory).flat();

    return { immediateThreads: threads, categoryFurthest: categoryFurthestRecords };
  }, [nodes]);

  return (
    <div 
      className="relative h-full min-h-[60vh] w-full overflow-hidden bg-background"
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
            {immediateThreads.map((thread, index) => {
              if (!thread) return null;
              const { category, from, to } = thread;
              const categoryColor = getCategoryColor(category as WordCategory, isDark) || "#999";
              
              // Calculate dynamic positions
              const fromX = from.id === draggingNodeId ? from.x + nodeDragOffset.x : from.x;
              const fromY = from.id === draggingNodeId ? from.y + nodeDragOffset.y : from.y;
              const toX = to.id === draggingNodeId ? to.x + nodeDragOffset.x : to.x;
              const toY = to.id === draggingNodeId ? to.y + nodeDragOffset.y : to.y;

              // Check if thread should be highlighted
              const isHighlighted = !hoverNodeId || (highlightedIds?.has(from.id) && highlightedIds?.has(to.id));
              const opacity = isHighlighted ? 0.8 : 0.1;
              const width = isHighlighted ? 2 : 1;
              
              return (
                <motion.path
                  key={`thread-${category ?? "default"}-${from.id}-${to.id}-${index}`}
                  d={`M ${fromX} ${fromY} L ${toX} ${toY}`}
                  stroke={categoryColor}
                  strokeWidth={width}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
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
          {onNodeAdd && categoryFurthest.map((thread, index) => {
            if (!thread) return null;
            const { category, from, to } = thread;
            const categoryColor = getCategoryColor(category as WordCategory, isDark) || "#999";
            
            // Calculate dynamic positions
            const fromX = from.id === draggingNodeId ? from.x + nodeDragOffset.x : from.x;
            const fromY = from.id === draggingNodeId ? from.y + nodeDragOffset.y : from.y;
            const toX = to.id === draggingNodeId ? to.x + nodeDragOffset.x : to.x;
            const toY = to.id === draggingNodeId ? to.y + nodeDragOffset.y : to.y;
            
            // Calculate button position: same distance as node spacing (boundaryGap = 80px)
            const dx = toX - fromX;
            const dy = toY - fromY;
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
            const buttonX = toX + unitX * buttonDistance;
            const buttonY = toY + unitY * buttonDistance;
            
            return (
              <div
                key={`add-btn-${category ?? "default"}-${from.id}-${to.id}-${index}`}
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
              const isDraggingNode = node.id === draggingNodeId;
              
              // Calculate dynamic position including drag offset
              const currentX = isDraggingNode ? node.x + nodeDragOffset.x : node.x;
              const currentY = isDraggingNode ? node.y + nodeDragOffset.y : node.y;
              
              // Highlight logic
              const isHighlighted = !hoverNodeId || highlightedIds?.has(node.id);
              const opacity = isHighlighted ? 1 : 0.3;

              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{
                    left: currentX,
                    top: currentY,
                    transform: "translate(-50%, -50%)",
                    zIndex: isDraggingNode ? 100 : (isCenter ? 50 : 1),
                  }}
                >
                  <motion.div
                    data-node
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="relative group"
                    data-testid={`node-${node.word}`}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id, node.x, node.y)}
                    onMouseEnter={() => setHoverNodeId(node.id)}
                    onMouseLeave={() => setHoverNodeId(null)}
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
                        rounded-xl font-semibold transition-all cursor-grab active:cursor-grabbing
                        px-4 py-2.5 text-lg min-w-[100px]
                        ${
                          isCenter
                            ? "bg-primary text-primary-foreground shadow-xl border-2 border-primary/20"
                            : "bg-card hover:bg-card/90 shadow-sm hover:shadow-md border-2"
                        }
                      `}
                      style={{
                        borderColor: !isCenter && categoryColor ? categoryColor : undefined,
                        color: !isCenter && categoryColor ? categoryColor : undefined,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNodeClick(node.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onNodeEdit?.(node.id);
                      }}
                    >
                      <div className="text-center whitespace-nowrap select-none">
                        {node.word}
                      </div>
                      {node.category && !isCenter && (
                        <div className="text-xs text-muted-foreground text-center mt-1 font-normal select-none">
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
