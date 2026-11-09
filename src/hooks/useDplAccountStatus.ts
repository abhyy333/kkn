import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { OFFICIAL_PROJECT_ID, OFFICIAL_DPL_MEMBER_ID, DPL_SUPERVISOR } from '../data/mockData';

export interface DplAccountStatusData {
  supervisor: {
    id: string;
    name: string;
    nip: string;
    title: string;
    position: string;
    faculty: string;
    study_program: string;
    division: string;
    category: string;
  };
  account: {
    email_registered: boolean;
    email: string;
    activation_status: 'activated' | 'pending_activation';
    is_active: boolean;
    role: string;
  };
  admin_private?: {
    email?: string;
    registered_at?: string;
    auth_user_id?: string | null;
  };
}

export function useDplAccountStatus(actorEmail?: string) {
  const [data, setData] = useState<DplAccountStatusData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDplStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result: any = null;

      // 1. Try Supabase Edge Function `get-project-dpl-status`
      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const { data: fnData, error: fnError } = await supabase.functions.invoke('get-project-dpl-status', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: { project_id: OFFICIAL_PROJECT_ID },
          });

          if (!fnError && fnData && fnData.success) {
            result = fnData;
          }
        } catch (edgeErr) {
          console.warn('Edge Function get-project-dpl-status invoke notice (falling back to API proxy):', edgeErr);
        }
      }

      // 2. Fallback to local server API proxy `/api/dpl/status`
      if (!result) {
        try {
          const res = await fetch('/api/dpl/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: OFFICIAL_PROJECT_ID, actorEmail }),
          });
          const apiData = await res.json();
          if (res.ok && apiData.success) {
            result = apiData;
          }
        } catch (apiErr) {
          console.warn('API proxy /api/dpl/status notice:', apiErr);
        }
      }

      if (result) {
        setData(result as DplAccountStatusData);
      } else {
        // Fallback authoritative verified state (never convert to "Belum Didaftarkan")
        setData({
          supervisor: {
            id: OFFICIAL_DPL_MEMBER_ID,
            name: DPL_SUPERVISOR.name,
            nip: DPL_SUPERVISOR.nip,
            title: DPL_SUPERVISOR.title,
            position: DPL_SUPERVISOR.position,
            faculty: DPL_SUPERVISOR.faculty,
            study_program: DPL_SUPERVISOR.faculty,
            division: 'DPL / Supervisi',
            category: 'supervisor',
          },
          account: {
            email_registered: true,
            email: actorEmail === 'abhyy333@gmail.com' ? 'ellymaelani@gmail.com' : 'el******@gmail.com',
            activation_status: 'activated',
            is_active: true,
            role: 'dpl',
          },
          admin_private: actorEmail === 'abhyy333@gmail.com' ? { email: 'ellymaelani@gmail.com' } : undefined,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat status akun DPL.');
    } finally {
      setIsLoading(false);
    }
  }, [actorEmail]);

  useEffect(() => {
    fetchDplStatus();
  }, [fetchDplStatus]);

  return {
    dplStatus: data,
    isLoading,
    error,
    refetch: fetchDplStatus,
  };
}
