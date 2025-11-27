import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X, Terminal, Trash2, Minimize2, Maximize2 } from "lucide-react";

type LogLevel = 'log' | 'warn' | 'error' | 'info';

interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any[];
}

export function DebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Intercept console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    const formatArg = (arg: any): string => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack}`;
      }
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    };

    const addLog = (level: LogLevel, args: any[]) => {
      const message = args.map(formatArg).join(' ');
      setLogs(prev => [...prev.slice(-199), { // Keep last 200 logs
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        level,
        message,
        data: args
      }]);
      
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.info = (...args) => {
      originalInfo(...args);
      addLog('info', args);
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('error', ['Unhandled Rejection:', event.reason]);
    };

    // Handle global errors
    const handleGlobalError = (event: ErrorEvent) => {
      addLog('error', ['Global Error:', event.message, event.filename, event.lineno, event.colno, event.error]);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-24 right-4 z-[9999] rounded-full shadow-lg bg-black/80 hover:bg-black h-12 w-12 p-0"
        onClick={() => setIsOpen(true)}
      >
        <Terminal className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <div className={`fixed z-[9999] bg-black/90 text-white border border-gray-700 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
      isMinimized 
        ? 'bottom-24 right-4 w-64 h-12 rounded-lg' 
        : 'inset-x-0 bottom-0 h-[50vh] rounded-t-xl'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-green-400" />
          <span className="text-xs font-mono font-bold">Debug Console ({logs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-gray-800 text-gray-400" onClick={() => setLogs([])}>
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-gray-800 text-gray-400" onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-gray-800 text-gray-400" onClick={() => setIsOpen(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className={`p-1 rounded border-l-2 break-all whitespace-pre-wrap ${
                log.level === 'error' ? 'border-red-500 bg-red-900/20 text-red-200' :
                log.level === 'warn' ? 'border-yellow-500 bg-yellow-900/20 text-yellow-200' :
                'border-blue-500 bg-transparent text-gray-300'
              }`}>
                <div className="flex gap-2 text-[10px] text-gray-500 mb-1">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="uppercase font-bold">{log.level}</span>
                </div>
                {log.message}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center text-gray-600 py-8 italic">No logs captured</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
