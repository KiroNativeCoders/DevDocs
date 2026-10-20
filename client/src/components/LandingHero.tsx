import './LandingHero.css'

type Props = {
  onNewDoc: () => void
}

export default function LandingHero({ onNewDoc }: Props) {
  return (
    <div className="landing-container">
      {/* 1. Spec & Sync status card */}
      <div className="landing-status-bar">
        <div className="landing-status-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span className="landing-spec-badge">Spec v2.4</span>
            <h2 className="landing-status-title">Acme Core Arch &amp; Sync Engine</h2>
          </div>
          <span className="landing-yjs-pill">
            <span className="landing-pulse-dot"></span> Yjs Active
          </span>
        </div>
        <div className="landing-status-bottom">
          <div className="landing-avatars">
            <div className="landing-avatar landing-avatar-blue" title="Sarah Chen">SC</div>
            <div className="landing-avatar landing-avatar-green" title="Mark Ruiz">MR</div>
            <div className="landing-avatar landing-avatar-amber" title="Alice Kim">AK</div>
            <div className="landing-avatar landing-avatar-more">+3</div>
          </div>
          <div className="landing-rls-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#10b981' }}>
              verified_user
            </span>
            <span>Postgres RLS Enforced</span>
          </div>
        </div>
      </div>

      {/* 2. Hero banner */}
      <div className="landing-hero-card">
        <div className="landing-hero-glow"></div>
        <div className="landing-pill-group">
          <span className="landing-pill-primary">Quip Alternative</span>
          <span className="landing-pill-subtle">100% Self-Hosted</span>
          <span className="landing-pill-green">Zero Telemetry</span>
        </div>
        <div>
          <h1 className="landing-hero-title">
            Own your docs.<br />Zero vendor lock-in.
          </h1>
          <p className="landing-hero-desc">
            High-performance markdown collaborative workspace built on Yjs, Tiptap, and Supabase with strict Postgres RLS.
          </p>
        </div>
        <div className="landing-hero-actions">
          <button type="button" className="landing-btn-primary" onClick={onNewDoc}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
            New Doc
          </button>
          <a
            className="landing-btn-secondary"
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
          >
            <svg style={{ width: '16px', height: '16px', fill: 'currentColor' }} viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View on GitHub
          </a>
        </div>
      </div>

      {/* 3. AI Document Superpowers */}
      <div className="landing-ai-section">
        <div className="landing-ai-header">
          <h2 className="landing-section-heading">
            <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: '20px' }}>
              auto_awesome
            </span>
            AI Document Superpowers
          </h2>
          <span className="landing-model-pill">
            <span className="landing-pulse-dot" style={{ background: '#7c3aed' }}></span>
            Claude 3.5 Sonnet
          </span>
        </div>
        <p className="landing-section-sub">
          Context-aware in-editor transformations running via your own BYO key or local Ollama.
        </p>

        <div className="landing-grid-2">
          {/* Superpower 1 */}
          <div className="landing-feature-card">
            <div className="landing-feature-top">
              <div className="landing-feature-icon-row">
                <div className="landing-icon-box landing-icon-blue">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>format_list_bulleted</span>
                </div>
                <span className="landing-badge-chip landing-badge-blue">+98% Clarity</span>
              </div>
              <div>
                <h3 className="landing-feature-title">Bulletise Vague</h3>
                <p className="landing-feature-desc">Converts rambling prose to verifiable criteria.</p>
              </div>
            </div>
            <div className="landing-preview-box" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '10.5px' }}>
                "System should be fast and handle lots of users"
              </div>
              <div style={{ color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px', color: '#004ac6' }}>
                  p99 &lt; 50ms under 10k req/s
                </span>
              </div>
            </div>
          </div>

          {/* Superpower 2 */}
          <div className="landing-feature-card">
            <div className="landing-feature-top">
              <div className="landing-feature-icon-row">
                <div className="landing-icon-box landing-icon-emerald">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>compress</span>
                </div>
                <span className="landing-badge-chip landing-badge-emerald">-52% Words</span>
              </div>
              <div>
                <h3 className="landing-feature-title">Crispise Prose</h3>
                <p className="landing-feature-desc">Shrinks fluff while amplifying technical impact.</p>
              </div>
            </div>
            <div className="landing-preview-box" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Compacted Result
              </span>
              <div style={{ color: '#0f172a', fontWeight: 500, fontSize: '10.5px' }}>
                "Turned 140-word spec intro into 2 dense, precise requirements."
              </div>
            </div>
          </div>

          {/* Superpower 3 */}
          <div className="landing-feature-card">
            <div className="landing-feature-top">
              <div className="landing-feature-icon-row">
                <div className="landing-icon-box landing-icon-indigo">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>table_chart</span>
                </div>
                <span className="landing-badge-chip landing-badge-indigo">Markdown Matrix</span>
              </div>
              <div>
                <h3 className="landing-feature-title">Tabularize Data</h3>
                <p className="landing-feature-desc">Transforms unstructured lists into structured markdown tables.</p>
              </div>
            </div>
            <div className="landing-preview-box" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '9.5px', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(226, 232, 240, 0.7)', paddingBottom: '3px' }}>
                <span>Service</span>
                <span>Latency</span>
                <span style={{ textAlign: 'right' }}>Status</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', paddingTop: '3px', color: '#0f172a' }}>
                <span>Yjs Sync</span>
                <span style={{ color: '#10b981' }}>14ms</span>
                <span style={{ textAlign: 'right', color: '#10b981', fontWeight: 700 }}>99.9%</span>
              </div>
            </div>
          </div>

          {/* Superpower 4 */}
          <div className="landing-feature-card">
            <div className="landing-feature-top">
              <div className="landing-feature-icon-row">
                <div className="landing-icon-box landing-icon-purple">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schema</span>
                </div>
                <span className="landing-badge-chip landing-badge-purple">Live Diagrams</span>
              </div>
              <div>
                <h3 className="landing-feature-title">Text-to-Mermaid</h3>
                <p className="landing-feature-desc">Converts prose workflows into auto-rendering vector syntax.</p>
              </div>
            </div>
            <div className="landing-preview-box" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>
              <span style={{ padding: '2px 6px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>Auth</span>
              <span style={{ color: '#7c3aed', fontWeight: 700 }}>➔</span>
              <span style={{ padding: '2px 6px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>Sync</span>
              <span style={{ color: '#7c3aed', fontWeight: 700 }}>➔</span>
              <span style={{ padding: '2px 6px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>DB</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Feature Highlights */}
      <div className="landing-ai-section">
        <div>
          <h2 className="landing-section-heading">
            <span className="material-symbols-outlined" style={{ color: '#004ac6', fontSize: '20px' }}>
              layers
            </span>
            Everything you expect from a modern doc tool
          </h2>
          <p className="landing-section-sub">Built on Yjs, Tiptap and Supabase. No vendor lock-in.</p>
        </div>

        <div className="landing-grid-2">
          {/* Highlight 1 */}
          <div className="landing-feature-card">
            <div className="landing-icon-box landing-icon-blue">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>groups</span>
            </div>
            <div>
              <h3 className="landing-feature-title">Real-time collaboration</h3>
              <p className="landing-feature-desc">Multiple people editing live with presence cursors. CRDT-backed via Yjs, zero lost edits.</p>
            </div>
          </div>

          {/* Highlight 2 */}
          <div className="landing-feature-card">
            <div className="landing-icon-box landing-icon-amber">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat_bubble</span>
            </div>
            <div>
              <h3 className="landing-feature-title">Inline comments</h3>
              <p className="landing-feature-desc">Select text, start a thread, reply, and archive. Reopen discussions anytime with 1-click.</p>
            </div>
          </div>

          {/* Highlight 3 */}
          <div className="landing-feature-card">
            <div className="landing-icon-box landing-icon-slate">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
            </div>
            <div>
              <h3 className="landing-feature-title">Version history</h3>
              <p className="landing-feature-desc">Snapshot docs and restore earlier versions. True byte revert, not just a diff view.</p>
            </div>
          </div>

          {/* Highlight 4 */}
          <div className="landing-feature-card">
            <div className="landing-icon-box landing-icon-purple">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_tree</span>
            </div>
            <div>
              <h3 className="landing-feature-title">Mermaid diagrams</h3>
              <p className="landing-feature-desc">Write syntax for live flowcharts, sequence diagrams, and architecture graphs right in the doc.</p>
            </div>
          </div>

          {/* Highlight 5 */}
          <div className="landing-feature-card">
            <div className="landing-icon-box landing-icon-teal">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>image</span>
            </div>
            <div>
              <h3 className="landing-feature-title">Fast image storage</h3>
              <p className="landing-feature-desc">Drag, drop or paste screenshots. Backed by S3 object storage for lightweight docs.</p>
            </div>
          </div>

          {/* Highlight 6 */}
          <div className="landing-feature-card">
            <div className="landing-icon-box landing-icon-emerald">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock</span>
            </div>
            <div>
              <h3 className="landing-feature-title">Sharing &amp; permissions</h3>
              <p className="landing-feature-desc">Granular view, edit, manage roles enforced end-to-end by Supabase Row-Level Security.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Ready CTA */}
      <div className="landing-cta-card">
        <div className="landing-cta-icon">
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#ffffff' }}>bolt</span>
        </div>
        <div>
          <h3 className="landing-cta-title">Ready when you are</h3>
          <p className="landing-cta-desc">Sign in and start writing. Your team, your server, your data.</p>
        </div>
        <button type="button" className="landing-cta-btn" onClick={onNewDoc}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>rocket_launch</span>
          Open DevDocs
        </button>
      </div>
    </div>
  )
}
