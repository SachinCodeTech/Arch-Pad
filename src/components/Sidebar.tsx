import { useState } from 'react';
import { ToolType, ThemeType, Project } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTool: ToolType;
  setTool: (t: ToolType) => void;
  gridVisible: boolean;
  toggleGrid: () => void;
  undo: () => void;
  redo: () => void;
  onSave: () => void;
  openModal: (id: string) => void;
  onShare: () => void;
  onFullscreen: () => void;
  onClear: () => void;
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  appIconSvg: string;
  pwaPrompt: any;
  onTriggerInstall: () => void;
  projects: Record<string, Project>;
  currentProject: string;
  onSwitchProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  refImageSrc: string | null;
  refImageOpacity: number;
  paperOpacity: number;
  onSetPaperOpacity: (op: number) => void;
  onTriggerCapture: () => void;
  onTriggerImport: () => void;
  onSetRefImageOpacity: (op: number) => void;
  onClearRefImage: () => void;
  onUpdatePaperSettings: (
    size: 'A3' | 'A4' | 'A8' | 'custom',
    orient: 'horizontal' | 'portrait',
    customW?: number,
    customH?: number
  ) => void;
  onZoomToFit: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  currentTool,
  setTool,
  gridVisible,
  toggleGrid,
  undo,
  redo,
  onSave,
  openModal,
  onShare,
  onFullscreen,
  onClear,
  theme,
  setTheme,
  appIconSvg,
  pwaPrompt,
  onTriggerInstall,
  projects,
  currentProject,
  onSwitchProject,
  onDeleteProject,
  refImageSrc,
  refImageOpacity,
  paperOpacity,
  onSetPaperOpacity,
  onTriggerCapture,
  onTriggerImport,
  onSetRefImageOpacity,
  onClearRefImage,
  onUpdatePaperSettings,
  onZoomToFit
}: SidebarProps) {
  // Collapsible section state (Start with all sections collapsed by default except Reference which is useful layout help)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    cloud: true,
    projects: true,
    drawing: true,
    reference: false,
    paper: false,
    shapes: true,
    actions: true,
    app: true
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Check if iOS standalone installation can be promoted
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as any).standalone);
  const showIosInstallBtn = isIOS && !isStandalone;

  const showInstall = !!pwaPrompt || showIosInstallBtn;

  const activeProj = projects[currentProject];
  const paperSize = activeProj?.paperSize || 'A4';
  const orientation = activeProj?.orientation || 'horizontal';
  const customW = activeProj?.customWidth || 3000;
  const customH = activeProj?.customHeight || 2000;

  return (
    <>
      {/* Sidebar Overlay */}
      <div
        id="sidebar-overlay"
        className={`fixed inset-0 z-[300] bg-black/50 transition-all duration-250 ${
          isOpen ? 'opacity-100 visible open' : 'opacity-0 Gym-invisible hidden'
        }`}
        onClick={onClose}
        style={{ display: isOpen ? 'block' : 'none' }}
      />

      {/* Sidebar Container */}
      <div
        id="sidebar"
        className={`fixed top-0 left-0 bottom-0 w-[270px] z-[301] bg-[var(--bg2)] border-r border-[var(--border2)] flex flex-col overflow-y-auto transition-transform duration-280 cubic-bezier(0.4, 0, 0.2, 1) ${
          isOpen ? 'translate-x-0 open' : '-translate-x-full'
        }`}
      >
        <div className="sb-header flex items-center gap-2.5 p-[16px_14px_12px] border-b border-[var(--border)] shrink-0">
          <div className="sb-icon w-[36px] h-[36px] rounded-[10px] overflow-hidden shrink-0">
            <img src={appIconSvg} alt="Arch Pad Icon" className="w-full h-full block" />
          </div>
          <div className="sb-title font-sans text-[17px] font-[800] bg-gradient-to-r from-[#4f8ef7] to-[#7c5cf7] bg-clip-text text-transparent select-none">
            Arch Pad
          </div>
          <button
            className="sb-close ml-auto bg-none border-none text-[var(--text3)] text-[20px] cursor-pointer p-[2px_6px] rounded-[4px] leading-none hover:text-[var(--text)] hover:bg-[var(--bg3)]"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Offline Secure Storage section */}
        <div className="sb-section p-[10px_10px_4px]">
          <div 
            className={`sb-section-label font-mono text-[8px] text-[var(--text2)] tracking-[2px] uppercase p-[0_4px_6px] select-none cursor-pointer flex justify-between items-center ${collapsed.cloud ? 'collapsed' : ''}`}
            onClick={() => toggleSection('cloud')}
          >
            <span>Private Local Storage</span>
            <span className="text-[9px] font-sans text-[var(--text3)]">
              {collapsed.cloud ? '▶' : '▼'}
            </span>
          </div>
          <div 
            className={`sb-section-body overflow-hidden transition-all duration-200 ${collapsed.cloud ? 'collapsed' : ''}`}
            style={{ maxHeight: collapsed.cloud ? '0px' : '220px' }}
          >
            <div className="p-2.5 mb-2 bg-[#4f8ef7]/5 border border-[#4f8ef7]/20 rounded-lg text-xs leading-normal">
              <div className="text-[#4f8ef7] text-[10px] font-mono uppercase mb-1 font-semibold flex items-center gap-1.5">
                ● Offline Secure Storage
              </div>
              <p className="text-[var(--text3)] text-[10px] leading-relaxed font-sans">
                Your drawing and project files are stored securely inside your browser's private local IndexedDB cache. No data ever leaves your device.
              </p>
            </div>
          </div>
        </div>
        <div className="sb-divider h-[1px] bg-[var(--border)] m-[6px_10px]" />

        {/* PROJECTS SECTION */}
        <div className="sb-section p-[10px_10px_4px]">
          <div 
            className={`sb-section-label font-mono text-[8px] text-[var(--text2)] tracking-[2px] uppercase p-[0_4px_6px] select-none cursor-pointer flex justify-between items-center ${collapsed.projects ? 'collapsed' : ''}`}
            onClick={() => toggleSection('projects')}
          >
            <span>Projects</span>
            <span className="text-[9px] font-sans text-[var(--text3)]">
              {collapsed.projects ? '▶' : '▼'}
            </span>
          </div>
          <div 
            className={`sb-section-body overflow-hidden transition-all duration-200 ${collapsed.projects ? 'collapsed' : ''}`}
            style={{ maxHeight: collapsed.projects ? '0px' : '450px' }}
          >
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors mb-1"
              onClick={() => {
                onClose();
                openModal('new-project-modal');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0 text-[#4f8ef7]">＋</span>
              <span className="sb-lbl text-[12px] font-[700] flex-1">New Sketch</span>
            </div>
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors mb-2 border-b border-[var(--border)] pb-2"
              onClick={() => {
                onClose();
                openModal('dashboard-modal');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">⊞</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">All Projects Dashboard</span>
            </div>

            {/* Dynamic listing of all projects with white pen draw rename and cross mark delete */}
            <div className="max-h-[260px] overflow-y-auto pr-1 flex flex-col gap-1">
              {Object.keys(projects).length === 0 ? (
                <div className="text-[10px] text-[var(--text3)] p-2 text-center font-mono uppercase">No sketches built.</div>
              ) : (
                Object.keys(projects)
                  .map((k) => projects[k])
                  .sort((a, b) => b.modified - a.modified)
                  .map((p) => {
                    const isCurrent = p.name === currentProject;
                    return (
                      <div
                        key={p.id}
                        className={`sb-item flex items-center justify-between rounded-[8px] transition ${
                          isCurrent 
                            ? 'bg-[#4f8ef7]/12 border border-[#4f8ef7]/20 text-[#4f8ef7]' 
                            : 'border border-transparent text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
                        }`}
                      >
                        <div
                          className="flex-1 min-w-0 p-[8px_10px] cursor-pointer"
                          onClick={() => {
                            onSwitchProject(p.name);
                            onClose();
                          }}
                        >
                          <div className={`text-[12px] truncate ${isCurrent ? 'font-[700]' : 'font-[500]'}`}>
                            {p.name}
                          </div>
                        </div>

                        {/* White pen drawing icon and cross mark delete */}
                        <div 
                          className="flex items-center gap-2 pr-2 shrink-0 py-1" 
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                        >
                          <button
                            title="Rename Sketch"
                            className="bg-transparent border-0 cursor-pointer p-1.5 rounded hover:bg-[var(--bg4)] transition flex items-center justify-center shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSwitchProject(p.name);
                              openModal('rename-project-modal');
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onSwitchProject(p.name);
                              openModal('rename-project-modal');
                            }}
                          >
                            <svg 
                              className="w-[12px] h-[12px] text-white stroke-current fill-none" 
                              viewBox="0 0 24 24" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>

                          <button
                            title="Delete Sketch"
                            className={`border-0 cursor-pointer p-0.5 px-2 rounded transition shrink-0 select-none flex items-center justify-center font-bold text-xs ${
                              deleteConfirmId === p.id
                                ? 'bg-red-500 text-white font-black text-[10px]'
                                : 'bg-transparent text-[var(--text3)] hover:bg-red-500/10 hover:text-red-500 text-sm'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (deleteConfirmId === p.id) {
                                onDeleteProject(p.id);
                                setDeleteConfirmId(null);
                              } else {
                                setDeleteConfirmId(p.id);
                                setTimeout(() => {
                                  setDeleteConfirmId((curr) => curr === p.id ? null : curr);
                                }, 3500);
                              }
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (deleteConfirmId === p.id) {
                                onDeleteProject(p.id);
                                setDeleteConfirmId(null);
                              } else {
                                setDeleteConfirmId(p.id);
                                setTimeout(() => {
                                  setDeleteConfirmId((curr) => curr === p.id ? null : curr);
                                }, 3500);
                              }
                            }}
                          >
                            {deleteConfirmId === p.id ? 'DELETE?' : '✕'}
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
        <div className="sb-divider h-[1px] bg-[var(--border)] m-[6px_10px]" />

        {/* DRAWING SECTION */}
        <div className="sb-section p-[10px_10px_4px]">
          <div 
            className={`sb-section-label font-mono text-[8px] text-[var(--text2)] tracking-[2px] uppercase p-[0_4px_6px] select-none cursor-pointer flex justify-between items-center ${collapsed.drawing ? 'collapsed' : ''}`}
            onClick={() => toggleSection('drawing')}
          >
            <span>Drawing</span>
            <span className="text-[9px] font-sans text-[var(--text3)]">
              {collapsed.drawing ? '▶' : '▼'}
            </span>
          </div>
          <div 
            className={`sb-section-body overflow-hidden transition-all duration-200 ${collapsed.drawing ? 'collapsed' : ''}`}
            style={{ maxHeight: collapsed.drawing ? '0px' : '300px' }}
          >
            <div
              className={`sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none transition-colors ${
                currentTool === 'pen' ? 'bg-[#4f8ef7]/12 text-[#4f8ef7] text-[var(--accent)]' : 'text-[var(--text)]'
              }`}
              onClick={() => {
                onClose();
                setTool('pen');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">✏</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Pen</span>
              <span className="sb-sub text-[9px] text-[var(--text2)] font-mono">P</span>
            </div>
            <div
              className={`sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none transition-colors ${
                currentTool === 'eraser' ? 'bg-red-500/12 text-red-500' : 'text-[var(--text)]'
              }`}
              onClick={() => {
                onClose();
                setTool('eraser');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">⌫</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Eraser</span>
              <span className="sb-sub text-[9px] text-[var(--text2)] font-mono">E</span>
            </div>
            <div
              className={`sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none transition-colors ${
                currentTool === 'text' ? 'bg-[#4f8ef7]/12 text-[#4f8ef7]' : 'text-[var(--text)]'
              }`}
              onClick={() => {
                onClose();
                setTool('text');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">𝐀</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Text Annotation</span>
              <span className="sb-sub text-[9px] text-[var(--text2)] font-mono">T</span>
            </div>
            <div
              className={`sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none transition-colors ${
                gridVisible ? 'bg-[#4f8ef7]/12 text-[#4f8ef7]' : 'text-[var(--text)]'
              }`}
              onClick={() => {
                onClose();
                toggleGrid();
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">⊞</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Toggle Grid</span>
              <span className="sb-sub text-[9px] text-[var(--text2)] font-mono">G</span>
            </div>
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors"
              onClick={() => {
                onClose();
                openModal('scale-modal');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">⊟</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Drawing Scale</span>
            </div>
          </div>
        </div>
        <div className="sb-divider h-[1px] bg-[var(--border)] m-[6px_10px]" />

        {/* WORKSHEET PAPER FORMAT SECTION */}
        <div className="sb-section p-[10px_10px_4px]">
          <div 
            className={`sb-section-label font-mono text-[8px] text-[var(--text2)] tracking-[2px] uppercase p-[0_4px_6px] select-none cursor-pointer flex justify-between items-center ${collapsed.paper ? 'collapsed' : ''}`}
            onClick={() => toggleSection('paper')}
          >
            <span>Paper Format</span>
            <span className="text-[9px] font-sans text-[var(--text3)]">
              {collapsed.paper ? '▶' : '▼'}
            </span>
          </div>
          <div 
            className={`sb-section-body overflow-hidden transition-all duration-200 ${collapsed.paper ? 'collapsed' : ''}`}
            style={{ maxHeight: collapsed.paper ? '0px' : '400px' }}
          >
            <div className="p-2 border border-[var(--border2)] rounded-[8px] bg-[var(--bg3)]/30 flex flex-col gap-2.5 mx-1 mb-2 font-sans">
              
              {/* Paper Selection Tabs */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono font-bold text-[var(--text2)] uppercase">Standard Size</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['A3', 'A4', 'A8', 'custom'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => onUpdatePaperSettings(sz, orientation, customW, customH)}
                      className={`font-semibold p-1.5 rounded-[4px] border cursor-pointer text-center text-[10px] transition-all duration-150 ${
                        paperSize === sz
                          ? 'bg-[#4f8ef7] text-white border-[#4f8ef7]'
                          : 'bg-transparent text-[var(--text2)] border-[var(--border)] hover:bg-[var(--bg4)]'
                      }`}
                    >
                      {sz.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation Toggle */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono font-bold text-[var(--text2)] uppercase">Orientation</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onUpdatePaperSettings(paperSize, 'horizontal', customW, customH)}
                    className={`flex items-center justify-center gap-1.5 font-semibold p-1.5 rounded-[4px] border cursor-pointer text-center text-[10px] transition-all duration-150 ${
                      orientation === 'horizontal'
                        ? 'bg-[#4f8ef7]/15 text-[#4f8ef7] border-[#4f8ef7]/50 font-bold'
                        : 'bg-transparent text-[var(--text2)] border-[var(--border)] hover:bg-[var(--bg4)]'
                    }`}
                  >
                    <span>▬</span> Landscape
                  </button>
                  <button
                    onClick={() => onUpdatePaperSettings(paperSize, 'portrait', customW, customH)}
                    className={`flex items-center justify-center gap-1.5 font-semibold p-1.5 rounded-[4px] border cursor-pointer text-center text-[10px] transition-all duration-150 ${
                      orientation === 'portrait'
                        ? 'bg-[#4f8ef7]/15 text-[#4f8ef7] border-[#4f8ef7]/50 font-bold'
                        : 'bg-transparent text-[var(--text2)] border-[var(--border)] hover:bg-[var(--bg4)]'
                    }`}
                  >
                    <span>▮</span> Portrait
                  </button>
                </div>
              </div>

              {/* Custom Sizes Box */}
              {paperSize === 'custom' && (
                <div className="p-2 bg-[var(--bg4)]/50 rounded border border-[var(--border)] flex flex-col gap-1.5 mt-0.5 animation-fade-in">
                  <span className="text-[9px] font-mono text-[var(--text2)] uppercase font-semibold">Custom Dimension (px)</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-col gap-0.5">
                      <span className="text-[8px] text-[var(--text3)] uppercase">Width</span>
                      <input
                        type="number"
                        min="200"
                        max="8000"
                        value={customW}
                        onChange={(e) => onUpdatePaperSettings('custom', orientation, parseInt(e.target.value) || 3000, customH)}
                        className="w-full bg-[var(--bg2)] border border-[var(--border2)] rounded p-1 text-[10px] font-mono text-[var(--text)] outline-none focus:border-[#4f8ef7]"
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text3)] align-middle self-end pb-1.5 font-bold">×</span>
                    <div className="flex-1 flex flex-col gap-0.5">
                      <span className="text-[8px] text-[var(--text3)] uppercase">Height</span>
                      <input
                        type="number"
                        min="200"
                        max="8000"
                        value={customH}
                        onChange={(e) => onUpdatePaperSettings('custom', orientation, customW, parseInt(e.target.value) || 2000)}
                        className="w-full bg-[var(--bg2)] border border-[var(--border2)] rounded p-1 text-[10px] font-mono text-[var(--text)] outline-none focus:border-[#4f8ef7]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Stats badge */}
              <div className="text-[8px] leading-[1.3] text-[var(--text3)] font-mono uppercase bg-[var(--bg4)]/80 p-2 rounded border border-[var(--border)] flex justify-between select-none">
                <span>Workspace Size:</span>
                <span className="text-[var(--text2)] font-bold">
                  {paperSize === 'custom' ? `${customW} × ${customH} px` : `${paperSize === 'A3' ? (orientation === 'horizontal' ? '4200 × 2970' : '2970 × 4200') : paperSize === 'A4' ? (orientation === 'horizontal' ? '2970 × 2100' : '2100 × 2970') : (orientation === 'horizontal' ? '740 × 520' : '520 × 740')} px`}
                </span>
              </div>

              {/* Reset Zoom & Fit Page to screen */}
              <button
                type="button"
                onClick={onZoomToFit}
                className="w-full mt-2.5 py-1.5 bg-gradient-to-r from-[#4f8ef7]/10 to-[#7c5cf7]/10 border border-[#4f8ef7]/30 hover:border-[#4f8ef7]/60 text-[10px] text-[#4f8ef7] font-mono rounded flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[var(--bg3)] active:scale-95 transition tracking-[0.5px] uppercase font-bold"
              >
                ✥ Fit Page to Screen
              </button>
            </div>
          </div>
        </div>

        <div className="sb-divider h-[1px] bg-[var(--border)] m-[6px_10px]" />

        {/* TRACING OVERLAY LAYER SECTION */}
        <div className="sb-section p-[10px_10px_4px]">
          <div 
            className={`sb-section-label font-mono text-[8px] text-[var(--text2)] tracking-[2px] uppercase p-[0_4px_6px] select-none cursor-pointer flex justify-between items-center ${collapsed.reference ? 'collapsed' : ''}`}
            onClick={() => toggleSection('reference')}
          >
            <span>Tracing Overlay</span>
            <span className="text-[9px] font-sans text-[var(--text3)]">
              {collapsed.reference ? '▶' : '▼'}
            </span>
          </div>
          <div 
            className={`sb-section-body overflow-hidden transition-all duration-200 ${collapsed.reference ? 'collapsed' : ''}`}
            style={{ maxHeight: collapsed.reference ? '0px' : '400px' }}
          >
            {!refImageSrc ? (
              <div className="p-2 border border-dashed border-[var(--border)] rounded-[8px] flex flex-col items-center justify-center gap-2 text-center bg-[var(--bg3)]/30 mx-1 mb-2">
                <span className="text-[14px]">🖼️</span>
                <p className="text-[10px] text-[var(--text2)] leading-[1.3] m-0">
                  Import a floor plan, site drawing, or blueprint as a trace reference.
                </p>
                <div className="flex w-full gap-1.5 mt-1">
                  <button
                    onClick={() => {
                      onTriggerCapture();
                      onClose();
                    }}
                    className="flex-1 bg-[#4f8ef7] hover:bg-[#4f8ef7]/90 text-white font-sans text-[10px] font-bold p-1.5 rounded-[6px] border-none cursor-pointer transition flex items-center justify-center gap-1"
                  >
                    <span>📷</span> Photo
                  </button>
                  <button
                    onClick={() => {
                      onTriggerImport();
                      onClose();
                    }}
                    className="flex-1 bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] hover:bg-[var(--bg4)] font-sans text-[10px] font-bold p-1.5 rounded-[6px] cursor-pointer transition flex items-center justify-center gap-1"
                  >
                    <span>🖼️</span> Import
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2 border border-[var(--border2)] rounded-[8px] bg-[var(--bg3)]/40 flex flex-col gap-2 mx-1 mb-2">
                <div className="flex items-center justify-between gap-1 border-b border-[var(--border)] pb-2 mb-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[11px]">✨</span>
                    <span className="text-[10px] font-bold text-[var(--text)] truncate">Reference Image Active</span>
                  </div>
                  <button
                    onClick={onClearRefImage}
                    title="Remove Reference Image"
                    className="bg-transparent border-none text-[var(--red)] font-semibold text-[10px] cursor-pointer p-0.5 hover:bg-red-500/10 rounded shrink-0"
                  >
                    ✕ Remove
                  </button>
                </div>
                
                {/* Opacity Control Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-[var(--text2)]">Reference Opacity</span>
                    <span className="text-[9px] font-mono text-[#4f8ef7] font-bold">{Math.round(refImageOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={refImageOpacity}
                    onChange={(e) => onSetRefImageOpacity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[#4f8ef7]"
                  />
                </div>

                {/* Drafting Paper Opacity Control Slider */}
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-[var(--text2)]">Front Paper Opacity</span>
                    <span className="text-[9px] font-mono text-[#10b981] font-bold">{Math.round(paperOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={paperOpacity}
                    onChange={(e) => onSetPaperOpacity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                  />
                </div>
                
                {/* Overlay helper guidelines for tracer */}
                <div className="text-[8px] leading-[1.3] text-[var(--text3)] font-mono uppercase bg-[var(--bg4)]/80 p-1.5 rounded border border-[var(--border)] mt-1 select-none">
                  Tracer lock: Hold [SHIFT] to lock snap angles. Draw blueprints on top.
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="sb-divider h-[1px] bg-[var(--border)] m-[6px_10px]" />

        {/* SHAPES SECTION */}
        <div className="sb-section p-[10px_10px_4px]">
          <div 
            className={`sb-section-label font-mono text-[8px] text-[var(--text2)] tracking-[2px] uppercase p-[0_4px_6px] select-none cursor-pointer flex justify-between items-center ${collapsed.shapes ? 'collapsed' : ''}`}
            onClick={() => toggleSection('shapes')}
          >
            <span>Shapes</span>
            <span className="text-[9px] font-sans text-[var(--text3)]">
              {collapsed.shapes ? '▶' : '▼'}
            </span>
          </div>
          <div 
            className={`sb-section-body overflow-hidden transition-all duration-200 ${collapsed.shapes ? 'collapsed' : ''}`}
            style={{ maxHeight: collapsed.shapes ? '0px' : '220px' }}
          >
            <div
              className={`sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none transition-colors ${
                currentTool === 'line' ? 'bg-[#4f8ef7]/12 text-[#4f8ef7]' : 'text-[var(--text)]'
              }`}
              onClick={() => {
                onClose();
                setTool('line');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">╱</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Line</span>
            </div>
            <div
              className={`sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none transition-colors ${
                currentTool === 'rect' ? 'bg-[#4f8ef7]/12 text-[#4f8ef7]' : 'text-[var(--text)]'
              }`}
              onClick={() => {
                onClose();
                setTool('rect');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">▭</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Rectangle</span>
            </div>
            <div
              className={`sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none transition-colors ${
                currentTool === 'circle' ? 'bg-[#4f8ef7]/12 text-[#4f8ef7]' : 'text-[var(--text)]'
              }`}
              onClick={() => {
                onClose();
                setTool('circle');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">○</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Circle / Ellipse</span>
            </div>
            <div
              className={`sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none transition-colors ${
                currentTool === 'arrow' ? 'bg-[#4f8ef7]/12 text-[#4f8ef7]' : 'text-[var(--text)]'
              }`}
              onClick={() => {
                onClose();
                setTool('arrow');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">➜</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Arrow</span>
            </div>
          </div>
        </div>
        <div className="sb-divider h-[1px] bg-[var(--border)] m-[6px_10px]" />

        {/* ACTIONS SECTION */}
        <div className="sb-section p-[10px_10px_4px]">
          <div 
            className={`sb-section-label font-mono text-[8px] text-[var(--text2)] tracking-[2px] uppercase p-[0_4px_6px] select-none cursor-pointer flex justify-between items-center ${collapsed.actions ? 'collapsed' : ''}`}
            onClick={() => toggleSection('actions')}
          >
            <span>Actions</span>
            <span className="text-[9px] font-sans text-[var(--text3)]">
              {collapsed.actions ? '▶' : '▼'}
            </span>
          </div>
          <div 
            className={`sb-section-body overflow-hidden transition-all duration-200 ${collapsed.actions ? 'collapsed' : ''}`}
            style={{ maxHeight: collapsed.actions ? '0px' : '360px' }}
          >
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors"
              onClick={() => {
                onClose();
                undo();
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">↩</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Undo</span>
              <span className="sb-sub text-[9px] text-[var(--text2)] font-mono">Ctrl+Z</span>
            </div>
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors"
              onClick={() => {
                onClose();
                redo();
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">↪</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Redo</span>
              <span className="sb-sub text-[9px] text-[var(--text2)] font-mono">Ctrl+Y</span>
            </div>
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors"
              onClick={() => {
                onClose();
                onSave();
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">💾</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Save Project</span>
              <span className="sb-sub text-[9px] text-[var(--text2)] font-mono">Ctrl+S</span>
            </div>
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors"
              onClick={() => {
                onClose();
                openModal('export-modal');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">⤓</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Export Sketch</span>
            </div>
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors"
              onClick={() => {
                onClose();
                onShare();
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">⤴</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Share</span>
            </div>
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors"
              onClick={() => {
                onClose();
                onFullscreen();
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">⛶</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Fullscreen</span>
            </div>
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-red-500/5 select-none text-[var(--red)] transition-colors"
              onClick={() => {
                onClose();
                onClear();
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">✓</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Finish Sketch</span>
            </div>
          </div>
        </div>
        <div className="sb-divider h-[1px] bg-[var(--border)] m-[6px_10px]" />

        {/* APP CONTEXT */}
        <div className="sb-section p-[10px_10px_4px]">
          <div 
            className={`sb-section-label font-mono text-[8px] text-[var(--text2)] tracking-[2px] uppercase p-[0_4px_6px] select-none cursor-pointer flex justify-between items-center ${collapsed.app ? 'collapsed' : ''}`}
            onClick={() => toggleSection('app')}
          >
            <span>App</span>
            <span className="text-[9px] font-sans text-[var(--text3)]">
              {collapsed.app ? '▶' : '▼'}
            </span>
          </div>
          <div 
            className={`sb-section-body overflow-hidden transition-all duration-200 ${collapsed.app ? 'collapsed' : ''}`}
            style={{ maxHeight: collapsed.app ? '0px' : '300px' }}
          >
            <div className="sb-theme-row flex gap-1 p-[4px_4px]">
              <button
                className={`sb-theme-btn flex-1 bg-[var(--bg3)] border border-[var(--border)] text-[var(--text3)] font-sans text-[10px] font-[600] p-1.5 rounded-[6px] cursor-pointer text-center transition-all ${
                  theme === 'light' ? 'bg-[var(--bg4)] border-[var(--border2)] text-[var(--text)] on' : ''
                }`}
                onClick={() => setTheme('light')}
              >
                ☀ Light
              </button>
              <button
                className={`sb-theme-btn flex-1 bg-[var(--bg3)] border border-[var(--border)] text-[var(--text3)] font-sans text-[10px] font-[600] p-1.5 rounded-[6px] cursor-pointer text-center transition-all ${
                  theme === 'dark' ? 'bg-[var(--bg4)] border-[var(--border2)] text-[var(--text)] on' : ''
                }`}
                onClick={() => setTheme('dark')}
              >
                ◗ Dark
              </button>
            </div>

            {/* PWA Home screen Promotion Trigger Button */}
            {showInstall && (
              <div
                className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer border border-[#4f8ef7]/30 bg-[#4f8ef7]/8 select-none text-[var(--text)] transition-all hover:bg-[#4f8ef7]/15 mt-1"
                onClick={onTriggerInstall}
              >
                <span className="sb-ico text-[15px] w-[20px] text-center shrink-0 text-[var(--accent)] font-[700]">⊕</span>
                <div className="flex flex-col flex-1 leading-normal">
                  <span className="sb-lbl text-[11px] font-[700] text-[var(--accent)]">Install App</span>
                  <span className="text-[8px] text-[var(--text3)] font-mono">Add to Home Screen</span>
                </div>
              </div>
            )}

            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors"
              onClick={() => {
                onClose();
                openModal('about-modal');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">ℹ</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">About</span>
            </div>
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors"
              onClick={() => {
                onClose();
                openModal('info-modal');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">⚙</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">App Info</span>
            </div>
            <div
              className="sb-item flex items-center gap-[10px] p-[9px_10px] rounded-[8px] cursor-pointer hover:bg-[var(--bg3)] select-none text-[var(--text)] transition-colors"
              onClick={() => {
                onClose();
                openModal('privacy-modal');
              }}
            >
              <span className="sb-ico text-[15px] w-[20px] text-center shrink-0">🔒</span>
              <span className="sb-lbl text-[12px] font-[600] flex-1">Privacy Policy</span>
            </div>
          </div>
        </div>

        <div className="sb-footer p-[12px_14px] border-t border-[var(--border)] shrink-0 mt-auto">
          <div className="sb-footer-txt font-mono text-[8px] text-[var(--text3)] tracking-[1px] text-center uppercase">
            ARCH PAD v2.0 · CODETECH © 2026
          </div>
        </div>
      </div>
    </>
  );
}

