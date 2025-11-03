import { useRef, useState, useEffect } from "react";
import { type MindMapNode, type WordCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCategoryColor } from "@shared/categoryColors";
import { useTheme } from "@/contexts/ThemeContext";

interface MindMapCanvasProps {
  nodes: MindMapNode[];
  onNodeClick: (nodeId: string) => void;
  onNodeDelete: (nodeId: string) => void;
  centerNodeId?: string;
}

export function MindMapCanvas({
  nodes,
  onNodeClick,
  onNodeDelete,
  centerNodeId,
}: MindMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Auto-center the center node when it's created
  useEffect(() => {
    if (!centerNodeId || !containerRef.current) return;
    
    const centerNode = nodes.find((n) => n.id === centerNodeId);
    if (!centerNode) return;

    // Calculate the center of the viewport
    const rect = containerRef.current.getBoundingClientRect();
    const viewportCenterX = rect.width / 2;
    const viewportCenterY = rect.height / 2;

    // Calculate the pan needed to center the node
    setPan({
      x: viewportCenterX - centerNode.x * zoom,
      y: viewportCenterY - centerNode.y * zoom,
    });
  }, [centerNodeId, nodes, zoom]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(Math.max(prev * delta, 0.3), 3));
  };

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

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Group nodes by category AND parent (center node) for spider thread lines
  const centerNode = nodes.find((n) => n.id === centerNodeId);
  
  const categoryThreads = nodes.reduce((acc, node) => {
    if (node.category && node.parentId === centerNodeId) {
      if (!acc[node.category]) {
        acc[node.category] = [];
      }
      acc[node.category].push(node);
    }
    return acc;
  }, {} as Record<string, MindMapNode[]>);

  // Create spider thread lines (one straight line per category from center through furthest node)
  const spiderThreads = Object.entries(categoryThreads).map(([category, categoryNodes]) => {
    if (!centerNode || categoryNodes.length === 0) return null;

    // Sort nodes by distance from center to get the furthest one
    const sortedNodes = [...categoryNodes].sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.x - centerNode.x, 2) + Math.pow(a.y - centerNode.y, 2));
      const distB = Math.sqrt(Math.pow(b.x - centerNode.x, 2) + Math.pow(b.y - centerNode.y, 2));
      return distB - distA;
    });

    const furthestNode = sortedNodes[0];

    return {
      category,
      from: centerNode,
      to: furthestNode,
    };
  }).filter(Boolean);

  return (
    <div 
      className="relative h-full w-full overflow-hidden bg-background"
      style={{
        backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Canvas */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
                        className="absolute -top-2 -right-2 z-20 w-5 h-5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground border border-border opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:scale-110 shadow-md"
                        data-testid={`button-delete-${node.word}`}
                        aria-label="Delete node"
                      >
                        <X className="w-3 h-3" />
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
                          {node.category}
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
    </div>
  );
}
