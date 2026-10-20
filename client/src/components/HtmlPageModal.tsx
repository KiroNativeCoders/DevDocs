import { useEffect, useState } from 'react'
import './HtmlPageModal.css'

type Props = {
  html?: string
  src?: string
  title?: string
  onClose: () => void
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile'

export default function HtmlPageModal({ html = '', src = '', title = 'HTML Page', onClose }: Props) {
  const [device, setDevice] = useState<DeviceMode>('desktop')
  const [viewMode, setViewMode] = useState<'preview' | 'split' | 'code'>('preview')
  const [codeSource, setCodeSource] = useState<string>(html)
  const [zoom, setZoom] = useState<number>(100)
  const [copiedCode, setCopiedCode] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setCodeSource(html)
  }, [html])

  // Escape key closes modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const copyCode = async () => {
    const text = codeSource || src
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // fallback
    }
  }

  const openInNewTab = () => {
    if (src) {
      window.open(src, '_blank', 'noopener,noreferrer')
      return
    }
    if (!codeSource) return
    const blob = new Blob([codeSource], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.focus()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    }
  }

  const getDeviceWidth = () => {
    switch (device) {
      case 'mobile':
        return '375px'
      case 'tablet':
        return '768px'
      case 'desktop':
      default:
        return '100%'
    }
  }

  return (
    <div className="html-modal-backdrop" onClick={onClose}>
      <div
        className="html-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="HTML Page Fullscreen Viewer"
      >
        {/* Top Header */}
        <div className="html-modal-header">
          <div className="hm-header-left">
            <span className="hm-header-icon">🌐</span>
            <span className="hm-header-title">{title}</span>
          </div>

          <div className="hm-header-center">
            {/* View Mode Toggle */}
            <div className="hm-view-toggle">
              <button
                type="button"
                className={`hm-view-btn ${viewMode === 'preview' ? 'active' : ''}`}
                onClick={() => setViewMode('preview')}
                title="Rendered Page Preview"
              >
                👁️ Preview
              </button>
              {html && (
                <>
                  <button
                    type="button"
                    className={`hm-view-btn ${viewMode === 'split' ? 'active' : ''}`}
                    onClick={() => setViewMode('split')}
                    title="Split Source & Preview"
                  >
                    ◫ Split
                  </button>
                  <button
                    type="button"
                    className={`hm-view-btn ${viewMode === 'code' ? 'active' : ''}`}
                    onClick={() => setViewMode('code')}
                    title="View HTML Source"
                  >
                    ⌨️ Code
                  </button>
                </>
              )}
            </div>

            {/* Device Switcher (only in preview/split) */}
            {viewMode !== 'code' && (
              <div className="hm-device-switcher">
                <button
                  type="button"
                  className={`hm-device-btn ${device === 'desktop' ? 'active' : ''}`}
                  onClick={() => setDevice('desktop')}
                  title="Desktop (100%)"
                >
                  🖥️ Desktop
                </button>
                <button
                  type="button"
                  className={`hm-device-btn ${device === 'tablet' ? 'active' : ''}`}
                  onClick={() => setDevice('tablet')}
                  title="Tablet (768px)"
                >
                  📱 Tablet
                </button>
                <button
                  type="button"
                  className={`hm-device-btn ${device === 'mobile' ? 'active' : ''}`}
                  onClick={() => setDevice('mobile')}
                  title="Mobile (375px)"
                >
                  📱 Mobile
                </button>
              </div>
            )}

            {/* Zoom controls */}
            {viewMode !== 'code' && (
              <div className="hm-zoom-group">
                <button
                  type="button"
                  className="hm-tool-btn"
                  onClick={() => setZoom((z) => Math.max(50, z - 10))}
                  title="Zoom out"
                >
                  −
                </button>
                <button
                  type="button"
                  className="hm-zoom-pill"
                  onClick={() => setZoom(100)}
                  title="Reset to 100%"
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  className="hm-tool-btn"
                  onClick={() => setZoom((z) => Math.min(200, z + 10))}
                  title="Zoom in"
                >
                  +
                </button>
              </div>
            )}
          </div>

          <div className="hm-header-right">
            <button
              type="button"
              className="hm-action-btn"
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Reload Frame"
            >
              ⟳ Reload
            </button>
            <button
              type="button"
              className="hm-action-btn"
              onClick={openInNewTab}
              title="Open in new browser tab"
            >
              ↗ New Tab
            </button>
            <button
              type="button"
              className="hm-action-btn"
              onClick={copyCode}
              title="Copy HTML code"
            >
              {copiedCode ? '✓ Copied' : '📋 Copy'}
            </button>
            <button
              type="button"
              className="hm-close-btn"
              onClick={onClose}
              title="Close fullscreen (Esc)"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="html-modal-viewport">
          {viewMode === 'code' ? (
            <div className="hm-code-panel">
              <div className="hm-code-header">
                <span>HTML Source Code</span>
                <button type="button" className="hm-copy-btn" onClick={copyCode}>
                  {copiedCode ? '✓ Copied' : '📋 Copy Code'}
                </button>
              </div>
              <textarea
                className="hm-code-editor"
                value={codeSource}
                onChange={(e) => setCodeSource(e.target.value)}
                spellCheck={false}
              />
            </div>
          ) : viewMode === 'split' ? (
            <div className="hm-split-container">
              <div className="hm-code-panel">
                <div className="hm-code-header">
                  <span>HTML Source (Live)</span>
                  <button type="button" className="hm-copy-btn" onClick={copyCode}>
                    {copiedCode ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
                <textarea
                  className="hm-code-editor"
                  value={codeSource}
                  onChange={(e) => setCodeSource(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div className="hm-preview-container">
                <div
                  className={`hm-device-frame device-${device}`}
                  style={{
                    width: getDeviceWidth(),
                    transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                    transformOrigin: 'top center',
                  }}
                >
                  <iframe
                    key={`modal-split-${refreshKey}`}
                    className="hm-iframe"
                    title={title}
                    srcDoc={codeSource}
                    src={src || undefined}
                    sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="hm-preview-container">
              <div
                className={`hm-device-frame device-${device}`}
                style={{
                  width: getDeviceWidth(),
                  transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                  transformOrigin: 'top center',
                }}
              >
                <iframe
                  key={`modal-preview-${refreshKey}`}
                  className="hm-iframe"
                  title={title}
                  srcDoc={!src ? codeSource : undefined}
                  src={src || undefined}
                  sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="html-modal-footer">
          <span>
            {device === 'desktop' && 'Desktop mode: Full width responsive rendering'}
            {device === 'tablet' && 'Tablet mode: 768px viewport'}
            {device === 'mobile' && 'Mobile mode: 375px viewport'}
          </span>
          <span className="hm-footer-hint">Press Esc to exit</span>
        </div>
      </div>
    </div>
  )
}
