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
  const [navHover, setNavHover] = useState(false)
  const [navPinned, setNavPinned] = useState(false)
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
        <div className="brand" onClick={() => navigate(null)} style={{ cursor: 'pointer' }} title="Home">
          <span className="brand-mark">DD</span>
          <span className="brand-name">DevDocs</span>
        </div>
        {detail && detail.role !== 'OWNER' && (
          <span className="role-badge">{roleLabel}</span>
        )}
        <div className="header-user">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="user-menu-trigger"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <span className="user-email">{user.name || user.email}</span>
              <span className="user-menu-caret" aria-hidden="true">▾</span>
            </button>
            {userMenuOpen && (
              <div className="user-menu-dropdown" role="menu">
                <div className="user-menu-email" title={user.email}>{user.email}</div>
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
              </div>
            )}
          </div>
          {canShare && (
            <button className="header-btn share-primary" onClick={() => setSharing(true)}>
              Share
            </button>
          )}
        </div>
      </header>
      <div className="app-body">
        <div
          className={`sidebar-dock${navPinned || navHover ? ' open' : ''}`}
          onMouseEnter={() => setNavHover(true)}
          onMouseLeave={() => setNavHover(false)}
        >
          <Sidebar
            selectedId={selectedId}
            onSelect={(id) => navigate(id || null)}
            refreshKey={refreshKey}
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
              navOpen={navPinned}
              onRevealNav={() => setNavHover(true)}
              onToggleNav={() => setNavPinned((p) => !p)}
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
