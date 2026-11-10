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

  return (data || []).map((row: any) => ({
    ...(row.payload || {}),
    id: String(row.payload?.id ?? row.record_key),
  })) as T[];
}

export async function upsertWorkspaceRecord<T extends WorkspaceRecord>(
  moduleKey: WorkspaceModuleKey,
  value: T
): Promise<void> {
  ensureConfigured();
  if (!value || value.id === undefined || value.id === null || String(value.id).trim() === '') {
    throw new Error(`Data ${moduleKey} harus memiliki ID yang stabil.`);
  }

  const { error } = await supabase
    .from('kkn_workspace_records')
    .upsert(
      {
        project_id: OFFICIAL_PROJECT_ID,
        module_key: moduleKey,
        record_key: String(value.id),
        payload: value,
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
];

const LEGACY_MIGRATION_MARKER = 'kkn_space_legacy_migrated_v1';

/**
 * One-time import for old KKN module data. Auth tokens, cached profiles,
 * and locally cached registered emails are deliberately never imported:
 * Supabase Auth and the authoritative database tables own those records.
 *
 * Source keys are removed only after every imported record has been saved.
 */
export async function migrateLegacyLocalStorageToSupabase(): Promise<{
  migratedRecords: number;
  removedKeys: number;
}> {
  ensureConfigured();
  if (typeof window === 'undefined') return { migratedRecords: 0, removedKeys: 0 };

  const storage = window.localStorage;
  if (storage.getItem(LEGACY_MIGRATION_MARKER) === 'complete') {
    return { migratedRecords: 0, removedKeys: 0 };
  }

  let migratedRecords = 0;
  const successfullyImportedKeys: string[] = [];

  for (const source of LEGACY_MODULE_KEYS) {
    const raw = storage.getItem(source.key);
    if (!raw) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Data lokal ${source.key} tidak valid JSON. Data tersebut belum dihapus.`);
    }

    if (source.kind === 'array') {
      if (!Array.isArray(parsed)) {
        throw new Error(`Format data lokal ${source.key} tidak sesuai. Data belum dihapus.`);
      }
      for (const item of parsed) {
        if (!item || typeof item !== 'object' || (item as any).id === undefined) {
          throw new Error(`Ada record tanpa ID pada ${source.key}. Data belum dihapus.`);
        }
        await upsertWorkspaceRecord(source.module, item as WorkspaceRecord);
        migratedRecords += 1;
      }
    } else {
      if (!parsed || typeof parsed !== 'object') {
        throw new Error(`Format data lokal ${source.key} tidak sesuai. Data belum dihapus.`);
      }
      await upsertWorkspaceRecord(source.module, {
        id: 'village-profile',
        ...(parsed as Record<string, unknown>),
      });
      migratedRecords += 1;
    }

    successfullyImportedKeys.push(source.key);
  }

  // Never migrate local auth/session material or cached authorization state.
  const obsoleteSensitiveKeys = [
    'kkn_space_Authoritative_Profile_v2',
    'kkn_space_registered_emails_v1',
    'kkn_space_admin_logs_v1',
  ];
  successfullyImportedKeys.forEach((key) => storage.removeItem(key));
  obsoleteSensitiveKeys.forEach((key) => storage.removeItem(key));

  // Supabase Auth session is moved into sessionStorage by src/lib/supabase.ts.
  // Remove any legacy persistent copy after the client has restored it.
  storage.removeItem('kkn_space_supabase_auth');

  storage.setItem(LEGACY_MIGRATION_MARKER, 'complete');
  return {
    migratedRecords,
    removedKeys: successfullyImportedKeys.length + obsoleteSensitiveKeys.length,
  };
}
