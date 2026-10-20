import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useRef, useState, useCallback } from 'react'
import './HtmlPage.css'

export type HtmlPageSize = 'auto' | 'small' | 'medium' | 'large' | 'full' | 'custom'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    htmlPage: {
      /** Insert an HTML page embed block */
      insertHtmlPage: (options?: {
        html?: string
        src?: string
        title?: string
        size?: HtmlPageSize
        width?: number
        height?: number
      }) => ReturnType
    }
  }
}

export const STARTER_TEMPLATES = [
  {
    id: 'dashboard',
    name: '📊 Dashboard & Metrics',
    description: 'Dark-mode analytics card with KPI widgets and progress bar',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .title {
      font-size: 18px;
      font-weight: 700;
      color: #38bdf8;
    }
    .badge {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 14px;
    }
    .card-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .card-value {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
    }
    .trend {
      font-size: 12px;
      color: #4ade80;
      margin-top: 4px;
      font-weight: 500;
    }
    .progress-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 16px;
    }
    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #334155;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      width: 76%;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">System Performance Status</div>
    <span class="badge">Live Monitoring</span>
  </div>
  <div class="grid">
    <div class="card">
      <div class="card-label">Active Users</div>
      <div class="card-value">24,582</div>
      <div class="trend">↑ +14.2%</div>
    </div>
    <div class="card">
      <div class="card-label">Latency (p99)</div>
      <div class="card-value">38 ms</div>
      <div class="trend">⚡ Optimal</div>
    </div>
    <div class="card">
      <div class="card-label">Uptime SLO</div>
      <div class="card-value">99.98%</div>
      <div class="trend">Target: 99.9%</div>
    </div>
  </div>
  <div class="progress-card">
    <div class="progress-header">
      <span>Resource Utilization</span>
      <strong>76% Used</strong>
    </div>
    <div class="progress-bar"><div class="progress-fill"></div></div>
  </div>
</body>
</html>`,
  },
  {
    id: 'interactive',
    name: '⚡ Interactive Calculator',
    description: 'Working JavaScript form that computes sprint timelines dynamically',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 24px;
    }
    .box {
      max-width: 460px;
      margin: 0 auto;
      background: #ffffff;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    h2 { font-size: 18px; color: #0f172a; margin-bottom: 6px; }
    p { font-size: 13px; color: #64748b; margin-bottom: 18px; }
    label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
    input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 14px;
      background: #fdfdfd;
      outline: none;
    }
    input:focus { border-color: #2563eb; ring: 2px solid #93c5fd; }
    button {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      width: 100%;
      transition: background 0.15s;
    }
    button:hover { background: #1d4ed8; }
    .result {
      margin-top: 16px;
      padding: 14px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.5;
      display: none;
    }
  </style>
</head>
<body>
  <div class="box">
    <h2>Sprint Timeline Estimator</h2>
    <p>Interactive tool to calculate completion sprints.</p>
    <label for="sp">Story Points Total</label>
    <input type="number" id="sp" value="48" min="1" />
    <label for="vel">Velocity (pts / sprint)</label>
    <input type="number" id="vel" value="16" min="1" />
    <button onclick="calculate()">Calculate Delivery Date</button>
    <div id="output" class="result"></div>
  </div>
  <script>
    function calculate() {
      const sp = Number(document.getElementById('sp').value) || 0;
      const vel = Number(document.getElementById('vel').value) || 1;
      const sprints = Math.ceil(sp / vel);
      const weeks = sprints * 2;
      const out = document.getElementById('output');
      out.style.display = 'block';
      out.innerHTML = '<strong>Estimated Timeline:</strong> ' + sprints + ' sprints (' + weeks + ' weeks) to deliver ' + sp + ' points at ' + vel + ' pts/sprint.';
    }
  </script>
</body>
</html>`,
  },
  {
    id: 'hero',
    name: '🎨 Modern Feature Banner',
    description: 'Clean marketing / RFC announcement banner with call to action',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
      color: #ffffff;
      padding: 36px 28px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .pill {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      margin-bottom: 16px;
      display: inline-block;
    }
    h1 { font-size: 26px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.02em; }
    p { font-size: 15px; color: #c7d2fe; max-width: 520px; margin-bottom: 24px; line-height: 1.6; }
    .cta-row { display: flex; gap: 12px; justify-content: center; }
    .btn-primary {
      background: #ffffff;
      color: #312e81;
      padding: 10px 22px;
      border-radius: 8px;
      font-weight: 700;
      text-decoration: none;
      font-size: 14px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="pill">🚀 Feature Preview</div>
  <h1>DevDocs Engine v2.0</h1>
  <p>Real-time collaborative documentation platform with native Markdown, Mermaid diagrams, and embedded interactive HTML pages.</p>
  <div class="cta-row">
    <a href="#" class="btn-primary" onclick="alert('Exploring Docs'); return false;">Explore Docs</a>
    <a href="#" class="btn-secondary" onclick="alert('Viewing Spec'); return false;">View Spec</a>
  </div>
</body>
</html>`,
  },
  {
    id: 'blank',
    name: '📄 HTML5 Boilerplate',
    description: 'Clean responsive boilerplate ready for custom HTML, styles, and scripts',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Custom HTML Page</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 24px;
      background: #ffffff;
      color: #111827;
      line-height: 1.6;
    }
    h1 { color: #1e40af; font-size: 22px; }
  </style>
</head>
<body>
  <h1>Hello from HTML Page</h1>
  <p>You can edit this HTML page, insert custom CSS styling, and run JavaScript scripts directly.</p>
</body>
</html>`,
  },
]

export const DEFAULT_HTML = STARTER_TEMPLATES[0].code

function HtmlPageView({ node, updateAttributes, editor }: NodeViewProps) {
  const html: string = node.attrs.html ?? ''
  const src: string = node.attrs.src ?? ''
  const title: string = node.attrs.title || 'HTML Page'
  const size: HtmlPageSize = node.attrs.size || 'full'
  const width: number = typeof node.attrs.width === 'number' ? node.attrs.width : 0
  const height: number = typeof node.attrs.height === 'number' ? node.attrs.height : 400

  const [viewMode, setViewMode] = useState<'preview' | 'split' | 'code'>(() => {
    return !html.trim() && !src.trim() ? 'code' : 'preview'
  })
  const [draftHtml, setDraftHtml] = useState(html)
  const [draftSrc, setDraftSrc] = useState(src)
  const [draftTitle, setDraftTitle] = useState(title)
  const [activeTab, setActiveTab] = useState<'code' | 'url' | 'template'>('code')

  const [isResizingHeight, setIsResizingHeight] = useState(false)
  const [isResizingWidth, setIsResizingWidth] = useState(false)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const [dragWidth, setDragWidth] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canEdit = editor.isEditable

  const [prevHtml, setPrevHtml] = useState(html)
  if (prevHtml !== html) {
    setPrevHtml(html)
    setDraftHtml(html)
  }

  const [prevSrc, setPrevSrc] = useState(src)
  if (prevSrc !== src) {
    setPrevSrc(src)
    setDraftSrc(src)
  }

  const [prevTitle, setPrevTitle] = useState(title)
  if (prevTitle !== title) {
    setPrevTitle(title)
    setDraftTitle(title)
  }

  const saveContent = useCallback(() => {
    updateAttributes({
      html: draftHtml,
      src: draftSrc,
      title: draftTitle,
    })
    setViewMode('preview')
  }, [draftHtml, draftSrc, draftTitle, updateAttributes])

  const handleSelectTemplate = (templateCode: string, templateTitle: string) => {
    setDraftHtml(templateCode)
    setDraftSrc('')
    setDraftTitle(templateTitle.replace(/^[^\w\s]+\s*/, ''))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content === 'string') {
        setDraftHtml(content)
        setDraftSrc('')
        setDraftTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Vertical resize handle (height)
  const handleHeightResizeStart = (e: React.MouseEvent) => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizingHeight(true)

    const startY = e.clientY
    const initialHeight = height

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      const clampedHeight = Math.round(Math.max(160, Math.min(1200, initialHeight + deltaY)))
      setDragHeight(clampedHeight)
    }

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setIsResizingHeight(false)
      const deltaY = upEvent.clientY - startY
      const finalHeight = Math.round(Math.max(160, Math.min(1200, initialHeight + deltaY)))
      setDragHeight(null)
      updateAttributes({ height: finalHeight })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Horizontal resize handle (width)
  const handleWidthResizeStart = (e: React.MouseEvent) => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizingWidth(true)

    const startX = e.clientX
    const startRect = containerRef.current?.getBoundingClientRect()
    const initialWidth = startRect ? startRect.width : 760

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) * 2
      const clampedWidth = Math.round(Math.max(340, Math.min(1280, initialWidth + deltaX)))
      setDragWidth(clampedWidth)
    }

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setIsResizingWidth(false)
      const deltaX = (upEvent.clientX - startX) * 2
      const finalWidth = Math.round(Math.max(340, Math.min(1280, initialWidth + deltaX)))
      setDragWidth(null)
      updateAttributes({ size: 'custom', width: finalWidth })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const currentHeight = dragHeight ?? height

  let targetWidth: string | undefined
  if (dragWidth) {
    targetWidth = `${dragWidth}px`
  } else if (size === 'custom' && width) {
    targetWidth = `${width}px`
  } else if (size === 'small') {
    targetWidth = '480px'
  } else if (size === 'medium') {
    targetWidth = '720px'
  } else if (size === 'large') {
    targetWidth = '960px'
  } else if (size === 'full') {
    targetWidth = '100%'
  } else {
    targetWidth = '100%'
  }

  const isEmpty = !html.trim() && !src.trim()
  const hasContent = !isEmpty

  return (
    <NodeViewWrapper className="html-page-block" contentEditable={false}>
      <div
        ref={containerRef}
        className={`html-page-card size-${size} ${isResizingHeight || isResizingWidth ? 'is-resizing' : ''}`}
        style={{ width: targetWidth || '100%', maxWidth: '100%' }}
      >
        {/* Floating Edit Controls - only option shown on rendered HTML page */}
        {viewMode === 'preview' && canEdit && hasContent && (
          <div className="html-page-floating-controls">
            <span className="html-page-floating-drag" data-drag-handle title="Drag to move HTML page">
              ⠿
            </span>
            <button
              type="button"
              className="html-page-floating-edit-btn"
              onClick={() => setViewMode('code')}
              title="Edit HTML page"
              aria-label="Edit"
            >
              ✎
            </button>
          </div>
        )}

        {/* Card Body Area */}
        <div className="html-page-body" style={{ height: `${currentHeight}px` }}>
          {/* Active resizing / dragging overlay to prevent iframe stealing mouse events */}
          {(isResizingHeight || isResizingWidth) && <div className="html-page-resizing-shield" />}

          {/* Mode 1: Code / Configuration Editor */}
          {viewMode === 'code' && (
            <div className="html-editor-panel">
              <div className="html-editor-tabs-bar">
                <div className="html-tabs-left">
                  <button
                    type="button"
                    className={`html-tab-btn ${activeTab === 'code' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('code')}
                  >
                    HTML Source
                  </button>
                  <button
                    type="button"
                    className={`html-tab-btn ${activeTab === 'template' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('template')}
                  >
                    ⚡ Starter Templates
                  </button>
                  <button
                    type="button"
                    className={`html-tab-btn ${activeTab === 'url' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('url')}
                  >
                    🔗 URL Embed
                  </button>
                </div>

                <div className="html-tabs-right">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,text/html"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    className="html-upload-file-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload an .html file from your computer"
                  >
                    📁 Upload .html file
                  </button>
                </div>
              </div>

              {activeTab === 'code' && (
                <div className="html-code-pane">
                  <div className="html-code-inputs-row">
                    <label className="html-field-label">
                      Page Title:
                      <input
                        type="text"
                        className="html-title-input"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        placeholder="e.g. System Performance Report"
                      />
                    </label>
                  </div>
                  <textarea
                    className="html-code-textarea"
                    value={draftHtml}
                    onChange={(e) => setDraftHtml(e.target.value)}
                    placeholder="Enter or paste <!DOCTYPE html><html>...</html> or HTML snippet here..."
                    spellCheck={false}
                  />
                </div>
              )}

              {activeTab === 'template' && (
                <div className="html-templates-pane">
                  <div className="html-templates-intro">
                    Select a ready-to-use responsive template to jumpstart your embedded page:
                  </div>
                  <div className="html-templates-grid">
                    {STARTER_TEMPLATES.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className="html-template-item"
                        onClick={() => {
                          handleSelectTemplate(tmpl.code, tmpl.name)
                          setActiveTab('code')
                        }}
                      >
                        <div className="html-tmpl-name">{tmpl.name}</div>
                        <div className="html-tmpl-desc">{tmpl.description}</div>
                        <button type="button" className="html-tmpl-use-btn">
                          Use This Template
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'url' && (
                <div className="html-url-pane">
                  <label className="html-field-label">
                    Page Title:
                    <input
                      type="text"
                      className="html-title-input"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="e.g. Documentation Hub"
                    />
                  </label>
                  <label className="html-field-label" style={{ marginTop: '12px' }}>
                    HTML Page URL:
                    <input
                      type="url"
                      className="html-url-input"
                      value={draftSrc}
                      onChange={(e) => setDraftSrc(e.target.value)}
                      placeholder="https://example.com/interactive-widget"
                    />
                  </label>
                  <p className="html-url-hint">
                    Embed any responsive web page or prototype accessible via HTTPS.
                  </p>
                </div>
              )}

              <div className="html-editor-actions">
                <button
                  type="button"
                  className="html-btn primary"
                  onClick={saveContent}
                  disabled={!draftHtml.trim() && !draftSrc.trim()}
                >
                  Render HTML Page
                </button>
                {hasContent && (
                  <button
                    type="button"
                    className="html-btn"
                    onClick={() => {
                      setDraftHtml(html)
                      setDraftSrc(src)
                      setDraftTitle(title)
                      setViewMode('preview')
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mode 2: Split (Code + Live Preview) */}
          {viewMode === 'split' && (
            <div className="html-split-container">
              <div className="html-split-editor">
                <div className="html-split-editor-bar">
                  <span>HTML Source (Live)</span>
                  <button
                    type="button"
                    className="html-split-save-btn"
                    onClick={() => updateAttributes({ html: draftHtml })}
                  >
                    Apply Changes
                  </button>
                </div>
                <textarea
                  className="html-split-textarea"
                  value={draftHtml}
                  onChange={(e) => setDraftHtml(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div className="html-split-preview">
                <iframe
                  key="split-frame"
                  className="html-page-iframe"
                  title={title}
                  srcDoc={draftHtml || html}
                  sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                />
              </div>
            </div>
          )}

          {/* Mode 3: Preview */}
          {viewMode === 'preview' && (
            <>
              {isEmpty ? (
                <div className="html-empty-placeholder">
                  <div className="html-empty-icon">🌐</div>
                  <div className="html-empty-title">Empty HTML Page</div>
                  <p className="html-empty-desc">
                    Insert HTML code, choose a starter template, or embed a web page URL.
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      className="html-btn primary"
                      onClick={() => setViewMode('code')}
                    >
                      Configure HTML Page
                    </button>
                  )}
                </div>
              ) : (
                <iframe
                  key="preview-frame"
                  className="html-page-iframe"
                  title={title}
                  src={src || undefined}
                  srcDoc={!src ? html : undefined}
                  sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                />
              )}
            </>
          )}

          {/* Horizontal Resize Handle (Right) */}
          {canEdit && (
            <div
              className="html-resize-handle-x"
              onMouseDown={handleWidthResizeStart}
              title="Drag horizontally to resize width"
            >
              <div className="html-resize-handle-x-bar" />
            </div>
          )}
        </div>

        {/* Bottom Resize Handle (Height) */}
        {canEdit && (
          <div
            className="html-resize-handle-y"
            onMouseDown={handleHeightResizeStart}
            title="Drag vertically to resize height"
          >
            <div className="html-resize-handle-y-bar" />
            <span className="html-resize-badge">{currentHeight}px</span>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const HtmlPageNode = Node.create({
  name: 'htmlPage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      html: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-html') || '',
        renderHTML: (attrs) => ({ 'data-html': attrs.html || '' }),
      },
      src: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-src') || '',
        renderHTML: (attrs) => (attrs.src ? { 'data-src': attrs.src } : {}),
      },
      title: {
        default: 'HTML Page',
        parseHTML: (el) => el.getAttribute('data-title') || 'HTML Page',
        renderHTML: (attrs) => ({ 'data-title': attrs.title || 'HTML Page' }),
      },
      size: {
        default: 'full',
        parseHTML: (el) => (el.getAttribute('data-size') as HtmlPageSize) || 'full',
        renderHTML: (attrs) => ({ 'data-size': attrs.size || 'full' }),
      },
      width: {
        default: 0,
        parseHTML: (el) => {
          const val = el.getAttribute('data-width')
          return val ? parseInt(val, 10) : 0
        },
        renderHTML: (attrs) => (attrs.width ? { 'data-width': String(attrs.width) } : {}),
      },
      height: {
        default: 400,
        parseHTML: (el) => {
          const val = el.getAttribute('data-height')
          return val ? parseInt(val, 10) : 400
        },
        renderHTML: (attrs) => (attrs.height ? { 'data-height': String(attrs.height) } : { 'data-height': '400' }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="html-page"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'html-page' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(HtmlPageView)
  },

  addCommands() {
    return {
      insertHtmlPage:
        (options?: {
          html?: string
          src?: string
          title?: string
          size?: HtmlPageSize
          width?: number
          height?: number
        }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              html: options?.html ?? DEFAULT_HTML,
              src: options?.src ?? '',
              title: options?.title ?? 'Interactive HTML Page',
              size: options?.size ?? 'full',
              width: options?.width ?? 0,
              height: options?.height ?? 400,
            },
          }),
    }
  },
})
