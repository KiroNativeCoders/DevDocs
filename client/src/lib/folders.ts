// Folder management for DXEditor documents.
// Persists folder definitions and doc-to-folder assignments to Postgres via the backend API,
// with automatic local fallback & caching for instant UI response and offline resilience.

import { foldersApi } from './api'

export type Folder = {
  id: string
  name: string
  createdAt: string
  color?: string
  parentId?: string | null
}

const FOLDERS_KEY = 'dx_folders'
const DOC_FOLDERS_KEY = 'dx_doc_folders'
const FOLDER_COLLAPSED_KEY = 'dx_folder_collapsed'

let isSyncing = false

export function getFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveFolders(folders: Folder[]): void {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
    window.dispatchEvent(new CustomEvent('dx:folders-updated'))
  } catch {
    // ignore quota/disabled storage
  }
}

/** Sync folders and doc-folder assignments from Postgres to local storage */
export async function syncFoldersFromRemote(): Promise<void> {
  if (isSyncing) return
  isSyncing = true
  try {
    const remoteFolders = await foldersApi.list()
    if (Array.isArray(remoteFolders) && remoteFolders.length > 0) {
      saveFolders(remoteFolders)
    }
    const remoteMapping = await foldersApi.getMapping()
    if (remoteMapping && typeof remoteMapping === 'object') {
      saveDocFolders(remoteMapping)
    }
  } catch {
    // offline or backend table initializing
  } finally {
    isSyncing = false
  }
}

export function createFolder(name: string, parentId: string | null = null): Folder {
  const trimmed = name.trim() || 'Untitled Folder'
  const newFolder: Folder = {
    id: 'f_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
    name: trimmed,
    createdAt: new Date().toISOString(),
    parentId: parentId || null,
  }
  const current = getFolders()
  saveFolders([...current, newFolder])

  // Persist asynchronously to Postgres
  void foldersApi.save(newFolder.id, newFolder.name, newFolder.parentId)

  return newFolder
}

export function renameFolder(folderId: string, newName: string): void {
  const trimmed = newName.trim()
  if (!trimmed) return
  const current = getFolders()
  const updated = current.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f))
  saveFolders(updated)

  const target = updated.find((f) => f.id === folderId)
  if (target) {
    void foldersApi.save(target.id, target.name, target.parentId)
  }
}

export function moveFolder(folderId: string, targetParentId: string | null): void {
  if (folderId === targetParentId) return
  const current = getFolders()
  
  // Prevent moving a folder into its own descendant (prevent circular nesting)
  const descendants = getDescendantFolderIds(folderId, current)
  if (targetParentId && descendants.has(targetParentId)) return

  const updated = current.map((f) =>
    f.id === folderId ? { ...f, parentId: targetParentId || null } : f
  )
  saveFolders(updated)

  const target = updated.find((f) => f.id === folderId)
  if (target) {
    void foldersApi.save(target.id, target.name, target.parentId)
  }
}

export function getDescendantFolderIds(folderId: string, allFolders = getFolders()): Set<string> {
  const result = new Set<string>()
  function collect(id: string) {
    for (const f of allFolders) {
      if (f.parentId === id && !result.has(f.id)) {
        result.add(f.id)
        collect(f.id)
      }
    }
  }
  collect(folderId)
  return result
}

export function deleteFolder(folderId: string): void {
  const current = getFolders()
  // Collect this folder and all its descendant subfolders
  const toDelete = getDescendantFolderIds(folderId, current)
  toDelete.add(folderId)

  const remaining = current.filter((f) => !toDelete.has(f.id))
  saveFolders(remaining)

  // Persist folder deletions to Postgres
  for (const id of toDelete) {
    void foldersApi.remove(id)
  }

  // Remove doc mappings for deleted folders so docs return to Root/Unfiled
  const mapping = getDocFolders()
  let changed = false
  for (const docId of Object.keys(mapping)) {
    if (toDelete.has(mapping[docId])) {
      delete mapping[docId]
      void foldersApi.saveDocFolder(docId, null)
      changed = true
    }
  }
  if (changed) {
    saveDocFolders(mapping)
  }
}

export function getFolderPath(folderId: string | null, allFolders = getFolders()): string {
  if (!folderId) return ''
  const byId = new Map(allFolders.map((f) => [f.id, f]))
  const parts: string[] = []
  let curr = byId.get(folderId)
  const seen = new Set<string>()
  while (curr && !seen.has(curr.id)) {
    seen.add(curr.id)
    parts.unshift(curr.name)
    curr = curr.parentId ? byId.get(curr.parentId) : undefined
  }
  return parts.join(' / ')
}

export function getDocFolders(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DOC_FOLDERS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function saveDocFolders(mapping: Record<string, string>): void {
  try {
    localStorage.setItem(DOC_FOLDERS_KEY, JSON.stringify(mapping))
    window.dispatchEvent(new CustomEvent('dx:folders-updated'))
  } catch {
    // ignore quota
  }
}

export function getDocFolderId(docId: string): string | null {
  const mapping = getDocFolders()
  return mapping[docId] || null
}

export function moveDocToFolder(docId: string, folderId: string | null): void {
  const mapping = getDocFolders()
  if (!folderId) {
    if (mapping[docId]) {
      delete mapping[docId]
      saveDocFolders(mapping)
    }
  } else {
    mapping[docId] = folderId
    saveDocFolders(mapping)
  }

  // Persist to Postgres
  void foldersApi.saveDocFolder(docId, folderId)
}

export function getCollapsedFolderIds(): string[] {
  try {
    const raw = localStorage.getItem(FOLDER_COLLAPSED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function setFolderCollapsed(folderId: string, collapsed: boolean): void {
  try {
    const current = new Set(getCollapsedFolderIds())
    if (collapsed) {
      current.add(folderId)
    } else {
      current.delete(folderId)
    }
    localStorage.setItem(FOLDER_COLLAPSED_KEY, JSON.stringify(Array.from(current)))
  } catch {
    // ignore
  }
}
