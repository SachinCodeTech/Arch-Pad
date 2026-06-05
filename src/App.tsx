import React, { useEffect, useRef, useState } from 'react';
import Splash from './components/Splash';
import Sidebar from './components/Sidebar';
import CanvasArea from './components/CanvasArea';
import Toolbar from './components/Toolbar';
import Modals from './components/Modals';
import Toast from './components/Toast';

import { Project, ToolType, ThemeType } from './types';
import {
  getLocalProjects,
  saveLocalProject,
  deleteLocalProject,
  getLocalDrawing,
  saveLocalDrawing
} from './lib/db';
// Local offline secure mode

const APP_ICON_SVG = '/icon.svg';

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTool, setTool] = useState<ToolType>('pen');
  const [pencilSize, setPencilSize] = useState<number>(2);
  const [pencilColor, setPencilColor] = useState<string>('#1a1a1a');
  const [gridVisible, setGridVisible] = useState<boolean>(false);
  const [currentScale, setScale] = useState<string>('1:100');
  const [theme, setTheme] = useState<ThemeType>('dark');

  // Multi-store tracking
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [currentProject, setCurrentProject] = useState<string>('Sketch 1');

  // Local offline secure states
  const [isCloudSyncing] = useState(false);

  // Auto-save badges
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'none'>('none');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Canvas context refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse / Drawing State Engine Variables
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInputState, setTextInputState] = useState({
    visible: false,
    x: 0,
    y: 0,
    value: ''
  });

  // History buffer
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Undo/Redo/Save drawing limits
  const startPoints = useRef({ x: 0, y: 0 });
  const previewData = useRef<ImageData | null>(null);

  // High performance CAD drawing and coordinates smoothing refs
  const strokePoints = useRef<{ x: number; y: number }[]>([]);
  const pointerDownTime = useRef<number>(0);
  const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const livePointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // CAD Point-to-point drawing state variables
  const [p2pAnchor, setP2pAnchor] = useState<{ x: number; y: number } | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Shift orthographic angle snap variable
  const isShiftPressed = useRef<boolean>(false);

  // Active Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [storageUsedInfo, setStorageUsedInfo] = useState<string>('~10 KB');

  // Toast Alerts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'success' | 'info' | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // PWA Prompt Info
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);

  // High-performance Zoom and Panning offsets
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isPanning = useRef<boolean>(false);
  const startPanPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const showToast = (msg: string, stat: 'success' | 'info' | null = null) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastStatus(stat);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Listen to PWA installation prompts
  useEffect(() => {
    const handleBeforePrompt = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
  }, []);

  // Listen for keyboard drawing constraints (Shift to snap 45 degrees, Escape to cancel point-to-point)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftPressed.current = true;
        if (p2pAnchor || isDrawing) redrawVisibleCanvas();
      }
      if (e.key === 'Escape') {
        setP2pAnchor(null);
        setHoverPos(null);
        redrawVisibleCanvas();
        showToast('CAD Point-to-Point drawing cancelled.');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftPressed.current = false;
        if (p2pAnchor || isDrawing) redrawVisibleCanvas();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [p2pAnchor, isDrawing]);

  // Reset CAD Point-to-Point if selected tool changes
  useEffect(() => {
    setP2pAnchor(null);
    setHoverPos(null);
    strokePoints.current = [];
    if (appReady) redrawVisibleCanvas();
  }, [currentTool, appReady]);

  // No external cloud auth needed

  // 1. Initial workspace Load
  useEffect(() => {
    const fetchLocal = async () => {
      try {
        const loadedProjects = await getLocalProjects();
        const normalized: Record<string, Project> = {};
        
        if (loadedProjects.length === 0) {
          // Initialize first default sketch
          const defaultProject: Project = {
            id: 'Sketch_1',
            name: 'Sketch 1',
            created: Date.now(),
            modified: Date.now(),
            scale: '1:100'
          };
          await saveLocalProject(defaultProject);
          normalized[defaultProject.name] = defaultProject;
          setProjects(normalized);
          setCurrentProject(defaultProject.name);
          localStorage.setItem('voxpad_current', defaultProject.name);
        } else {
          loadedProjects.forEach((p) => {
            normalized[p.name] = p;
          });
          setProjects(normalized);
          const lastUsed = localStorage.getItem('voxpad_current') || loadedProjects[0].name;
          setCurrentProject(normalized[lastUsed] ? lastUsed : loadedProjects[0].name);
        }

        // Load Theme settings
        const loadedTheme = (localStorage.getItem('voxpad_theme') as ThemeType) || 'dark';
        setTheme(loadedTheme);

        // Service Worker dynamic registration
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('Service worker registration failed:', err);
          });
        }
      } catch (err) {
        console.error('Error opening local database stores:', err);
      }
    };
    fetchLocal();
  }, []);

  // Triggered when App is fully ready
  const handleSplashComplete = () => {
    setAppReady(true);
    triggerPreserveResize();
    updateStorageUsageCount();
  };

  // Periodic autosave monitoring
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      handleSilentAutoSave();
    }, 30000);
    return () => clearInterval(autoSaveInterval);
  }, [currentProject, projects]);

  // Synchronously redraw the visible canvas elements (drawing and background grid) when pan, zoom, grid, or theme changes
  useEffect(() => {
    if (appReady) {
      redrawVisibleCanvas();
      if (gridVisible) {
        drawBgCADGrid();
      } else {
        clearBgCADGrid();
      }
    }
  }, [zoom, panOffset, gridVisible, theme, appReady]);

  // Adjust document body theme styling
  useEffect(() => {
    document.body.className = (theme === 'light' ? 'light-mode ' : '') + (currentTool === 'text' ? 'text-tool' : '');
    localStorage.setItem('voxpad_theme', theme);
  }, [theme, currentTool]);

  // Handle canvas sizing / resize callbacks safely
  useEffect(() => {
    const handleResize = () => {
      triggerPreserveResize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentProject]);

  // Sync canvas drawing image with current project change
  useEffect(() => {
    if (appReady) {
      loadSelectedProjectDrawing();
    }
  }, [currentProject, appReady]);

  const initOffscreenCanvas = () => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = 3000;
      offscreenCanvasRef.current.height = 2000;
      const oCtx = offscreenCanvasRef.current.getContext('2d');
      if (oCtx) {
        oCtx.fillStyle = theme === 'light' ? '#ffffff' : '#fafaf8';
        oCtx.fillRect(0, 0, 3000, 2000);
      }
    }
  };

  const getScaleMultiplier = () => {
    const match = currentScale.match(/1:(\d+)/);
    if (match) {
      const ratio = parseInt(match[1]);
      return ratio / 100;
    }
    return 1.0;
  };

  const redrawVisibleCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the screen canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Translate and Scale zoom
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    if (offscreenCanvasRef.current) {
      const w = offscreenCanvasRef.current.width;
      const h = offscreenCanvasRef.current.height;

      // Add a subtle border/shadow for the drafting sheet, making it look incredibly realistic!
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 6;

      ctx.fillStyle = theme === 'light' ? '#ffffff' : '#fafaf8';
      ctx.fillRect(0, 0, w, h);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw client artwork
      ctx.drawImage(offscreenCanvasRef.current, 0, 0);

      // --- ADVANCED DYNAMIC CAD BLUEPRINT LAYER ---
      let drawPreview = false;
      let sx = 0, sy = 0, ex = 0, ey = 0;

      if (p2pAnchor) {
        drawPreview = true;
        sx = p2pAnchor.x;
        sy = p2pAnchor.y;
        ex = hoverPos ? hoverPos.x : sx;
        ey = hoverPos ? hoverPos.y : sy;
      } else if (isDrawing && currentTool !== 'pen' && currentTool !== 'eraser' && currentTool !== 'pan') {
        drawPreview = true;
        sx = startPoints.current.x;
        sy = startPoints.current.y;
        ex = livePointerPos.current.x;
        ey = livePointerPos.current.y;
      }

      if (drawPreview) {
        if (isShiftPressed.current) {
          const dx = ex - sx;
          const dy = ey - sy;
          const angle = Math.atan2(dy, dx);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const distance = Math.sqrt(dx * dx + dy * dy);
          ex = sx + distance * Math.cos(snappedAngle);
          ey = sy + distance * Math.sin(snappedAngle);
        }

        ctx.save();
        // 1. Live floating blueprint path vector preview
        ctx.strokeStyle = '#4f8ef7';
        ctx.lineWidth = pencilSize;
        ctx.setLineDash([4 / zoom, 4 / zoom]); // Scale invariant screen dashes
        ctx.shadowColor = 'rgba(79, 142, 247, 0.4)';
        ctx.shadowBlur = 8 / zoom;

        drawVectorShape(ctx, currentTool, sx, sy, ex, ey, pencilSize, '#4f8ef7');
        ctx.restore();

        ctx.save();
        // 2. Blueprint alignment CAD helpers
        ctx.strokeStyle = '#4f8ef7';
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([3 / zoom, 3 / zoom]);

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Crosshairs at starting point
        const cs = 10 / zoom;
        ctx.beginPath();
        ctx.moveTo(sx - cs, sy); ctx.lineTo(sx + cs, sy);
        ctx.moveTo(sx, sy - cs); ctx.lineTo(sx, sy + cs);
        ctx.stroke();

        // Crosshairs at endpoint
        ctx.beginPath();
        ctx.moveTo(ex - cs, ey); ctx.lineTo(ex + cs, ey);
        ctx.moveTo(ex, ey - cs); ctx.lineTo(ex, ey + cs);
        ctx.stroke();

        // 3. Proportional physical scale text tags
        const dx = ex - sx;
        const dy = ey - sy;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const angleRad = Math.atan2(dy, dx);
        let angleDeg = Math.round(angleRad * 180 / Math.PI);
        if (angleDeg < 0) angleDeg += 360;

        const mult = getScaleMultiplier();
        const distReal = distPx * mult;
        const label = `${distReal.toFixed(2)}m (${angleDeg}°)`;

        ctx.font = `bold ${Math.max(10, 11 / zoom)}px 'JetBrains Mono', monospace`;
        const tw = ctx.measureText(label).width;

        const padX = 6 / zoom;
        const padY = 4 / zoom;
        const bw = tw + padX * 2;
        const bh = (12 / zoom) + padY * 2;

        const mx = (sx + ex) / 2;
        const my = (sy + ey) / 2;

        ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
        ctx.fillRect(mx - bw / 2, my - 24 / zoom, bw, bh);

        ctx.strokeStyle = 'rgba(79, 142, 247, 0.5)';
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([]);
        ctx.strokeRect(mx - bw / 2, my - 24 / zoom, bw, bh);

        ctx.fillStyle = '#4f8ef7';
        ctx.fillText(label, mx - tw / 2, my - 15 / zoom);

        ctx.restore();
      }
    }
    ctx.restore();
  };

  const loadSelectedProjectDrawing = async () => {
    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    // Reset offscreen to solid white/light background
    oCtx.fillStyle = theme === 'light' ? '#ffffff' : '#fafaf8';
    oCtx.fillRect(0, 0, oCanvas.width, oCanvas.height);

    setHistory([]);
    setHistoryIndex(-1);

    const matchProj = projects[currentProject];
    if (matchProj) {
      setScale(matchProj.scale);
      const cached = await getLocalDrawing(matchProj.id);
      if (cached) {
        const img = new Image();
        img.onload = () => {
          oCtx.drawImage(img, 0, 0);
          takeSnapSnapshot();
          redrawVisibleCanvas();
        };
        img.src = cached;
      } else {
        takeSnapSnapshot();
        redrawVisibleCanvas();
      }
    } else {
      takeSnapSnapshot();
      redrawVisibleCanvas();
    }
  };

  const triggerPreserveResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent || !parent.clientWidth || !parent.clientHeight) return;

    // Simply resize screen canvas to fill parent viewport
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    // Resize grid canvas too
    if (gridCanvasRef.current) {
      gridCanvasRef.current.width = canvas.width;
      gridCanvasRef.current.height = canvas.height;
      if (gridVisible) drawBgCADGrid();
    }

    // Direct redraw from stable offscreen canvas
    redrawVisibleCanvas();
  };

  // Background CAD GRID drawings (dynamic panning and zooming infinite grids)
  const drawBgCADGrid = () => {
    const gc = gridCanvasRef.current;
    if (!gc) return;
    const gCtx = gc.getContext('2d');
    if (!gCtx) return;

    gCtx.clearRect(0, 0, gc.width, gc.height);
    const sz = 30 * zoom; 
    if (sz < 5) return; // prevent zero/tiny division infinite loops

    // Small grids
    gCtx.strokeStyle = 'rgba(100, 120, 200, 0.15)';
    gCtx.lineWidth = 0.5;
    const startX = panOffset.x % sz;
    for (let x = startX; x <= gc.width; x += sz) {
      gCtx.beginPath();
      gCtx.moveTo(x, 0);
      gCtx.lineTo(x, gc.height);
      gCtx.stroke();
    }
    const startY = panOffset.y % sz;
    for (let y = startY; y <= gc.height; y += sz) {
      gCtx.beginPath();
      gCtx.moveTo(0, y);
      gCtx.lineTo(gc.width, y);
      gCtx.stroke();
    }

    // Heavy main axes
    const heavySz = sz * 5;
    gCtx.strokeStyle = 'rgba(100, 120, 200, 0.25)';
    gCtx.lineWidth = 0.8;
    const hStartX = panOffset.x % heavySz;
    for (let x = hStartX; x <= gc.width; x += heavySz) {
      gCtx.beginPath();
      gCtx.moveTo(x, 0);
      gCtx.lineTo(x, gc.height);
      gCtx.stroke();
    }
    const hStartY = panOffset.y % heavySz;
    for (let y = hStartY; y <= gc.height; y += heavySz) {
      gCtx.beginPath();
      gCtx.moveTo(0, y);
      gCtx.lineTo(gc.width, y);
      gCtx.stroke();
    }
  };

  const clearBgCADGrid = () => {
    const gc = gridCanvasRef.current;
    if (!gc) return;
    const gCtx = gc.getContext('2d');
    if (!gCtx) return;
    gCtx.clearRect(0, 0, gc.width, gc.height);
  };

  // Draw History Snapshots logic from offscreen canvas
  const takeSnapSnapshot = () => {
    initOffscreenCanvas();
    const canvas = offscreenCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width === 0 || canvas.height === 0) return;

    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const updated = [...sliced, snap];
      if (updated.length > 50) updated.shift();
      return updated;
    });
    setHistoryIndex((prev) => {
      const nextIndex = Math.min(historyIndex + 1, 49);
      return nextIndex;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      if (offscreenCanvasRef.current) {
        const oCtx = offscreenCanvasRef.current.getContext('2d');
        if (oCtx && history[prevIndex]) {
          oCtx.putImageData(history[prevIndex], 0, 0);
          redrawVisibleCanvas();
          triggerQuickAutoSaveDelay();
        }
      }
    } else {
      showToast('Nothing to undo');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      if (offscreenCanvasRef.current) {
        const oCtx = offscreenCanvasRef.current.getContext('2d');
        if (oCtx && history[nextIndex]) {
          oCtx.putImageData(history[nextIndex], 0, 0);
          redrawVisibleCanvas();
          triggerQuickAutoSaveDelay();
        }
      }
    } else {
      showToast('Nothing to redo');
    }
  };

  // Drawing event coordinate mapping helpers representing high-performance zooming and panning offsets
  const getPointerPos = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    // Always map relative to the untransformed viewport container wrap element to prevent scale circular dependency
    const parent = canvas.closest('#canvas-wrap') || canvas.parentElement || canvas;
    const rect = parent.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    const nativeEvent = e.nativeEvent;
    if ('touches' in nativeEvent) {
      if (nativeEvent.touches.length > 0) {
        clientX = nativeEvent.touches[0].clientX;
        clientY = nativeEvent.touches[0].clientY;
      } else if (nativeEvent.changedTouches.length > 0) {
        clientX = nativeEvent.changedTouches[0].clientX;
        clientY = nativeEvent.changedTouches[0].clientY;
      }
    } else if (e.type.startsWith('pointer') || e.type.startsWith('mouse')) {
      const ev = e as React.PointerEvent<HTMLCanvasElement>;
      clientX = ev.clientX;
      clientY = ev.clientY;
    }

    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    return {
      x: (cx - panOffset.x) / zoom,
      y: (cy - panOffset.y) / zoom
    };
  };

  // 2. CANVAS DRAWING CODES
  const onPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (sidebarOpen) setSidebarOpen(false);

    const nativeEvent = e.nativeEvent;
    
    // Prevent zoom/pinch gestures from triggering stray line drawing
    const hasMultipleTouches = 
      ('touches' in nativeEvent && nativeEvent.touches.length > 1) || 
      ((nativeEvent as any).touches && (nativeEvent as any).touches.length > 1);
    if (hasMultipleTouches) {
      if (isDrawing) setIsDrawing(false);
      isPanning.current = false;
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    // Capture the pointer stream to keep receiving events even if dragged off canvas borders
    if ('pointerId' in e) {
      try {
        (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    // If 'pan' tool mode is active, handle custom canvas pan offset navigation
    if (currentTool === 'pan') {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in nativeEvent) {
        if (nativeEvent.touches.length > 0) {
          clientX = nativeEvent.touches[0].clientX;
          clientY = nativeEvent.touches[0].clientY;
        }
      } else {
        const ev = e as React.PointerEvent<HTMLCanvasElement>;
        clientX = ev.clientX;
        clientY = ev.clientY;
      }
      isPanning.current = true;
      startPanPos.current = { x: clientX, y: clientY };
      initialPanOffset.current = { ...panOffset };
      return;
    }

    const { x, y } = getPointerPos(e);

    if (currentTool === 'text') {
      setTextInputState({
        visible: true,
        x,
        y,
        value: ''
      });
      return;
    }

    // --- SECOND-POINT CAD CLICK FINALIZATION TRIGGER ---
    if (p2pAnchor) {
      let endX = x;
      let endY = y;
      
      if (isShiftPressed.current) {
        const dx = endX - p2pAnchor.x;
        const dy = endY - p2pAnchor.y;
        const angle = Math.atan2(dy, dx);
        const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const distance = Math.sqrt(dx * dx + dy * dy);
        endX = p2pAnchor.x + distance * Math.cos(snappedAngle);
        endY = p2pAnchor.y + distance * Math.sin(snappedAngle);
      }

      initOffscreenCanvas();
      const oCanvas = offscreenCanvasRef.current;
      if (oCanvas) {
        const oCtx = oCanvas.getContext('2d');
        if (oCtx) {
          takeSnapSnapshot();
          drawVectorShape(oCtx, currentTool, p2pAnchor.x, p2pAnchor.y, endX, endY);
          
          setP2pAnchor(null);
          setHoverPos(null);
          setIsDrawing(false);
          redrawVisibleCanvas();
          triggerQuickAutoSaveDelay();
        }
      }
      return;
    }

    // Capture click parameters for potential Point-to-Point fallback detection
    pointerDownTime.current = Date.now();
    pointerDownPos.current = { x, y };
    livePointerPos.current = { x, y };

    setIsDrawing(true);
    startPoints.current = { x, y };

    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    if (currentTool === 'pen' || currentTool === 'eraser') {
      takeSnapSnapshot();
      strokePoints.current = [{ x, y }];

      oCtx.beginPath();
      oCtx.arc(
        x,
        y,
        pencilSize * (currentTool === 'eraser' ? 1.5 : 0.5),
        0,
        Math.PI * 2
      );
      
      const isLight = theme === 'light';
      oCtx.fillStyle = currentTool === 'eraser' ? (isLight ? '#ffffff' : '#fafaf8') : pencilColor;
      oCtx.fill();

      redrawVisibleCanvas();
    } else {
      previewData.current = {} as ImageData; // truthy placeholder
    }
  };

  const onPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const nativeEvent = e.nativeEvent;
    
    // Prevent zoom/pinch gestures from triggering stray line drawing
    const hasMultipleTouches = 
      ('touches' in nativeEvent && nativeEvent.touches.length > 1) || 
      ((nativeEvent as any).touches && (nativeEvent as any).touches.length > 1);
    if (hasMultipleTouches) {
      if (isDrawing) setIsDrawing(false);
      isPanning.current = false;
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    // Incorporate dynamic desktop/touch pointer drag updates for active map pan tool navigation
    if (currentTool === 'pan') {
      if (!isPanning.current) return;
      let clientX = 0;
      let clientY = 0;
      if ('touches' in nativeEvent) {
        if (nativeEvent.touches.length > 0) {
          clientX = nativeEvent.touches[0].clientX;
          clientY = nativeEvent.touches[0].clientY;
        }
      } else {
        const ev = e as React.PointerEvent<HTMLCanvasElement>;
        clientX = ev.clientX;
        clientY = ev.clientY;
      }
      const dx = clientX - startPanPos.current.x;
      const dy = clientY - startPanPos.current.y;
      setPanOffset({
        x: initialPanOffset.current.x + dx,
        y: initialPanOffset.current.y + dy
      });
      return;
    }

    const { x, y } = getPointerPos(e);
    livePointerPos.current = { x, y };

    if (p2pAnchor) {
      setHoverPos({ x, y });
      redrawVisibleCanvas();
      return;
    }

    if (!isDrawing) return;
    
    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    if (currentTool === 'pen' || currentTool === 'eraser') {
      const pts = strokePoints.current;
      pts.push({ x, y });

      if (pts.length > 2) {
        const prevMidX = (pts[pts.length - 3].x + pts[pts.length - 2].x) / 2;
        const prevMidY = (pts[pts.length - 3].y + pts[pts.length - 2].y) / 2;
        const currMidX = (pts[pts.length - 2].x + pts[pts.length - 1].x) / 2;
        const currMidY = (pts[pts.length - 2].y + pts[pts.length - 1].y) / 2;

        oCtx.beginPath();
        oCtx.moveTo(prevMidX, prevMidY);
        oCtx.quadraticCurveTo(pts[pts.length - 2].x, pts[pts.length - 2].y, currMidX, currMidY);
        oCtx.lineWidth = currentTool === 'eraser' ? pencilSize * 3 : pencilSize;
        oCtx.lineCap = 'round';
        oCtx.lineJoin = 'round';
        const bgHex = theme === 'light' ? '#ffffff' : '#fafaf8';
        oCtx.strokeStyle = currentTool === 'eraser' ? bgHex : pencilColor;
        oCtx.stroke();
      } else if (pts.length === 2) {
        oCtx.beginPath();
        oCtx.moveTo(pts[0].x, pts[0].y);
        oCtx.lineTo(pts[1].x, pts[1].y);
        oCtx.lineWidth = currentTool === 'eraser' ? pencilSize * 3 : pencilSize;
        oCtx.lineCap = 'round';
        oCtx.lineJoin = 'round';
        const bgHex = theme === 'light' ? '#ffffff' : '#fafaf8';
        oCtx.strokeStyle = currentTool === 'eraser' ? bgHex : pencilColor;
        oCtx.stroke();
      }
      
      startPoints.current = { x, y };
      redrawVisibleCanvas();
    } else {
      // Direct shapes preview handled by scale-invariant dynamic blueprint layer in redrawVisibleCanvas
      redrawVisibleCanvas();
    }
  };

  const onPointerUp = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (e.cancelable) {
      e.preventDefault();
    }

    // Release the pointer capture safely
    if ('pointerId' in e) {
      try {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    if (currentTool === 'pan') {
      isPanning.current = false;
      return;
    }

    if (!isDrawing) return;

    const { x, y } = getPointerPos(e);
    
    // Check if quick tap indicates Point-to-Point mode initiation
    const duration = Date.now() - pointerDownTime.current;
    const dx = x - pointerDownPos.current.x;
    const dy = y - pointerDownPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const isShapeTool = ['line', 'rect', 'circle', 'arrow'].includes(currentTool);

    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    if (isShapeTool && duration < 320 && dist < 6) {
      // Click-Click point to point CAD mode initiated!
      setIsDrawing(false);
      setP2pAnchor({ x: pointerDownPos.current.x, y: pointerDownPos.current.y });
      setHoverPos({ x: pointerDownPos.current.x, y: pointerDownPos.current.y });
      strokePoints.current = [];
      previewData.current = null;
      redrawVisibleCanvas();
      showToast('CAD Point-to-Point mode: Click second point. [SHIFT] snaps angle.', 'info');
      return;
    }

    setIsDrawing(false);

    if (currentTool !== 'pen' && currentTool !== 'eraser') {
      if (previewData.current) {
        // Create rollback snapshot BEFORE shape is burned
        takeSnapSnapshot();
        
        let endX = x;
        let endY = y;
        if (isShiftPressed.current) {
          const sdx = endX - startPoints.current.x;
          const sdy = endY - startPoints.current.y;
          const angle = Math.atan2(sdy, sdx);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const distance = Math.sqrt(sdx * sdx + sdy * sdy);
          endX = startPoints.current.x + distance * Math.cos(snappedAngle);
          endY = startPoints.current.y + distance * Math.sin(snappedAngle);
        }

        // Permanently draw shape in world coordinate space
        drawVectorShape(oCtx, currentTool, startPoints.current.x, startPoints.current.y, endX, endY);
        previewData.current = null;
        redrawVisibleCanvas();
      }
    } else {
      // Freehand drawing completed
      strokePoints.current = [];
    }
    triggerQuickAutoSaveDelay();
  };

  const drawVectorShape = (
    ctx: CanvasRenderingContext2D,
    type: ToolType,
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    customWidth?: number,
    customColor?: string
  ) => {
    ctx.strokeStyle = customColor !== undefined ? customColor : pencilColor;
    ctx.lineWidth = customWidth !== undefined ? customWidth : pencilSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    if (type === 'line') {
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    } else if (type === 'rect') {
      ctx.strokeRect(sx, sy, ex - sx, ey - sy);
    } else if (type === 'circle') {
      const rx = Math.abs(ex - sx) / 2;
      const ry = Math.abs(ey - sy) / 2;
      ctx.ellipse((sx + ex) / 2, (sy + ey) / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'arrow') {
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 2) return;
      const angle = Math.atan2(dy, dx);
      const strokeW = customWidth !== undefined ? customWidth : pencilSize;
      const hw = Math.max(8, strokeW * 4);
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - hw * Math.cos(angle - Math.PI / 6),
        ey - hw * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - hw * Math.cos(angle + Math.PI / 6),
        ey - hw * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
  };

  // Annotation text tool finalize logic
  const handleCommitText = (text: string) => {
    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (oCanvas && text) {
      const oCtx = oCanvas.getContext('2d');
      if (oCtx) {
        takeSnapSnapshot();
        oCtx.font = `${Math.max(12, pencilSize * 3)}px 'JetBrains Mono', monospace`;
        oCtx.fillStyle = pencilColor;
        oCtx.fillText(text, textInputState.x, textInputState.y);
        redrawVisibleCanvas();
        triggerQuickAutoSaveDelay();
      }
    }
    setTextInputState({ visible: false, x: 0, y: 0, value: '' });
  };

  // Theme Settings toggler
  const handleSetTheme = (t: ThemeType) => {
    setTheme(t);
  };

  // Fullscreen support helper
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Clean Workspace Clear triggers
  const handleClearCanvasNow = () => {
    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (oCanvas) {
      const oCtx = oCanvas.getContext('2d');
      if (oCtx) {
        takeSnapSnapshot();
        oCtx.fillStyle = theme === 'light' ? '#ffffff' : '#fafaf8';
        oCtx.fillRect(0, 0, oCanvas.width, oCanvas.height);
        redrawVisibleCanvas();
        showToast('Draft space cleared');
        triggerQuickAutoSaveDelay();
      }
    }
  };

  // 3. SAVES & SYSTEM SYNCS
  const triggerQuickAutoSaveDelay = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSilentAutoSave();
    }, 4000);
  };

  const handleSilentAutoSave = async () => {
    initOffscreenCanvas();
    const canvas = offscreenCanvasRef.current || canvasRef.current;
    if (!canvas) return;

    setAutoSaveStatus('saving');
    try {
      const matchProj = projects[currentProject];
      if (matchProj) {
        const dataUrl = canvas.toDataURL();
        await saveLocalDrawing(matchProj.id, dataUrl);
        
        // Update project last modified time
        const updatedProj: Project = {
          ...matchProj,
          modified: Date.now()
        };
        await saveLocalProject(updatedProj);
        setProjects((prev) => ({
          ...prev,
          [currentProject]: updatedProj
        }));

        // Stored secure and private in client IndexedDB only

        setAutoSaveStatus('saved');
        updateStorageUsageCount();
        setTimeout(() => setAutoSaveStatus('none'), 2000);
      }
    } catch (err) {
      console.warn('Autosave delayed:', err);
      setAutoSaveStatus('none');
    }
  };

  const handleSaveProjectManually = () => {
    handleSilentAutoSave();
    showToast('Project saved successfully ✓', 'success');
  };

  // Local Storage KB calculations
  const updateStorageUsageCount = async () => {
    try {
      let bytes = 0;
      const local = await getLocalProjects();
      for (const p of local) {
        const raw = await getLocalDrawing(p.id);
        bytes += raw.length;
      }
      setStorageUsedInfo(`~${(bytes / 1024).toFixed(1)} KB`);
    } catch (e) {
      setStorageUsedInfo('~15 KB');
    }
  };

  // 4. PROJECT CRUD ACTIONS
  const handleSwitchProject = async (name: string) => {
    if (name === currentProject) return;
    await handleSilentAutoSave(); // Save current project first

    setCurrentProject(name);
    localStorage.setItem('voxpad_current', name);
    showToast(`Loaded "${name}" Successfully!`, 'success');
  };

  const handleCreateNewProject = async (name: string) => {
    if (projects[name]) {
      showToast('Project name already exists!');
      return;
    }
    await handleSilentAutoSave(); // Save current first

    const rawId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newProj: Project = {
      id: rawId,
      name,
      created: Date.now(),
      modified: Date.now(),
      scale: '1:100'
    };

    await saveLocalProject(newProj);
    setProjects((prev) => ({
      ...prev,
      [name]: newProj
    }));

    setCurrentProject(name);
    localStorage.setItem('voxpad_current', name);
    showToast(`Created Project "${name}"`, 'success');
  };

  const handleDeleteProject = async (id: string) => {
    const found = Object.keys(projects)
      .map((k) => projects[k])
      .find((p) => p.id === id);
    if (!found) return;

    if (Object.keys(projects).length <= 1) {
      showToast('Cannot delete your last project. Create a new one first!');
      return;
    }

    try {
      await deleteLocalProject(id);
      
      setProjects((prev) => {
        const copied = { ...prev };
        delete copied[found.name];
        return copied;
      });

      if (currentProject === found.name) {
        const keys = Object.keys(projects).filter((k) => k !== found.name);
        setCurrentProject(keys[0]);
        localStorage.setItem('voxpad_current', keys[0]);
      }

      showToast(`Deleted "${found.name}"`, 'success');
      updateStorageUsageCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameProject = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('Project name cannot be empty');
      return;
    }

    if (projects[trimmed] && trimmed.toLowerCase() !== oldName.toLowerCase()) {
      showToast(`A project named "${trimmed}" already exists.`);
      return;
    }

    const matchedProj = projects[oldName];
    if (!matchedProj) return;

    try {
      const updatedProj = { ...matchedProj, name: trimmed, modified: Date.now() };
      
      // Save updated project locally
      await saveLocalProject(updatedProj);

      // Renamed local project instance successfully

      setProjects((prev) => {
        const copied = { ...prev };
        delete copied[oldName];
        copied[trimmed] = updatedProj;
        return copied;
      });

      if (currentProject === oldName) {
        setCurrentProject(trimmed);
        localStorage.setItem('voxpad_current', trimmed);
      }

      showToast(`Renamed project to "${trimmed}"`, 'success');
    } catch (err) {
      console.error('Rename failed:', err);
      showToast('Error renaming project');
    }
  };

  const handleSetScale = (scale: string) => {
    setScale(scale);
    const p = projects[currentProject];
    if (p) {
      const updatedProj = { ...p, scale, modified: Date.now() };
      saveLocalProject(updatedProj).then(() => {
        setProjects((prev) => ({ ...prev, [currentProject]: updatedProj }));
        triggerQuickAutoSaveDelay();
        showToast(`Scale updated: ${scale}`, 'success');
      });
    }
  };

  const handleImportBackup = async (backupData: any) => {
    try {
      for (const id in backupData) {
        const item = backupData[id];
        if (item.meta && item.canvas) {
          const importedProject: Project = {
            id: item.meta.id || `proj_imported_${Date.now()}`,
            name: item.meta.name || 'Imported Sketch',
            created: item.meta.created || Date.now(),
            modified: Date.now(),
            scale: item.meta.scale || '1:100'
          };
          await saveLocalProject(importedProject);
          await saveLocalDrawing(importedProject.id, item.canvas);
        }
      }

      // Re-read local db directories list
      const loadedProjects = await getLocalProjects();
      const normalized: Record<string, Project> = {};
      loadedProjects.forEach((p) => {
        normalized[p.name] = p;
      });
      setProjects(normalized);
      setCurrentProject(loadedProjects[0].name);

      showToast('Backup Restored Successfully!', 'success');
      updateStorageUsageCount();
    } catch (e) {
      showToast('Error importing .voxpad backup file.');
    }
  };

  // Offline Secure Client - Storage and backup functions operate locally

  // Native share sheet handles
  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (navigator.share) {
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `${currentProject}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Sketch plan of ${currentProject}`,
              text: `Check out my drafting plans on Arch Pad Sketchbook!`
            });
          } else {
            await navigator.share({
              title: `Architectural sketch: ${currentProject}`,
              text: 'Uploaded from my local PWA drafting client.'
            });
          }
        });
      } catch (err) {
        // Standard user cancellation fallback download
        handleTriggerWebDownload();
      }
    } else {
      handleTriggerWebDownload();
    }
  };

  const handleTriggerWebDownload = () => {
    initOffscreenCanvas();
    const canvas = offscreenCanvasRef.current || canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${currentProject}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Image exported as PNG');
    }
  };

  const handleTriggerInstall = () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      pwaPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          showToast('App added standalone local!', 'success');
        }
        setPwaPrompt(null);
      });
    } else {
      setActiveModal('info-modal');
      showToast('To install, open Safari menu and select "Add to Home Screen"!', 'info');
    }
  };

  return (
    <>
      <Splash onComplete={handleSplashComplete} appIconSvg={APP_ICON_SVG} />

      <div id="app" className={`flex flex-col w-[100vw] h-[100svh] overflow-hidden bg-[var(--bg)] text-[var(--text)] transition-all ${
        appReady ? 'ready opacity-100' : 'opacity-0 scale-98 pointer-events-none'
      }`} style={{ visibility: appReady ? 'visible' : 'hidden' }}>
        
        {/* HEADER AREA */}
        <div id="header" className="h-[52px] min-h-[52px] bg-[var(--bg2)] border-b border-[var(--border)] flex items-center justify-between p-[0_10px_0_6px] gap-1.5 shrink-0 relative z-[100] select-none">
          <div className="header-left flex items-center gap-1.5 shrink-0 min-w-0">
            <button
              id="app-icon-btn"
              onClick={() => setSidebarOpen(true)}
              className="w-[36px] h-[36px] rounded-[10px] overflow-hidden border-none bg-none cursor-pointer p-0 shrink-0 transition hover:scale-[1.06] hover:shadow-[0_0_12px_rgba(79,142,247,0.4)]"
            >
              <img src={APP_ICON_SVG} alt="Menu" className="w-full h-full block" />
            </button>
            <div className="app-wordmark text-[19px] font-[800] tracking-[-0.5px] whitespace-nowrap shrink-0 leading-none bg-gradient-to-r from-[#4f8ef7] to-[#7c5cf7] bg-clip-text text-transparent font-sans">
              Arch Pad
            </div>
            <div className="project-select-wrap flex items-center gap-[5px] shrink-1 min-w-0">
               <select
                 id="project-select"
                 title="Switch project"
                 className="bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] font-mono text-[10px] p-[4px_6px] rounded-[6px] outline-none cursor-pointer max-w-[124px] min-w-[50px] truncate font-bold"
                 value={currentProject}
                 onChange={(e) => handleSwitchProject(e.target.value)}
               >
                 {Object.keys(projects).map((k) => (
                   <option key={k} value={k} className="bg-[var(--bg3)] text-[var(--text)] font-mono font-normal">
                     {k}
                   </option>
                 ))}
               </select>
               <button
                 title="New Sketch"
                 className="hdr-btn bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] font-sans text-[10px] font-bold p-[4px_8px] rounded-[6px] cursor-pointer hover:bg-[var(--bg4)] transition select-none flex items-center justify-center h-[24px]"
                 onClick={() => setActiveModal('new-project-modal')}
               >
                 ＋
               </button>
             </div>
          </div>

          <div className="header-right flex items-center gap-1.5 shrink-0">
            {/* Native Install Prompt Indicator */}
            {pwaPrompt && (
              <button
                onClick={handleTriggerInstall}
                className="hdr-btn bg-gradient-to-r from-[#4f8ef7]/20 to-[#7c5cf7]/20 border border-[#7c5cf7]/40 text-[#4f8ef7] font-semibold text-[10px] p-[5px_8px] rounded-[6px] cursor-pointer"
              >
                📥 Install
              </button>
            )}
            <button
              className="hdr-btn bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] font-mono text-[10px] font-bold p-[5px_8px] rounded-[6px] cursor-pointer hover:bg-[var(--bg4)]"
              onClick={handleToggleFullscreen}
            >
              ⛶
            </button>
          </div>
        </div>

        {/* WORKSPACE & CANVAS AREA */}
        <CanvasArea
          canvasRef={canvasRef}
          gridCanvasRef={gridCanvasRef}
          currentTool={currentTool}
          gridVisible={gridVisible}
          currentScale={currentScale}
          autoSaveStatus={autoSaveStatus}
          textInputState={textInputState}
          setTextInputState={setTextInputState}
          onCommitText={handleCommitText}
          pencilSize={pencilSize}
          pencilColor={pencilColor}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          zoom={zoom}
          setZoom={setZoom}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          setTool={setTool}
        />

        {/* PULLUP CONTROL TOOLBAR */}
        <Toolbar
          currentTool={currentTool}
          setTool={setTool}
          pencilSize={pencilSize}
          setPencilSize={setPencilSize}
          setPencilNamedColor={(name) => {
            const hex = { light: '#bbbbbb', medium: '#555555', dark: '#111111' }[name];
            setPencilColor(hex);
            if (currentTool === 'eraser') setTool('pen');
          }}
          pencilColor={pencilColor}
          setPencilColor={setPencilColor}
          gridVisible={gridVisible}
          toggleGrid={() => setGridVisible(!gridVisible)}
          undo={handleUndo}
          redo={handleRedo}
          onSave={handleSaveProjectManually}
          onClear={() => setActiveModal('clear-modal')}
          onFullscreen={handleToggleFullscreen}
          openModal={setActiveModal}
          onShare={handleNativeShare}
          theme={theme}
          setTheme={handleSetTheme}
          zoom={zoom}
          setZoom={setZoom}
          setPanOffset={setPanOffset}
        />

        {/* DIALOG PREFERENCE WINDOWS */}
        <Modals
          activeModal={activeModal}
          closeActiveModal={() => setActiveModal(null)}
          projects={projects}
          currentProject={currentProject}
          onSwitchProject={handleSwitchProject}
          onCreateProject={handleCreateNewProject}
          onDeleteProject={handleDeleteProject}
          onRenameProject={handleRenameProject}
          currentScale={currentScale}
          onSetScale={handleSetScale}
          canvasRef={canvasRef}
          storageUsedInfo={storageUsedInfo}
          onClearCanvas={handleClearCanvasNow}
          onImportBackup={handleImportBackup}
        />

        {/* TOAST PANEL BAR ALERT */}
        <Toast message={toastMessage} status={toastStatus} />

        {/* SLIDE SIDEBAR OVERLAYS */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentTool={currentTool}
          setTool={setTool}
          gridVisible={gridVisible}
          toggleGrid={() => setGridVisible(!gridVisible)}
          undo={handleUndo}
          redo={handleRedo}
          onSave={handleSaveProjectManually}
          openModal={setActiveModal}
          onShare={handleNativeShare}
          onFullscreen={handleToggleFullscreen}
          onClear={() => {
            setSidebarOpen(false);
            setActiveModal('clear-modal');
          }}
          theme={theme}
          setTheme={handleSetTheme}
          appIconSvg={APP_ICON_SVG}
          pwaPrompt={pwaPrompt}
          onTriggerInstall={handleTriggerInstall}
          projects={projects}
          currentProject={currentProject}
          onSwitchProject={handleSwitchProject}
          onDeleteProject={handleDeleteProject}
        />

      </div>
    </>
  );
}
