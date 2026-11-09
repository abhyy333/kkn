import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  GitPullRequest,
  CheckSquare,
  MapPin,
  ClipboardList,
  Briefcase,
  Camera,
  FileText,
  FolderArchive,
  Settings,
  Globe,
  X,
  DollarSign,
  Package,
  Shield,
  LogOut,
  User,
  ChevronUp,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeftRight,
} from 'lucide-react';
import { WorkspaceModuleId, ViewMode } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';

interface SidebarProps {
  currentModule: WorkspaceModuleId;
  onSelectModule: (module: WorkspaceModuleId) => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  counts?: {
    tasksUrgent: number;
    upcomingMeetings: number;
    activePrograms: number;
  };
}

interface NavGroup {
  title: string;
  items: {
    id: WorkspaceModuleId;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'members', label: 'Members', icon: Users },
      { id: 'meetings', label: 'Meetings & Agenda', icon: Calendar },
      { id: 'tasks', label: 'Tasks', icon: CheckSquare },
      { id: 'village-research', label: 'Village Research', icon: MapPin },
      { id: 'surveys', label: 'Surveys', icon: ClipboardList },
      { id: 'programs', label: 'Work Programs', icon: Briefcase },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'finance', label: 'Finance', icon: DollarSign },
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'documentation', label: 'Documentation', icon: Camera },
    ],
  },
  {
    title: 'Management',
    items: [
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'decisions', label: 'Decision Log', icon: GitPullRequest },
      { id: 'archive', label: 'Archive', icon: FolderArchive },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  viewMode,
  onChangeViewMode,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, profile, isSuperAdmin, isDpl, setActiveMode, signOut, logAdminActivity } =
    useAuth();
  const { confirm } = useConfirm();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const displayName =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Anggota KKN';
  const displaySubtitle = isSuperAdmin
    ? viewMode === 'admin'
      ? 'Admin Console'
      : profile?.position || 'Divisi Acara 1'
    : isDpl
    ? 'Dosen Pembimbing'
    : profile?.position || 'Anggota Tim';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const handleModeSwitch = (targetMode: 'workspace' | 'admin') => {
    if (targetMode === 'admin' && !isSuperAdmin) return;
    setActiveMode(targetMode);
    onChangeViewMode(targetMode);
    logAdminActivity(
      'SWITCH_MODE',
      profile?.email || user?.email || 'user',
      `Beralih ke mode ${targetMode === 'admin' ? 'Admin Console' : 'Member Workspace'}`
    );
    setProfileMenuOpen(false);
    onCloseMobile();
  };

  const handleLogoutClick = async () => {
    setProfileMenuOpen(false);
    const ok = await confirm({
      title: 'Keluar dari Sesi KKN SPACE?',
      description:
        'Anda akan keluar dari ruang kerja internal KKN SPACE dan diarahkan kembali ke halaman utama.',
      confirmLabel: 'Keluar',
      cancelLabel: 'Batal',
      level: 'warning',
    });
    if (ok) {
      onCloseMobile();
      await signOut();
      onChangeViewMode('public');
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/25 z-40 lg:hidden backdrop-blur-[1px]"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-[#F7F6F2] border-r border-[#E8E6DF] flex flex-col transition-all duration-200 ease-in-out ${
          isCollapsed ? 'lg:w-16 w-60' : 'w-60'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Workspace Identity Header */}
        <div
          className={`h-12 px-3 border-b border-[#E8E6DF] flex items-center shrink-0 ${
            isCollapsed ? 'lg:justify-center justify-between' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-[#4A6B53] flex items-center justify-center text-white font-semibold text-xs shrink-0">
              K
            </div>
            <div className={`min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <div className="font-semibold text-[13px] text-stone-900 tracking-tight truncate leading-none">
                KKN SPACE
              </div>
              <div className="text-[10px] text-stone-500 truncate mt-0.5 leading-none">
                Pringgasela Selatan
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
                className={`hidden lg:flex p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded transition-colors ${
                  isCollapsed ? 'hidden' : ''
                }`}
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-stone-500 hover:text-stone-800 rounded"
              aria-label="Tutup navigasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <div
                className={`px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-stone-400 select-none ${
                  isCollapsed ? 'lg:hidden' : ''
                }`}
              >
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = viewMode === 'workspace' && currentModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (viewMode === 'admin') {
                          setActiveMode('workspace');
                          onChangeViewMode('workspace');
                        }
                        onSelectModule(item.id);
                        onCloseMobile();
                      }}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isCollapsed ? 'lg:justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-[#E8ECE9] text-[#284230] font-medium'
                          : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900 font-normal'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-[#4A6B53]' : 'text-stone-400'
                        }`}
                      />
                      <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Other Access Section */}
          <div className="space-y-0.5 pt-1 border-t border-[#E8E6DF]/80">
            <div
              className={`px-2.5 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-stone-400 select-none ${
                isCollapsed ? 'lg:hidden' : ''
              }`}
            >
              Other Access
            </div>

            <button
              onClick={() => {
                onChangeViewMode('public');
                onCloseMobile();
              }}
              title={isCollapsed ? 'Public Portal' : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-stone-600 hover:bg-stone-200/50 hover:text-stone-900 transition-colors ${
                isCollapsed ? 'lg:justify-center' : ''
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>Public Portal</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() =>
                  handleModeSwitch(viewMode === 'admin' ? 'workspace' : 'admin')
                }
                title={
                  isCollapsed
                    ? viewMode === 'admin'
                      ? 'Switch to Member Workspace'
                      : 'Admin Console'
                    : undefined
                }
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  isCollapsed ? 'lg:justify-center' : ''
                } ${
                  viewMode === 'admin'
                    ? 'bg-[#E8ECE9] text-[#284230] font-medium'
                    : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                }`}
              >
                {viewMode === 'admin' ? (
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#4A6B53] shrink-0" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                )}
                <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>
                  {viewMode === 'admin' ? 'Switch to Member Workspace' : 'Admin Console'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Expand Button when Collapsed */}
        {isCollapsed && onToggleCollapse && (
          <div className="hidden lg:flex justify-center py-2 border-t border-[#E8E6DF]">
            <button
              onClick={onToggleCollapse}
              title="Perluas Sidebar"
              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-md transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Compact User Profile & Account / Mode Switcher Dropdown at Bottom */}
        <div className="p-2 border-t border-[#E8E6DF] relative shrink-0" ref={profileMenuRef}>
          {profileMenuOpen && (
            <div
              className={`absolute bottom-full mb-1.5 bg-white rounded-lg border border-[#E8E6DF] shadow-lg py-1.5 z-50 text-xs ${
                isCollapsed ? 'left-2 w-60' : 'left-2 right-2'
              }`}
            >
              {/* Signed-in Identity Summary */}
              <div className="px-3 py-2 border-b border-stone-100">
                <div className="font-medium text-stone-900 truncate">{displayName}</div>
                <div className="text-[11px] text-stone-500 font-mono truncate">
                  {profile?.email || user?.email || 'Terautentikasi'}
                </div>
                {profile?.position && (
                  <div className="text-[11px] text-[#4A6B53] mt-0.5 truncate">
                    {profile.position} {profile.division ? `· ${profile.division}` : ''}
                  </div>
                )}
              </div>

              {/* Mode Switching Menu (Member Workspace / Admin Console) */}
              {isSuperAdmin && (
                <div className="py-1 border-b border-stone-100">
                  <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">
                    Switch Mode
                  </div>
                  <button
                    onClick={() => handleModeSwitch('workspace')}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-stone-100 text-stone-700 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <LayoutDashboard className="w-3.5 h-3.5 text-stone-400" />
                      <span>Member Workspace</span>
                    </span>
                    {viewMode === 'workspace' && <Check className="w-3.5 h-3.5 text-[#4A6B53]" />}
                  </button>
                  <button
                    onClick={() => handleModeSwitch('admin')}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-stone-100 text-stone-700 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-stone-400" />
                      <span>Admin Console</span>
                    </span>
                    {viewMode === 'admin' && <Check className="w-3.5 h-3.5 text-[#4A6B53]" />}
                  </button>
                </div>
              )}

              {/* Account Actions */}
              <div className="py-1">
                <button
                  onClick={() => {
                    if (viewMode === 'admin') {
                      setActiveMode('workspace');
                      onChangeViewMode('workspace');
                    }
                    onSelectModule('profile');
                    setProfileMenuOpen(false);
                    onCloseMobile();
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-stone-100 text-stone-700 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span>Profil Saya</span>
                </button>
                <button
                  onClick={() => {
                    if (viewMode === 'admin') {
                      setActiveMode('workspace');
                      onChangeViewMode('workspace');
                    }
                    onSelectModule('settings');
                    setProfileMenuOpen(false);
                    onCloseMobile();
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-stone-100 text-stone-700 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-stone-400" />
                  <span>Pengaturan Akun</span>
                </button>
              </div>

              {/* Logout */}
              <div className="pt-1 border-t border-stone-100">
                <button
                  onClick={handleLogoutClick}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-red-50 text-red-600 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            title={`${displayName} (${displaySubtitle})`}
            className={`w-full flex items-center gap-2.5 p-1.5 rounded-md hover:bg-stone-200/60 transition-colors text-left ${
              isCollapsed ? 'lg:justify-center' : ''
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#E8ECE9] border border-[#CCDCD0] flex items-center justify-center text-[10px] font-semibold text-[#284230] shrink-0">
              {initials || 'U'}
            </div>
            <div className={`flex-1 min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <div className="text-xs font-medium text-stone-900 truncate leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] text-stone-500 truncate leading-tight">
                {displaySubtitle}
              </div>
            </div>
            <ChevronUp
              className={`w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform ${
                profileMenuOpen ? 'rotate-180' : ''
              } ${isCollapsed ? 'lg:hidden' : ''}`}
            />
          </button>
        </div>
      </aside>
    </>
  );
};
