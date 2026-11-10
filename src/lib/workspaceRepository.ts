import { supabase, isSupabaseConfigured } from './supabase';
import { OFFICIAL_PROJECT_ID } from '../data/mockData';

export type WorkspaceModuleKey =
  | 'unit_config'
  | 'programs'
  | 'tasks'
  | 'meetings'
  | 'decisions'
  | 'village_research'
  | 'surveys'
  | 'documentation'
  | 'documentation_albums'
  | 'transactions'
  | 'inventory'
  | 'reports'
  | 'archive'
  | 'stakeholders'
  | 'announcements'
  | 'public_articles'
  | 'admin_logs'
  | 'legacy_storage';

export interface WorkspaceRecord {
  id: string;
  [key: string]: unknown;
}

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase belum dikonfigurasi. Data tidak dapat disimpan.');
  }
}

export async function listWorkspaceRecords<T extends WorkspaceRecord>(
  moduleKey: WorkspaceModuleKey
): Promise<T[]> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('kkn_workspace_records')
    .select('record_key,payload')
    .eq('project_id', OFFICIAL_PROJECT_ID)
    .eq('module_key', moduleKey)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Gagal memuat data ${moduleKey}: ${error.message}`);
  }

  const refreshStorageUrls = async (value: any): Promise<any> => {
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => refreshStorageUrls(item)));
    }
    if (!value || typeof value !== 'object') return value;

    const refreshed: Record<string, any> = {};
    await Promise.all(
      Object.entries(value).map(async ([key, nested]) => {
        refreshed[key] = await refreshStorageUrls(nested);
      })
    );

    const storagePath = typeof refreshed.storagePath === 'string'
      ? refreshed.storagePath.replace(/^kkn-space\\//, '')
      : null;
    if (storagePath) {
      const { data: signed, error: signError } = await supabase.storage
        .from('kkn-space')
        .createSignedUrl(storagePath, 60 * 60);
      if (signError || !signed?.signedUrl) {
        console.warn('Unable to refresh private media URL:', signError?.message || storagePath);
        if ('url' in refreshed) refreshed.url = '';
        if ('fileUrl' in refreshed) refreshed.fileUrl = '';
      } else {
        if ('url' in refreshed) refreshed.url = signed.signedUrl;
        if ('fileUrl' in refreshed) refreshed.fileUrl = signed.signedUrl;
      }
    }

    return refreshed;
  };

  return await Promise.all(
    (data || []).map(async (row: any) => ({
      ...(await refreshStorageUrls(row.payload || {})),
      id: String(row.payload?.id ?? row.record_key),
    }))
  ) as T[];
}

export async function upsertWorkspaceRecord<T extends WorkspaceRecord>(
  moduleKey: WorkspaceModuleKey,
  value: T
): Promise<void> {
  ensureConfigured();
  if (!value || value.id === undefined || value.id === null || String(value.id).trim() === '') {
    throw new Error(`Data ${moduleKey} harus memiliki ID yang stabil.`);
  }

  const stripTransientStorageUrls = (input: any): any => {
    if (Array.isArray(input)) return input.map(stripTransientStorageUrls);
    if (!input || typeof input !== 'object') return input;

    const output: Record<string, any> = { ...input };
    if (typeof output.storagePath === 'string') {
      if ('url' in output) output.url = '';
      if ('fileUrl' in output) output.fileUrl = '';
      if ('coverImageUrl' in output) output.coverImageUrl = '';
    }
    Object.keys(output).forEach((key) => {
      output[key] = stripTransientStorageUrls(output[key]);
    });
    return output;
  };

  const { error } = await supabase
    .from('kkn_workspace_records')
    .upsert(
      {
        project_id: OFFICIAL_PROJECT_ID,
        module_key: moduleKey,
        record_key: String(value.id),
        payload: stripTransientStorageUrls(value),
      },
      { onConflict: 'project_id,module_key,record_key' }
    );

  if (error) {
    throw new Error(`Gagal menyimpan data ${moduleKey}: ${error.message}`);
  }
}

export async function deleteWorkspaceRecord(
  moduleKey: WorkspaceModuleKey,
  recordId: string
): Promise<void> {
  ensureConfigured();

  const { error } = await supabase
    .from('kkn_workspace_records')
    .delete()
    .eq('project_id', OFFICIAL_PROJECT_ID)
    .eq('module_key', moduleKey)
    .eq('record_key', String(recordId));

  if (error) {
    throw new Error(`Gagal menghapus data ${moduleKey}: ${error.message}`);
  }
}

const LEGACY_MODULE_KEYS: Array<{
  key: string;
  module: WorkspaceModuleKey;
  kind: 'array' | 'single';
}> = [
  { key: 'kkn_space_tasks_v1', module: 'tasks', kind: 'array' },
  { key: 'kkn_space_meetings_v1', module: 'meetings', kind: 'array' },
  { key: 'kkn_space_decisions_v1', module: 'decisions', kind: 'array' },
  { key: 'kkn_space_village_research_v1', module: 'village_research', kind: 'single' },
  { key: 'kkn_space_surveys_v1', module: 'surveys', kind: 'array' },
  { key: 'kkn_space_documentation_v1', module: 'documentation', kind: 'array' },
  { key: 'kkn_space_documentation_albums_v1', module: 'documentation_albums', kind: 'array' },
  { key: 'kkn_space_admin_logs_v1', module: 'admin_logs', kind: 'array' },
];

const SENSITIVE_LEGACY_KEYS = new Set([
  'kkn_space_supabase_auth',
  'kkn_space_Authoritative_Profile_v2',
  'kkn_space_Authoritative_Profile_v3',
  'kkn_space_registered_emails_v1',
  'kkn_space_registered_emails_v2',
]);

/**
 * One-time import for old KKN module data. Legacy caches are archived
 * under a Super-Admin-only key when they are not safe to become live data.
 * Auth/session tokens and cached authorization/registration state are never
 * imported: Supabase Auth and authoritative database tables own those records.
 *
 * Browser source keys are removed only after all database writes succeed.
 */
export async function migrateLegacyLocalStorageToSupabase(): Promise<{
  migratedRecords: number;
  removedKeys: number;
}> {
  ensureConfigured();
  if (typeof window === 'undefined') return { migratedRecords: 0, removedKeys: 0 };

  const storage = window.localStorage;
  const { data: marker, error: markerError } = await supabase
    .from('kkn_workspace_records')
    .select('id')
    .eq('project_id', OFFICIAL_PROJECT_ID)
    .eq('module_key', 'legacy_storage')
    .eq('record_key', 'migration_complete_v1')
    .maybeSingle();

  if (markerError) {
    throw new Error(`Tidak dapat memeriksa status migrasi data lokal: ${markerError.message}`);
  }
  if (marker) return { migratedRecords: 0, removedKeys: 0 };

  const allKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key && key.startsWith('kkn_space_')));
  const knownKeys = new Set(LEGACY_MODULE_KEYS.map((item) => item.key));
  const knownSources = new Map(LEGACY_MODULE_KEYS.map((item) => [item.key, item]));

  let migratedRecords = 0;
  for (const key of allKeys) {
    if (SENSITIVE_LEGACY_KEYS.has(key)) continue;

    const raw = storage.getItem(key);
    if (raw === null) continue;

    const source = knownSources.get(key);
    let parsed: unknown = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Preserve malformed legacy content verbatim in the restricted archive record.
    }

    if (source?.kind === 'array') {
      if (!Array.isArray(parsed)) {
        throw new Error(`Format data lokal ${key} tidak sesuai. Data belum dihapus.`);
      }
      for (const item of parsed) {
        if (!item || typeof item !== 'object' || (item as any).id === undefined) {
          throw new Error(`Ada record tanpa ID pada ${key}. Data belum dihapus.`);
        }
        await upsertWorkspaceRecord(source.module, item as WorkspaceRecord);
        migratedRecords += 1;
      }
    } else if (source?.kind === 'single') {
      if (!parsed || typeof parsed !== 'object') {
        throw new Error(`Format data lokal ${key} tidak sesuai. Data belum dihapus.`);
      }
      await upsertWorkspaceRecord(source.module, {
        id: 'village-profile',
        ...(parsed as Record<string, unknown>),
      });
      migratedRecords += 1;
    } else {
      // Preserve stale local caches for audit only; they never feed authentication or UI state.
      await upsertWorkspaceRecord('legacy_storage', {
        id: key,
        storageKey: key,
        value: parsed,
        archivedAt: new Date().toISOString(),
      });
      migratedRecords += 1;
    }
  }

  await upsertWorkspaceRecord('legacy_storage', {
    id: 'migration_complete_v1',
    completedAt: new Date().toISOString(),
    importedRecordCount: migratedRecords,
  });

  // Remove only KKN SPACE-owned keys. Other websites' localStorage is untouched.
  allKeys.forEach((key) => storage.removeItem(key));

  return { migratedRecords, removedKeys: allKeys.length };
}
