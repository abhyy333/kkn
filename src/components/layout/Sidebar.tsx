import React from 'react';
import {
  WorkspaceModuleId,
  ViewMode,
} from '../../types';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Users,
  Compass,
  ClipboardList,
  Sparkles,
  Wallet,
  Package,
  Camera,
  FileText,
  Scale,
  Archive,
  Settings,
  Globe,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface SidebarProps {
  currentModule: WorkspaceModuleId;
  onSelectModule: (module: WorkspaceModuleId) => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  counts: {
    tasksUrgent: number;
    upcomingMeetings: number;
    activePrograms: number;
  };
}

interface NavItemDef {
  id: WorkspaceModuleId;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

interface NavGroup {
  groupName: string;
  items: NavItemDef[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  viewMode,
  onChangeViewMode,
  isOpenMobile,
  onCloseMobile,
  counts,
}) => {
  const navGroups: NavGroup[] = [
    {
      groupName: 'UTAMA & AGENDA',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          icon: <LayoutDashboard className="w-4 h-4 text-[#4A6B53]" />,
        },
        {
          id: 'meetings',
          label: 'Meetings & Agenda',
          icon: <CalendarDays className="w-4 h-4 text-stone-600" />,
          badge: counts.upcomingMeetings > 0 ? counts.upcomingMeetings : undefined,
          badgeColor: 'text-[#4A6B53] bg-[#EBF1ED]',
        },
        {
          id: 'tasks',
          label: 'Tasks',
          icon: <CheckSquare className="w-4 h-4 text-stone-600" />,
          badge: counts.tasksUrgent > 0 ? `${counts.tasksUrgent} urgent` : undefined,
          badgeColor: 'text-amber-800 bg-amber-50',
        },
        {
          id: 'members',
          label: 'Members',
          icon: <Users className="w-4 h-4 text-stone-600" />,
        },
      ],
    },
    {
      groupName: 'RISET & LAPANGAN',
      items: [
        {
          id: 'village-research',
          label: 'Village Research',
          icon: <Compass className="w-4 h-4 text-stone-600" />,
        },
        {
          id: 'surveys',
          label: 'Surveys',
          icon: <ClipboardList className="w-4 h-4 text-stone-600" />,
        },
        {
          id: 'programs',
          label: 'Work Programs',
          icon: <Sparkles className="w-4 h-4 text-[#4A6B53]" />,
          badge: counts.activePrograms,
          badgeColor: 'text-stone-600 bg-stone-100',
        },
      ],
    },
    {
      groupName: 'OPERASIONAL',
      items: [
        {
          id: 'finance',
          label: 'Finance',
          icon: <Wallet className="w-4 h-4 text-stone-600" />,
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: <Package className="w-4 h-4 text-stone-600" />,
        },
        {
          id: 'documentation',
          label: 'Documentation',
          icon: <Camera className="w-4 h-4 text-stone-600" />,
        },
      ],
    },
    {
      groupName: 'TATA KELOLA & ARSIP',
      items: [
        {
          id: 'reports',
          label: 'Reports',
          icon: <FileText className="w-4 h-4 text-stone-600" />,
        },
        {
          id: 'decisions',
          label: 'Decision Log',
          icon: <Scale className="w-4 h-4 text-stone-600" />,
        },
        {
          id: 'archive',
          label: 'Archive',
          icon: <Archive className="w-4 h-4 text-stone-600" />,
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Settings className="w-4 h-4 text-stone-600" />,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-stone-900/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#F7F6F2] border-r border-[#E8E6DF] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Workspace Identity Header */}
        <div className="p-4 border-b border-[#E8E6DF]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4A6B53] text-white flex items-center justify-center font-serif font-medium text-base shadow-xs">
              K
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm tracking-tight text-stone-900 truncate">
                KKN Pringgasela Selatan
              </span>
              <span className="text-[11px] text-stone-500 truncate">
                Pringgasela · Lombok Timur
              </span>
            </div>
          </div>
          <span className="text-[10px] font-medium text-[#4A6B53] bg-[#EBF1ED] px-1.5 py-0.5 rounded border border-[#CDDDD1]">
            v1.0
          </span>
        </div>

        {/* Public Portal Switcher Banner */}
        <div className="p-3 border-b border-[#E8E6DF]/70">
          <button
            onClick={() => {
              onChangeViewMode('public');
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between p-2 rounded-md bg-white border border-[#E0DED7] text-left hover:bg-[#F2F0EA] transition-colors group shadow-2xs"
            aria-label="Buka Portal Publik Warga"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="w-4 h-4 text-[#4A6B53] shrink-0 group-hover:scale-105 transition-transform" />
              <div className="truncate">
                <div className="text-xs font-medium text-stone-800">Public Portal</div>
                <div className="text-[10px] text-stone-500">Portal Warga Desa (/public)</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors shrink-0" />
          </button>
        </div>

        {/* Navigation Groups List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.groupName} className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
                {group.groupName}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = viewMode === 'workspace' && currentModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChangeViewMode('workspace');
                        onSelectModule(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-[#EBF1ED] text-[#2A4432] font-semibold shadow-2xs'
                          : 'text-stone-700 hover:bg-[#EFECE5] hover:text-stone-900'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            item.badgeColor || 'text-stone-500 bg-stone-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info: Period & Quick Help */}
        <div className="p-3 border-t border-[#E8E6DF] bg-[#F7F6F2] text-[11px] text-stone-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <BookOpen className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">Juli - Ags 2026</span>
          </div>
          <span className="text-stone-400">Hari ke-18</span>
        </div>
      </aside>
    </>
  );
};
