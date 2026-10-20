import './LaunchPage.css'

type Props = {
  onStartWriting?: () => void
}

export default function LaunchPage({ onStartWriting }: Props) {
  return (
    <div className="launch-root">
      {/* Main Body */}
      <main className="launch-main">
        <div className="launch-content-container">
          {/* Hero Banner Card */}
          <div className="launch-hero-card">
            <div className="launch-hero-glow"></div>
            <div className="launch-tags-center">
              <span className="launch-tag-blue">Quip Alternative</span>
              <span className="launch-tag-gray">100% Self-Hosted</span>
              <span className="launch-tag-green">Zero Telemetry</span>
            </div>
            <div className="launch-hero-text-wrap">
              <h1 className="launch-hero-main-title">
                Own your docs.<br />Zero vendor lock-in.
              </h1>
              <p className="launch-hero-paragraph">
                High-performance markdown collaborative workspace built on Yjs, Tiptap, and Supabase with strict Postgres RLS.
              </p>
            </div>
            <div className="launch-hero-btn-row">
              {onStartWriting ? (
                <button type="button" className="launch-btn-primary-action" onClick={onStartWriting}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>add_circle</span>
                  New Doc
                </button>
              ) : (
                <a href="/" className="launch-btn-primary-action">
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>add_circle</span>
                  New Doc
                </a>
              )}
              <a
                className="launch-btn-secondary-action"
                href="https://github.com"
                rel="noreferrer"
                target="_blank"
              >
                <svg style={{ width: '16px', height: '16px', fill: 'currentColor', color: '#64748b' }} viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>

          {/* AI Document Superpowers */}
          <div className="launch-ai-section">
            <div className="launch-ai-topbar">
              <div className="launch-ai-title-wrap">
                <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: '20px' }}>
                  auto_awesome
                </span>
                <h2 className="launch-ai-heading">AI Document Superpowers</h2>
              </div>
              <div className="launch-ai-model-chip">
                <span className="launch-pulse-dot" style={{ background: '#7c3aed' }}></span>
                Claude 3.5 Sonnet
              </div>
            </div>
            <p className="launch-ai-subtitle">
              Context-aware in-editor transformations running via your own BYO key or local Ollama.
            </p>
            <div className="launch-grid-cards">
              {/* Feature 1 */}
              <div className="launch-power-card">
                <div className="launch-power-top">
                  <div className="launch-power-icon-row">
                    <div className="launch-sq-icon launch-sq-blue">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>format_list_bulleted</span>
                    </div>
                    <span className="launch-chip-tag launch-chip-blue">+98% Clarity</span>
                  </div>
                  <div>
                    <h3 className="launch-power-title">Bulletise Vague</h3>
                    <p className="launch-power-desc">Converts rambling prose to verifiable criteria.</p>
                  </div>
                </div>
                <div className="launch-power-preview">
                  <div style={{ color: '#64748b', textDecoration: 'line-through', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "System should be fast and handle lots of users"
                  </div>
                  <div style={{ color: '#0f172a', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#004ac6' }}>
                      p99 &lt; 50ms under 10k req/s
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="launch-power-card">
                <div className="launch-power-top">
                  <div className="launch-power-icon-row">
                    <div className="launch-sq-icon launch-sq-emerald">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>compress</span>
                    </div>
                    <span className="launch-chip-tag launch-chip-emerald">-52% Words</span>
                  </div>
                  <div>
                    <h3 className="launch-power-title">Crispise Prose</h3>
                    <p className="launch-power-desc">Shrinks fluff while amplifying technical impact.</p>
                  </div>
                </div>
                <div className="launch-power-preview">
                  <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Compacted Result
                  </span>
                  <div style={{ color: '#0f172a', fontWeight: 500, lineHeight: 1.3 }}>
                    "Turned 140-word spec intro into 2 dense, precise requirements."
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="launch-power-card">
                <div className="launch-power-top">
                  <div className="launch-power-icon-row">
                    <div className="launch-sq-icon launch-sq-indigo">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>table_chart</span>
                    </div>
                    <span className="launch-chip-tag launch-chip-indigo">Markdown Matrix</span>
                  </div>
                  <div>
                    <h3 className="launch-power-title">Tabularize Data</h3>
                    <p className="launch-power-desc">Transforms unstructured lists into structured markdown tables.</p>
                  </div>
                </div>
                <div className="launch-power-preview" style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontWeight: 600, fontSize: '9px', color: '#64748b', borderBottom: '1px solid rgba(226, 232, 240, 0.7)', paddingBottom: '4px' }}>
                    <span>Service</span>
                    <span>Latency</span>
                    <span style={{ textAlign: 'right' }}>Status</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '10px', paddingTop: '4px', color: '#0f172a', fontFamily: 'JetBrains Mono, monospace' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Yjs Sync</span>
                    <span style={{ color: '#10b981' }}>14ms</span>
                    <span style={{ textAlign: 'right', color: '#10b981', fontWeight: 700 }}>99.9%</span>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="launch-power-card">
                <div className="launch-power-top">
                  <div className="launch-power-icon-row">
                    <div className="launch-sq-icon launch-sq-purple">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schema</span>
                    </div>
                    <span className="launch-chip-tag launch-chip-purple">Live Diagrams</span>
                  </div>
                  <div>
                    <h3 className="launch-power-title">Text-to-Mermaid</h3>
                    <p className="launch-power-desc">Converts prose workflows into auto-rendering vector syntax.</p>
                  </div>
                </div>
                <div className="launch-power-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0f172a', fontWeight: 600 }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#ffffff', border: '1px solid #e2e8f0' }}>Auth</span>
                    <span style={{ color: '#7c3aed' }}>➔</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#ffffff', border: '1px solid #e2e8f0' }}>Sync</span>
                    <span style={{ color: '#7c3aed' }}>➔</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#ffffff', border: '1px solid #e2e8f0' }}>DB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Everything you expect */}
          <div className="launch-expected-section">
            <div className="launch-expected-header">
              <h2 className="launch-expected-title">
                <span className="material-symbols-outlined" style={{ color: '#004ac6', fontSize: '20px' }}>layers</span>
                Everything you expect from a modern doc tool
              </h2>
              <p className="launch-expected-sub">Built on Yjs, Tiptap and Supabase. No vendor lock-in.</p>
            </div>
            <div className="launch-grid-cards">
              <div className="launch-doc-feat-card">
                <div className="launch-sq-icon launch-sq-blue">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>groups</span>
                </div>
                <div className="launch-feat-text-block">
                  <h3 className="launch-feat-h3">Real-time collaboration</h3>
                  <p className="launch-feat-p">Multiple people editing live with presence cursors. CRDT-backed via Yjs, zero lost edits.</p>
                </div>
              </div>

              <div className="launch-doc-feat-card">
                <div className="launch-sq-icon launch-sq-amber">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat_bubble</span>
                </div>
                <div className="launch-feat-text-block">
                  <h3 className="launch-feat-h3">Inline comments</h3>
                  <p className="launch-feat-p">Select text, start a thread, reply, and archive. Reopen discussions anytime with 1-click.</p>
                </div>
              </div>

              <div className="launch-doc-feat-card">
                <div className="launch-sq-icon launch-sq-slate">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
                </div>
                <div className="launch-feat-text-block">
                  <h3 className="launch-feat-h3">Version history</h3>
                  <p className="launch-feat-p">Snapshot docs and restore earlier versions. True byte revert, not just a diff view.</p>
                </div>
              </div>

              <div className="launch-doc-feat-card">
                <div className="launch-sq-icon launch-sq-purple">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_tree</span>
                </div>
                <div className="launch-feat-text-block">
                  <h3 className="launch-feat-h3">Mermaid diagrams</h3>
                  <p className="launch-feat-p">Write syntax for live flowcharts, sequence diagrams, and architecture graphs right in the doc.</p>
                </div>
              </div>

              <div className="launch-doc-feat-card">
                <div className="launch-sq-icon launch-sq-teal">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>image</span>
                </div>
                <div className="launch-feat-text-block">
                  <h3 className="launch-feat-h3">Fast image storage</h3>
                  <p className="launch-feat-p">Drag, drop or paste screenshots. Backed by S3 object storage for lightweight docs.</p>
                </div>
              </div>

              <div className="launch-doc-feat-card">
                <div className="launch-sq-icon launch-sq-emerald">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock</span>
                </div>
                <div className="launch-feat-text-block">
                  <h3 className="launch-feat-h3">Sharing &amp; permissions</h3>
                  <p className="launch-feat-p">Granular view, edit, manage roles enforced end-to-end by Supabase Row-Level Security.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ready when you are */}
          <div className="launch-ready-banner">
            <div className="launch-ready-bolt-box">
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#ffffff' }}>bolt</span>
            </div>
            <div>
              <h3 className="launch-ready-title">Ready when you are</h3>
              <p className="launch-ready-desc">Sign in and start writing. Your team, your server, your data.</p>
            </div>
            {onStartWriting ? (
              <button type="button" className="launch-ready-btn" onClick={onStartWriting}>
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>rocket_launch</span>
                Open DevDocs
              </button>
            ) : (
              <a href="/" className="launch-ready-btn">
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>rocket_launch</span>
                Open DevDocs
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
