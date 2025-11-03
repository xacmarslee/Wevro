import { useRef, useState, useEffect } from "react";
import { type MindMapNode } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCategoryColor } from "@shared/categoryColors";
import { useTheme } from "@/contexts/ThemeContext";

interface MindMapCanvasProps {
  nodes: MindMapNode[];
  onNodeClick: (nodeId: string) => void;
  centerNodeId?: string;
}

export function MindMapCanvas({
  nodes,
  onNodeClick,
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

  // Create spider thread polylines (one polyline per category connecting all nodes in order)
  const spiderThreads = Object.entries(categoryThreads).map(([category, categoryNodes]) => {
    if (!centerNode || categoryNodes.length === 0) return null;

    // Sort nodes by distance from center (closest to furthest)
    const sortedNodes = [...categoryNodes].sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.x - centerNode.x, 2) + Math.pow(a.y - centerNode.y, 2));
      const distB = Math.sqrt(Math.pow(b.x - centerNode.x, 2) + Math.pow(b.y - centerNode.y, 2));
      return distA - distB;
    });

    // Create points array: center -> node1 -> node2 -> ... -> nodeN
    const points = [centerNode, ...sortedNodes];

    return {
      category,
      points,
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
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {spiderThreads.map((thread) => {
            if (!thread) return null;
            const { category, points } = thread;
            const categoryColor = getCategoryColor(category, isDark);
            
            // Create polyline points string: "x1,y1 x2,y2 x3,y3 ..."
            const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');
            
            return (
              <motion.polyline
                key={`thread-${category}`}
                points={pointsString}
                stroke={categoryColor}
                strokeWidth={2}
                fill="none"
                opacity={0.5}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 0.5 }}
              />
            );
          })}
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
                <motion.div
                  key={node.id}
                  data-node
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="absolute cursor-pointer"
                  style={{
                    left: node.x,
                    top: node.y,
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNodeClick(node.id);
                  }}
                  data-testid={`node-${node.word}`}
                >
                  <div
                    className={`
                      rounded-xl font-semibold shadow-lg border-2 transition-all
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
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
