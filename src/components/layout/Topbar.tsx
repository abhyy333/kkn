import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronRight, Bell, Plus } from 'lucide-react';
import { WorkspaceModuleId, ViewMode } from '../../types';

export interface NotificationItem {
  id: string;
  title: string;
  subtitle: string;
  targetModule?: WorkspaceModuleId;
}

interface TopbarProps {
  currentModule: WorkspaceModuleId;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onOpenMobileMenu: () => void;
  onOpenInviteManager?: () => void;
  onOpenAuthModal?: () => void;
  onOpenProfile?: () => void;
  onSelectModule?: (module: WorkspaceModuleId) => void;
  contextualAction?: {
    label: string;
    onClick: () => void;
  };
  notifications?: NotificationItem[];
}

const pageLabels: Record<WorkspaceModuleId, { section: string; title: string }> = {
  overview: { section: 'Workspace', title: 'Overview' },
  members: { section: 'Workspace', title: 'Members' },
  meetings: { section: 'Workspace', title: 'Meetings & Agenda' },
  tasks: { section: 'Workspace', title: 'Tasks' },
  'village-research': { section: 'Workspace', title: 'Village Research' },
  surveys: { section: 'Workspace', title: 'Surveys' },
  programs: { section: 'Workspace', title: 'Work Programs' },
  finance: { section: 'Operations', title: 'Finance' },
  inventory: { section: 'Operations', title: 'Inventory' },
  documentation: { section: 'Operations', title: 'Documentation' },
  reports: { section: 'Management', title: 'Reports' },
  decisions: { section: 'Management', title: 'Decision Log' },
  archive: { section: 'Management', title: 'Archive' },
  settings: { section: 'Management', title: 'Settings' },
  profile: { section: 'Account', title: 'My Profile' },
};

export const Topbar: React.FC<TopbarProps> = ({
  currentModule,
  viewMode,
  onChangeViewMode,
  onOpenMobileMenu,
  onSelectModule,
  contextualAction,
  notifications = [],
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen]);

  const currentMeta = pageLabels[currentModule] || {
    section: 'Workspace',
    title: 'Overview',
  };

  const breadcrumbRoot = viewMode === 'admin' ? 'Management' : currentMeta.section;
  const breadcrumbTitle = viewMode === 'admin' ? 'Admin Console' : currentMeta.title;

  return (
    <header className="h-12 bg-[#FAF9F5]/95 backdrop-blur-xs border-b border-[#E8E6DF] sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Drawer Trigger + Clean Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 -ml-1 text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 rounded-md transition-colors"
          aria-label="Buka navigasi"
        >
          <Menu className="w-4 h-4" />
        </button>

        <nav className="flex items-center gap-1.5 text-xs min-w-0" aria-label="Breadcrumb">
          <span className="text-stone-400 font-normal hidden sm:inline truncate">
            {breadcrumbRoot}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-300 hidden sm:inline shrink-0" />
          <span className="font-medium text-stone-900 truncate">{breadcrumbTitle}</span>
        </nav>
      </div>

      {/* Right: Minimal Contextual Action + Compact Notification Control */}
      <div className="flex items-center gap-2 shrink-0">
        {contextualAction && (
          <button
            onClick={contextualAction.onClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#4A6B53] hover:bg-[#3d5944] text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{contextualAction.label}</span>
          </button>
        )}

        {notifications.length > 0 && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative p-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 transition-colors"
              title="Pemberitahuan"
              aria-label="Pemberitahuan"
            >
              <Bell className="w-4 h-4" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B53] absolute top-1.5 right-1.5" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-lg border border-[#E8E6DF] shadow-lg py-1.5 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-stone-100 flex items-center justify-between">
                  <span className="font-medium text-stone-900">Tugas & Agenda Mendesak</span>
                  <span className="text-[10px] text-stone-400">{notifications.length}</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-stone-100">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setNotifOpen(false);
                        if (item.targetModule && onSelectModule) {
                          if (viewMode === 'admin') {
                            onChangeViewMode('workspace');
                          }
                          onSelectModule(item.targetModule);
                        }
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-stone-50 transition-colors"
                    >
                      <div className="font-medium text-stone-800 truncate">{item.title}</div>
                      <div className="text-[11px] text-stone-500 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
