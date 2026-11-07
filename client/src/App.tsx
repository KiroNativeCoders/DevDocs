import { useEffect, useState, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import Home from './components/Home'
import Auth from './components/Auth'
import ShareDialog from './components/ShareDialog'
import ConnectAiModal from './components/ConnectAiModal'
import ConsentScreen from './components/ConsentScreen'
import LaunchPage from './components/LaunchPage'
import { posthog, identifyUser, resetUser } from './lib/posthog'
import { auth, docs, type User, type DocDetail } from './lib/api'
import { pushRecent } from './lib/recent'
import { syncFoldersFromRemote } from './lib/folders'
import './App.css'

// Check if current URL is the standalone landing/launching page.
function isLaunchPath(): boolean {
  return window.location.pathname === '/launch' || window.location.pathname === '/landing'
}

// Read the current document id from the URL (/doc/:id), or null for home (/).
function idFromPath(): string | null {
  const m = window.location.pathname.match(/^\/doc\/([^/]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

function userInitials(name: string | null | undefined, email: string): string {
  const source = (name && name.trim()) || email.split('@')[0] || '?'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2)
  return letters.toUpperCase()
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('dx_theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dx_theme', theme)
    window.dispatchEvent(new CustomEvent('dx:theme-changed', { detail: theme }))
  }, [theme])

  // Selection is driven by the URL so every document is shareable by link.
  const [selectedId, setSelectedId] = useState<string | null>(idFromPath())
  const [detail, setDetail] = useState<DocDetail | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => localStorage.getItem('dx_nav_collapsed') === '1')
  useEffect(() => {
    localStorage.setItem('dx_nav_collapsed', navCollapsed ? '1' : '0')
  }, [navCollapsed])
  const [search, setSearch] = useState('')
  // Elements in the shell that the Editor portals its controls into.
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null)
  const [menuSlot, setMenuSlot] = useState<HTMLElement | null>(null)
  const [statusSlot, setStatusSlot] = useState<HTMLElement | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  // Allow viewing standalone launching page at /launch or /landing without needing login
  const [isLaunch, setIsLaunch] = useState(isLaunchPath())

  useEffect(() => {
    const checkPath = () => setIsLaunch(isLaunchPath())
    window.addEventListener('popstate', checkPath)
    return () => window.removeEventListener('popstate', checkPath)
  }, [])

  // Track pageviews into PostHog
  useEffect(() => {
    posthog.capture('$pageview', { path: window.location.pathname })
  }, [selectedId, isLaunch])

  // Navigate: push a new URL and update selection. Passing null goes home (/).
  const navigate = useCallback((id: string | null) => {
    const path = id ? `/doc/${encodeURIComponent(id)}` : '/'
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
    setSelectedId(id)
  }, [])

  // Keep selection in sync with browser back/forward.
  useEffect(() => {
    const onPop = () => setSelectedId(idFromPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // On load, check for an existing session.
  useEffect(() => {
    auth
      .current()
      .then((u) => {
        setUser(u)
        if (u) {
          identifyUser(u.id, { email: u.email, name: u.name })
          void syncFoldersFromRemote()
        }
      })
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true))
  }, [])

  // Close the user dropdown on outside click or Escape.
  useEffect(() => {
    if (!userMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [userMenuOpen])

  // Load the selected doc's detail (title + role) when selection changes.
  useEffect(() => {
    if (!selectedId || !user) {
      setDetail(null)
      return
    }
    let cancelled = false
    docs
      .get(selectedId)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        pushRecent(d.id)
      })
      .catch(() => {
        if (cancelled) return
        // Unknown / inaccessible id in the URL — fall back to home.
        setDetail(null)
        navigate(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, user, refreshKey, navigate])

  async function logout() {
    await auth.signOut().catch(() => undefined)
    resetUser()
    setUser(null)
    navigate(null)
    setDetail(null)
  }

  async function newDocument() {
    const doc = await docs.create('Untitled document')
    setRefreshKey((k) => k + 1)
    navigate(doc.id)
  }

  const canShare = detail && (detail.role === 'OWNER' || detail.role === 'MANAGER')
  const roleLabel =
    detail?.role === 'MANAGER'
      ? 'Shared · can manage'
      : detail?.role === 'EDITOR'
        ? 'Shared · can edit'
        : 'Shared · view only'

  // OAuth consent screen (Supabase OAuth server redirects here). It manages its
  // own auth, so it sits BEFORE the normal auth gate.
  if (window.location.pathname === '/oauth/consent') return <ConsentScreen />

  if (isLaunch) {
    return <LaunchPage onStartWriting={() => {
      window.history.pushState({}, '', '/')
      setIsLaunch(false)
      setSelectedId(null)
    }} />
  }

  if (!authChecked) return <div className="app-boot">Loading…</div>
  if (!user) return <Auth onAuthed={setUser} />

  return (
    <div className="app">
      <header className="app-header">
        <button
          type="button"
          className="header-icon-btn"
          onClick={() => setNavCollapsed((c) => !c)}
          title={navCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <div className="brand" onClick={() => navigate(null)} style={{ cursor: 'pointer' }} title="Home">
          <span className="brand-mark">DD</span>
          <span className="brand-name">DevDocs</span>
        </div>
        <div className="header-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="header-search-input"
            placeholder="Search documents"
            aria-label="Search documents"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (e.target.value) setNavCollapsed(false)
            }}
          />
          {search && (
            <button type="button" className="header-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>
        {detail && detail.role !== 'OWNER' && (
          <span className="role-badge">{roleLabel}</span>
        )}
        {/* The open document's status / versions / comments controls render here. */}
        <div className="header-actions" ref={setActionsSlot} />
        {canShare && (
          <button className="invite-people-link" onClick={() => setSharing(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Invite People
          </button>
        )}
        <div className="header-user">
          <div className="user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="user-avatar-btn"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              title={user.name || user.email}
            >
              {userInitials(user.name, user.email)}
            </button>
            {userMenuOpen && (
              <div className="user-menu-dropdown" role="menu">
                <div className="user-menu-email" title={user.email}>{user.email}</div>
                <div className="user-menu-appearance">
                  <span className="uma-label">Appearance</span>
                  <div className="uma-seg">
                    <button
                      type="button"
                      className={`uma-seg-btn${theme === 'light' ? ' is-active' : ''}`}
                      onClick={() => setTheme('light')}
                      title="Light mode"
                      aria-label="Light mode"
                      aria-pressed={theme === 'light'}
                    >
                      ☀️
                    </button>
                    <button
                      type="button"
                      className={`uma-seg-btn${theme === 'dark' ? ' is-active' : ''}`}
                      onClick={() => setTheme('dark')}
                      title="Dark mode"
                      aria-label="Dark mode"
                      aria-pressed={theme === 'dark'}
                    >
                      🌙
                    </button>
                  </div>
                </div>
                <button
                  className="user-menu-item"
                  role="menuitem"
                  onClick={() => { setConnectOpen(true); setUserMenuOpen(false) }}
                >
                  MCP Tokens
                </button>
                <button
                  className="user-menu-item user-menu-item-danger"
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); logout() }}
                >
                  Log out
                </button>
                {selectedId && detail && (
                  <div className="user-menu-status" ref={setStatusSlot} />
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      {selectedId && detail && (
        <div className="app-subbar">
          <div className="app-subbar-menus" ref={setMenuSlot} />
        </div>
      )}
      <div className="app-body">
        <div className={`app-sidebar${navCollapsed ? ' is-collapsed' : ''}`}>
          <Sidebar
            selectedId={selectedId}
            onSelect={(id) => navigate(id || null)}
            refreshKey={refreshKey}
            query={search}
            onCollapse={() => setNavCollapsed(true)}
          />
        </div>
        <main className="app-main">
          {selectedId && detail ? (
            <Editor
              key={selectedId}
              docId={selectedId}
              initialTitle={detail.title}
              initialStatus={detail.status}
              role={detail.role}
              currentUserId={user.id}
              onTitleSaved={() => setRefreshKey((k) => k + 1)}
              actionsSlot={actionsSlot}
              menuSlot={menuSlot}
              statusSlot={statusSlot}
            />
          ) : (
            <Home
              userName={user.name || user.email}
              refreshKey={refreshKey}
              onOpen={(id) => navigate(id)}
              onNewDoc={newDocument}
            />
          )}
        </main>
      </div>
      {sharing && selectedId && detail && (
        <ShareDialog docId={selectedId} isOwner={detail.role === 'OWNER'} onClose={() => setSharing(false)} />
      )}
      <ConnectAiModal isOpen={connectOpen} onClose={() => setConnectOpen(false)} />
    </div>
  )
}
