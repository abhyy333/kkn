import React from 'react';
import { WorkspaceModuleId, ViewMode } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  Globe,
  LayoutGrid,
  Calendar,
  LogOut,
  UserPlus,
  LogIn,
  Eye,
} from 'lucide-react';

interface TopbarProps {
  currentModule: WorkspaceModuleId;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onOpenMobileMenu: () => void;
  onOpenInviteManager?: () => void;
  onOpenAuthModal?: () => void;
}

const MODULE_TITLES: Record<WorkspaceModuleId, { title: string; icon: string }> = {
  overview: { title: 'Overview', icon: '🌱' },
  meetings: { title: 'Meetings & Agenda', icon: '🗓️' },
  tasks: { title: 'Tasks', icon: '✅' },
  members: { title: 'Members', icon: '👥' },
  'village-research': { title: 'Village Research', icon: '🧭' },
  surveys: { title: 'Surveys', icon: '📊' },
  programs: { title: 'Work Programs', icon: '✨' },
  finance: { title: 'Finance', icon: '💰' },
  inventory: { title: 'Inventory', icon: '📦' },
  documentation: { title: 'Documentation', icon: '📸' },
  reports: { title: 'Reports', icon: '📝' },
  decisions: { title: 'Decision Log', icon: '⚖️' },
  archive: { title: 'Archive', icon: '🗄️' },
  settings: { title: 'Settings', icon: '⚙️' },
};

export const Topbar: React.FC<TopbarProps> = ({
  currentModule,
  viewMode,
  onChangeViewMode,
  onOpenMobileMenu,
  onOpenInviteManager,
  onOpenAuthModal,
}) => {
  const { user, profile, isAdmin, isDpl, signOut } = useAuth();
  const currentInfo = MODULE_TITLES[currentModule] || { title: 'Workspace', icon: '📁' };

  return (
    <header className="sticky top-0 z-30 h-13 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E6DF] px-4 lg:px-8 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 rounded-md hover:bg-stone-200/60 text-stone-600 lg:hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Notion-style Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="font-medium text-stone-700">KKN Pringgasela Selatan</span>
          <span className="text-stone-300">/</span>
          {viewMode === 'workspace' ? (
            <span className="flex items-center gap-1.5 font-medium text-stone-900">
              <span className="text-sm">{currentInfo.icon}</span>
              <span>{currentInfo.title}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium text-[#32523C]">
              <Globe className="w-3.5 h-3.5" />
              <span>Portal Publik Warga</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Timeline Indicator */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-[#F2F0E8] border border-[#E3E0D6] text-[11px] text-stone-600">
          <Calendar className="w-3.5 h-3.5 text-stone-400" />
          <span>Hari 18 dari 45 Hari KKN</span>
          <div className="w-10 h-1.5 bg-[#D8D4C8] rounded-full overflow-hidden">
            <div className="h-full bg-[#4A6B53] rounded-full" style={{ width: '40%' }} />
          </div>
        </div>

        {/* DPL Mode Pill Indicator */}
        {isDpl && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium">
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Mode Peninjau DPL (Read-Only)</span>
          </div>
        )}

        {/* Admin Invite Button */}
        {isAdmin && onOpenInviteManager && (
          <button
            onClick={onOpenInviteManager}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#4A6B53] bg-[#EBF1ED] border border-[#CDDDD1] hover:bg-[#DEE9E1] transition-colors"
            title="Kelola & Terbitkan Undangan Anggota"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Undang Anggota</span>
          </button>
        )}

        {/* View Mode Switcher Button */}
        {viewMode === 'workspace' ? (
          <button
            onClick={() => onChangeViewMode('public')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white text-stone-700 border border-[#D5D2C8] hover:bg-[#F5F3EC] hover:text-stone-900 transition-colors shadow-2xs"
            title="Lihat Portal Publik (/public)"
          >
            <Globe className="w-3.5 h-3.5 text-[#4A6B53]" />
            <span className="hidden md:inline">Lihat</span>
            <span>Public Portal</span>
          </button>
        ) : (
          <button
            onClick={() => onChangeViewMode('workspace')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#4A6B53] text-white hover:bg-[#3E5A47] transition-colors shadow-2xs"
            title="Kembali ke Workspace Internal"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kembali ke Workspace</span>
          </button>
        )}

        {/* User Account / Auth Status */}
        {user ? (
          <div className="flex items-center gap-2 pl-1 border-l border-stone-200">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-stone-800 leading-tight truncate max-w-[120px]">
                {profile?.displayName || user.displayName || user.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-[#4A6B53] capitalize font-medium">
                {profile?.role === 'admin'
                  ? 'Admin / BPH'
                  : profile?.role === 'dpl'
                  ? 'DPL (Read-Only)'
                  : profile?.role || 'Member'}
              </span>
            </div>

            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
              title="Keluar (Sign Out)"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Workspace</span>
            </button>
          )
        )}
      </div>
    </header>
  );
};

