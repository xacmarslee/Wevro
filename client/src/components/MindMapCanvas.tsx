import { useRef, useState, useEffect } from "react";
import { type MindMapNode } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  // Draw connections between nodes
  const connections = nodes
    .filter((node) => node.parentId)
    .map((node) => {
      const parent = nodes.find((n) => n.id === node.parentId);
      if (!parent) return null;
      return {
        from: parent,
        to: node,
      };
    })
    .filter(Boolean);

  return (
    <div 
      className="relative h-full w-full overflow-hidden bg-background"
      style={{
        backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    >
      {/* Zoom controls */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setZoom((z) => Math.min(z * 1.2, 3))}
          data-testid="button-zoom-in"
          className="shadow-lg"
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.3))}
          data-testid="button-zoom-out"
          className="shadow-lg"
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={resetView}
          data-testid="button-reset-view"
          className="shadow-lg"
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      </div>

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
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {connections.map((conn, idx) => {
            if (!conn) return null;
            const { from, to } = conn;
            return (
              <motion.line
                key={`${from.id}-${to.id}-${idx}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="hsl(var(--border))"
                strokeWidth={2}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            );
          })}
        </svg>

        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <AnimatePresence>
            {nodes.map((node) => {
              const isCenter = node.id === centerNodeId;
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
                      rounded-2xl px-8 py-6 font-semibold shadow-lg border transition-all
                      ${
                        isCenter
                          ? "bg-primary text-primary-foreground border-primary-border text-4xl min-w-[200px] shadow-xl"
                          : "bg-card text-card-foreground border-card-border text-2xl min-w-[150px] hover-elevate active-elevate-2 hover:scale-105"
                      }
                    `}
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
