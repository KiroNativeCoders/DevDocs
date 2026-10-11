import { useEffect, useState } from 'react'
import mermaid from 'mermaid'
import { getAiConfig, PROVIDERS, transformText } from '../lib/ai'
import GeminiSparkleIcon from './GeminiSparkleIcon'
import './DiagramifyModal.css'

type Props = {
  isOpen: boolean
  selectedText: string
  contextBefore?: string
  contextAfter?: string
  onInsertBelow: (mermaidCode: string) => void
  onReplace: (mermaidCode: string) => void
  onClose: () => void
  onOpenSettings: () => void
}

function getAppTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'dark') return 'dark'
    if (attr === 'light') return 'light'
    const stored = localStorage.getItem('dx_theme')
    if (stored === 'dark') return 'dark'
  }
  return 'light'
}

export default function DiagramifyModal({
  isOpen,
  selectedText,
  contextBefore,
  contextAfter,
  onInsertBelow,
  onReplace,
  onClose,
  onOpenSettings,
}: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>(getAppTheme)
  const [customPrompt, setCustomPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [rawResult, setRawResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState(0)
  const [svg, setSvg] = useState('')
  const [zoom, setZoom] = useState(100)
  const [viewMode, setViewMode] = useState<'diagram' | 'split' | 'code'>('diagram')
  const [copiedCode, setCopiedCode] = useState(false)

  const cfg = getAiConfig()
  const providerMeta = PROVIDERS[cfg.provider]
  const modelShort = cfg.model.includes('/') ? cfg.model.split('/')[1] : cfg.model

  const handleCopyCode = async () => {
    if (!activeDiagram) return
    try {
      await navigator.clipboard.writeText(activeDiagram)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleCodeChange = (newCode: string) => {
    if (diagrams.length > 1) {
      const updated = [...diagrams]
      updated[activeStage] = newCode
      setRawResult(updated.join('\n\n---DIAGRAM_SPLIT---\n\n'))
    } else {
      setRawResult(newCode)
    }
  }

  // Listen for app theme changes
  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<'light' | 'dark'>).detail
      if (detail) setTheme(detail)
      else setTheme(getAppTheme())
    }
    window.addEventListener('dx:theme-changed', onThemeChange)
    return () => window.removeEventListener('dx:theme-changed', onThemeChange)
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const runDiagramify = async (promptInstruction?: string) => {
    setLoading(true)
    setError(null)
    setActiveStage(0)
    setZoom(100)
    try {
      const out = await transformText({
        text: selectedText,
        mode: 'diagram',
        contextBefore,
        contextAfter,
        customInstruction: promptInstruction || undefined,
      })
      setRawResult(out)
    } catch (err: unknown) {
      setRawResult('')
      setError(err instanceof Error ? err.message : 'Failed to generate diagram')
    } finally {
      setLoading(false)
    }
  }

  // Trigger diagramify when modal opens
  useEffect(() => {
    if (isOpen) {
      runDiagramify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedText])

  // Extract separate diagrams if the workflow was split into stages
  const diagrams = rawResult
    ? rawResult
        .split(/---DIAGRAM_SPLIT---/)
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const activeDiagram = diagrams[activeStage] || diagrams[0] || ''
  const isWarning = rawResult.trim().startsWith('⚠️')

  // Render SVG with Mermaid
  useEffect(() => {
    if (!activeDiagram || isWarning || loading) {
      setSvg('')
      return
    }

    let cancelled = false
    const isDark = theme === 'dark'
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'neutral',
        securityLevel: 'strict',
        fontFamily: 'inherit',
        themeVariables: isDark
          ? {
              darkMode: true,
              fontSize: '13px',
              fontFamily: 'inherit',
              background: '#0f172a',
              primaryColor: '#2563eb',
              primaryTextColor: '#f8fafc',
              primaryBorderColor: '#3b82f6',
              lineColor: '#94a3b8',
              secondaryColor: '#1e293b',
              tertiaryColor: '#0f172a',
              mainBkg: '#0f172a',
              nodeBorder: '#3b82f6',
              clusterBkg: '#1e293b',
              clusterBorder: '#334155',
              defaultLinkColor: '#94a3b8',
              titleColor: '#f8fafc',
              edgeLabelBackground: '#1e293b',
            }
          : {
              fontSize: '13px',
              fontFamily: 'inherit',
              primaryColor: '#e0e7ff',
              primaryTextColor: '#1e293b',
              primaryBorderColor: '#6366f1',
              lineColor: '#64748b',
              secondaryColor: '#f8fafc',
              tertiaryColor: '#ffffff',
            },
      })
    } catch {
      // ignore init error
    }

    const renderId = `df-mmd-${Math.random().toString(36).slice(2)}`
    mermaid
      .render(renderId, activeDiagram)
      .then((r) => {
        if (!cancelled) {
          setSvg(r.svg)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || 'Invalid diagram structure')
        }
      })

    return () => {
      cancelled = true
      document.getElementById(renderId)?.remove()
      document.getElementById('d' + renderId)?.remove()
    }
  }, [activeDiagram, isWarning, loading, theme])

  if (!isOpen) return null

  const handleZoom = (delta: number) => {
    setZoom((z) => Math.max(40, Math.min(220, z + delta)))
  }

  const handleResetZoom = () => setZoom(100)

  const handleInsert = (action: 'insert' | 'replace') => {
    if (!activeDiagram || isWarning) return
    // If multiple stages were generated, join them with a gap or insert active
    const codeToInsert = diagrams.length > 1 ? diagrams.join('\n\n') : activeDiagram
    if (action === 'insert') {
      onInsertBelow(codeToInsert)
    } else {
      onReplace(codeToInsert)
    }
    onClose()
  }

  return (
    <div className="diagramify-modal-backdrop" onClick={onClose}>
      <div className="diagramify-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="df-header">
          <div className="df-header-left">
            <div className="df-header-icon">
              <GeminiSparkleIcon size={20} />
            </div>
            <div className="df-header-title-box">
              <div className="df-header-title">Diagramify Workflow Studio</div>
              <div className="df-header-subtitle">
                Automated workflow actor, decision, and system mapping
              </div>
            </div>
          </div>
          <div className="df-header-right">
            {!loading && !isWarning && !error && activeDiagram && (
              <div className="df-view-toggle">
                <button
                  type="button"
                  className={`df-view-btn ${viewMode === 'diagram' ? 'active' : ''}`}
                  onClick={() => setViewMode('diagram')}
                  title="Rendered visual diagram"
                >
                  📊 Diagram
                </button>
                <button
                  type="button"
                  className={`df-view-btn ${viewMode === 'split' ? 'active' : ''}`}
                  onClick={() => setViewMode('split')}
                  title="Side-by-side code and diagram"
                >
                  ◫ Split
                </button>
                <button
                  type="button"
                  className={`df-view-btn ${viewMode === 'code' ? 'active' : ''}`}
                  onClick={() => setViewMode('code')}
                  title="View and edit Mermaid syntax code"
                >
                  ⌨️ Code
                </button>
              </div>
            )}
            <button
              type="button"
              className="df-model-pill"
              onClick={onOpenSettings}
              title="Click to change AI Model or API Key"
            >
              <span>{providerMeta.name} · {modelShort}</span>
              <span style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'underline' }}>⚙️</span>
            </button>
            <button type="button" className="df-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Refinement Prompt Bar */}
        <div className="df-instruction-bar">
          <input
            type="text"
            className="df-instruction-input"
            placeholder="Add refinement instruction (e.g. 'show failure branches', 'group into microservices', 'break into 2 phases')…"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) runDiagramify(customPrompt)
            }}
          />
          <button
            type="button"
            className="df-regen-btn"
            onClick={() => runDiagramify(customPrompt)}
            disabled={loading}
          >
            ↻ Regenerate
          </button>
        </div>

        {/* Multi-Stage Tabs if broken down */}
        {diagrams.length > 1 && !isWarning && !loading && (
          <div className="df-stage-tabs">
            {diagrams.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`df-stage-tab ${activeStage === idx ? 'active' : ''}`}
                onClick={() => {
                  setActiveStage(idx)
                  setZoom(100)
                }}
              >
                Phase {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Main Viewport */}
        <div className="df-viewport">
          {loading ? (
            <div className="df-loading-box">
              <div className="df-spinner" />
              <div>Analyzing actors, decision blocks, and system flows…</div>
            </div>
          ) : isWarning ? (
            <div className="df-warning-card">
              <div className="df-warning-icon">⚠️</div>
              <div className="df-warning-title">Non-Workflow Text Detected</div>
              <div className="df-warning-msg">
                {rawResult.replace(/^⚠️\s*/, '')}
              </div>
              <button
                type="button"
                className="df-btn-secondary"
                onClick={onClose}
              >
                Close & Select a Workflow
              </button>
            </div>
          ) : error ? (
            <div className="df-warning-card">
              <div className="df-warning-icon">⚠️</div>
              <div className="df-warning-title">Generation Error</div>
              <div className="df-warning-msg">{error}</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button type="button" className="df-btn-secondary" onClick={onOpenSettings}>
                  Configure AI Settings
                </button>
                <button
                  type="button"
                  className="df-btn-primary"
                  onClick={() => runDiagramify(customPrompt)}
                >
                  ↻ Retry
                </button>
              </div>
            </div>
          ) : viewMode === 'code' ? (
            <div className="df-code-panel">
              <div className="df-code-header">
                <div className="df-code-header-left">
                  <span>Mermaid Source Code</span>
                  <span className="df-code-hint">(Edits re-render diagram in real time)</span>
                </div>
                <button type="button" className="df-copy-code-btn" onClick={handleCopyCode}>
                  {copiedCode ? '✓ Copied' : '📋 Copy Code'}
                </button>
              </div>
              <textarea
                className="df-code-editor"
                value={activeDiagram}
                onChange={(e) => handleCodeChange(e.target.value)}
                spellCheck={false}
                placeholder="Mermaid diagram syntax..."
              />
            </div>
          ) : viewMode === 'split' ? (
            <div className="df-split-container">
              <div className="df-code-panel">
                <div className="df-code-header">
                  <div className="df-code-header-left">
                    <span>Mermaid Source</span>
                    <span className="df-code-hint">(Live edit)</span>
                  </div>
                  <button type="button" className="df-copy-code-btn" onClick={handleCopyCode}>
                    {copiedCode ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
                <textarea
                  className="df-code-editor"
                  value={activeDiagram}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  spellCheck={false}
                  placeholder="Mermaid diagram syntax..."
                />
              </div>
              <div className="df-canvas-wrapper">
                <div className="df-canvas">
                  <div
                    className="df-svg-container"
                    style={{ transform: `scale(${zoom / 100})` }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="df-canvas">
              <div
                className="df-svg-container"
                style={{ transform: `scale(${zoom / 100})` }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          )}

          {/* Floating Zoom Controls (shown for diagram or split views) */}
          {!loading && !isWarning && !error && svg && viewMode !== 'code' && (
            <div className="df-zoom-controls">
              <button
                type="button"
                className="df-zoom-btn"
                title="Zoom Out"
                onClick={() => handleZoom(-15)}
              >
                −
              </button>
              <span className="df-zoom-label">{zoom}%</span>
              <button
                type="button"
                className="df-zoom-btn"
                title="Zoom In"
                onClick={() => handleZoom(15)}
              >
                +
              </button>
              <button
                type="button"
                className="df-zoom-btn"
                title="Reset Zoom"
                onClick={handleResetZoom}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="df-footer">
          <div className="df-footer-quote" title={selectedText}>
            "{selectedText.length > 100 ? selectedText.slice(0, 97) + '…' : selectedText}"
          </div>
          <div className="df-footer-actions">
            <button type="button" className="df-btn-ghost" onClick={onClose}>
              Discard
            </button>
            <button
              type="button"
              className="df-btn-secondary"
              disabled={loading || isWarning || !activeDiagram}
              onClick={() => handleInsert('insert')}
            >
              ⬇ Insert Below
            </button>
            <button
              type="button"
              className="df-btn-primary"
              disabled={loading || isWarning || !activeDiagram}
              onClick={() => handleInsert('replace')}
            >
              Replace Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
