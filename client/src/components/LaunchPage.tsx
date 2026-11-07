import { useState, useEffect, useRef } from 'react'
import './LaunchPage.css'

type Props = {
  onStartWriting?: () => void
}

type BentoAiMode = 'bullet' | 'crisp' | 'table' | 'diagram'
type FeatureKey = 'collab' | 'ai' | 'mcp' | 'rfc' | 'html' | 'security'
type DeployKey = 'docker' | 'node' | 'ec2'

export default function LaunchPage({ onStartWriting }: Props) {
  // Hero RFC review state toggle
  const [rfcApproved, setRfcApproved] = useState(false)
  const [heroAiMode, setHeroAiMode] = useState<'bulletise' | 'crispise' | 'tabularize' | 'mermaid'>('bulletise')

  // Bento Interactive States
  const [bentoAi, setBentoAi] = useState<BentoAiMode>('bullet')
  const [diagramZoom, setDiagramZoom] = useState(1)
  const [teamEngineers, setTeamEngineers] = useState(50)
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey>('collab')
  const [deployKey, setDeployKey] = useState<DeployKey>('docker')
  const [copiedCmd, setCopiedCmd] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Canvas waveform ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Calculate SaaS savings
  const quipAnnualCost = teamEngineers * 25 * 12
  const devdocsCost = 46
  const annualSavings = quipAnnualCost - devdocsCost

  // Animated CRDT Waveform
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let step = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#10b981'
      for (let x = 0; x < canvas.width; x++) {
        const y = 35 + Math.sin((x + step) * 0.08) * 12 * Math.cos((x + step) * 0.03)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      step += 2
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  // Mouse spotlight tracking on bento cards
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }

  const copyQuickCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedCmd(true)
      setTimeout(() => setCopiedCmd(false), 2000)
    })
  }

  return (
    <div className="launch-root">
      {/* 1. Header */}
      <header className="launch-header">
        <div className="launch-header-inner">
          <div className="launch-brand-group">
            <div className="launch-brand-icon">DD</div>
            <div className="launch-brand-info">
              <div className="launch-brand-top">
                <span className="launch-brand-name">DevDocs</span>
                <span className="launch-sync-pill">
                  <span className="launch-pulse-dot"></span>
                  CRDT Live Sync
                </span>
              </div>
              <span className="launch-sub-label">Open-source collaborative technical docs</span>
            </div>
          </div>

          <div className="launch-nav-actions">
            <a
              className="launch-nav-btn launch-nav-ghost"
              href="https://github.com/KiroAINativeCoder/DXEditor"
              target="_blank"
              rel="noreferrer"
            >
              <svg className="launch-svg-icon" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>

            {onStartWriting ? (
              <button type="button" className="launch-nav-btn launch-nav-primary" onClick={onStartWriting}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                <span>Open Workspace</span>
              </button>
            ) : (
              <a href="/" className="launch-nav-btn launch-nav-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                <span>Open Workspace</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="launch-main">
        <div className="launch-content-container">
          <section className="launch-hero-section">
            <div className="launch-tags-center">
              <span className="launch-tag-blue">Quip Alternative</span>
              <span className="launch-tag-gray">100% Self-Hosted</span>
              <span className="launch-tag-green">Zero Telemetry</span>
              <span className="launch-tag-purple">Native MCP Agent Protocol</span>
            </div>

            <h1 className="launch-hero-title">
              Collaborative docs built for <br />
              <span className="launch-title-gradient">engineering teams &amp; autonomous agents</span>
            </h1>

            <p className="launch-hero-desc">
              High-performance markdown collaborative workspace built on Yjs CRDT, Tiptap, and Postgres RLS.
              Features in-editor AI superpowers, Model Context Protocol (MCP) agents, interactive HTML sandboxes, and Mermaid diagram studios.
            </p>

            <div className="launch-cta-row">
              {onStartWriting ? (
                <button type="button" className="launch-btn-primary" onClick={onStartWriting}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bolt</span>
                  <span>Launch DevDocs Workspace</span>
                </button>
              ) : (
                <a href="/" className="launch-btn-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bolt</span>
                  <span>Launch DevDocs Workspace</span>
                </a>
              )}

              <div className="launch-quick-clone">
                <code>npm run dev</code>
                <button
                  type="button"
                  className="launch-clone-copy"
                  onClick={() => copyQuickCmd('git clone https://github.com/KiroAINativeCoder/DXEditor.git && npm run dev')}
                  title="Copy command"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {copiedCmd ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* Live Interactive Hero Window */}
            <div className="launch-mac-window">
              <div className="launch-window-top">
                <div className="launch-window-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <div className="launch-window-tab-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>article</span>
                  <span>RFC-204-distributed-sync-engine.md</span>
                </div>
                <button
                  type="button"
                  className={`launch-rfc-pill ${rfcApproved ? 'approved' : 'review'}`}
                  onClick={() => setRfcApproved(!rfcApproved)}
                  title="Click to toggle RFC consensus!"
                >
                  <span>{rfcApproved ? '✓' : '⏳'}</span>
                  <span>{rfcApproved ? 'RFC · ACCEPTED (3/3 Consensus)' : 'RFC · IN_REVIEW (2/3 Approved)'}</span>
                </button>
              </div>

              <div className="launch-window-body">
                <div className="launch-window-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="launch-avatars-row">
                      <div className="launch-av blue">SC</div>
                      <div className="launch-av green">AR</div>
                      <div className="launch-av purple">JL</div>
                    </div>
                    <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                      3 peers typing live · <strong style={{ color: '#10b981' }}>11ms CRDT relay</strong>
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>
                    LevelDB Delta Snapshots Active
                  </span>
                </div>

                <div className="launch-ai-shelf">
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>auto_awesome</span>
                    DevDocs AI:
                  </span>
                  <button
                    className={`launch-shelf-btn ${heroAiMode === 'bulletise' ? 'active' : ''}`}
                    onClick={() => setHeroAiMode('bulletise')}
                  >
                    Bulletise Vague
                  </button>
                  <button
                    className={`launch-shelf-btn ${heroAiMode === 'crispise' ? 'active' : ''}`}
                    onClick={() => setHeroAiMode('crispise')}
                  >
                    Crispise (-58%)
                  </button>
                  <button
                    className={`launch-shelf-btn ${heroAiMode === 'tabularize' ? 'active' : ''}`}
                    onClick={() => setHeroAiMode('tabularize')}
                  >
                    Tabularize
                  </button>
                  <button
                    className={`launch-shelf-btn ${heroAiMode === 'mermaid' ? 'active' : ''}`}
                    onClick={() => setHeroAiMode('mermaid')}
                  >
                    Text-to-Mermaid
                  </button>
                </div>

                <div className="launch-hero-editor-box">
                  <div className="launch-caret-badge">Sarah Chen (typing)</div>
                  {heroAiMode === 'bulletise' && (
                    <div>
                      <div style={{ color: '#10b981', fontWeight: 600 }}>✓ Requirement 1: WebSocket packet dispatch p99 &lt; 15ms under 10k rooms.</div>
                      <div style={{ color: '#10b981', fontWeight: 600, marginTop: '4px' }}>✓ Requirement 2: Strict Postgres Row-Level Security on every metadata mutation.</div>
                    </div>
                  )}
                  {heroAiMode === 'crispise' && (
                    <div style={{ color: '#3b82f6', fontWeight: 600 }}>
                      "Adopt Yjs CRDT WebSocket relay. Guarantees deterministic state convergence under 15ms without operational transform complexity."
                    </div>
                  )}
                  {heroAiMode === 'tabularize' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '12px', gap: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#64748b' }}>Target</span>
                      <span style={{ fontWeight: 700, color: '#64748b' }}>Latency</span>
                      <span style={{ fontWeight: 700, color: '#64748b', textAlign: 'right' }}>SLA</span>
                      <span>WebSocket Relay</span>
                      <span style={{ color: '#10b981' }}>11ms</span>
                      <span style={{ color: '#10b981', textAlign: 'right' }}>99.99%</span>
                    </div>
                  )}
                  {heroAiMode === 'mermaid' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                      <span className="launch-node-tag">Client</span>
                      <span style={{ color: '#8b5cf6', fontWeight: 700 }}>➔</span>
                      <span className="launch-node-tag purple">Yjs Collab Relay</span>
                      <span style={{ color: '#8b5cf6', fontWeight: 700 }}>➔</span>
                      <span className="launch-node-tag primary">LevelDB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Interactive Bento Grid */}
          <section className="launch-bento-section">
            <div className="launch-section-heading">
              <span className="launch-pill-subtle">Interactive Bento</span>
              <h2>Engineered like code. Built for teams.</h2>
              <p>Interact with live widgets directly on these tiles. No static mockups.</p>
            </div>

            <div className="launch-bento-grid">
              {/* Card 1: Interactive AI Refactor (Span 8) */}
              <div className="launch-bento-card span-8" onMouseMove={handleMouseMove}>
                <div className="bento-badge-row">
                  <span className="launch-tag-blue">AI Superpowers</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#8b5cf6' }}>Claude 3.5 · Gemini 3.8 · Ollama</span>
                </div>
                <h3>Context-Aware In-Editor Refactoring</h3>
                <p className="launch-bento-desc">Click below to see live transformations stream into the editor:</p>

                <div className="launch-interactive-studio">
                  <div className="launch-ai-tools-row">
                    <button
                      className={`launch-ai-pill ${bentoAi === 'bullet' ? 'active' : ''}`}
                      onClick={() => setBentoAi('bullet')}
                    >
                      ✨ Bulletise Criteria
                    </button>
                    <button
                      className={`launch-ai-pill ${bentoAi === 'crisp' ? 'active' : ''}`}
                      onClick={() => setBentoAi('crisp')}
                    >
                      ⚡ Crispise Prose
                    </button>
                    <button
                      className={`launch-ai-pill ${bentoAi === 'table' ? 'active' : ''}`}
                      onClick={() => setBentoAi('table')}
                    >
                      📊 Tabularize Data
                    </button>
                    <button
                      className={`launch-ai-pill ${bentoAi === 'diagram' ? 'active' : ''}`}
                      onClick={() => setBentoAi('diagram')}
                    >
                      📐 Flowchart
                    </button>
                  </div>
                  <div className="launch-live-box">
                    {bentoAi === 'bullet' && (
                      <div>
                        <div style={{ color: '#10b981', fontWeight: 600 }}>✓ SLA: Auth latency p99 &lt; 45ms under 15,000 req/sec.</div>
                        <div style={{ color: '#10b981', fontWeight: 600, marginTop: '4px' }}>✓ Reliability: PgBouncer connection ceiling fixed at 120 clients.</div>
                        <div style={{ color: '#10b981', fontWeight: 600, marginTop: '4px' }}>✓ Memory: Max heap memory capped at 256MB with leak breaker.</div>
                      </div>
                    )}
                    {bentoAi === 'crisp' && (
                      <div style={{ color: '#3b82f6', fontWeight: 600 }}>
                        "Replace custom syncing logic with Yjs CRDT over WebSockets. Reduces architectural surface area by 70% while guaranteeing conflict-free replica convergence."
                      </div>
                    )}
                    {bentoAi === 'table' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '12px' }}>
                        <span style={{ fontWeight: 700, color: '#64748b' }}>Database</span>
                        <span style={{ fontWeight: 700, color: '#64748b' }}>P99 Latency</span>
                        <span style={{ fontWeight: 700, color: '#64748b', textAlign: 'right' }}>Availability</span>
                        <span>Postgres (RLS)</span>
                        <span style={{ color: '#10b981' }}>14ms</span>
                        <span style={{ color: '#10b981', textAlign: 'right' }}>99.98%</span>
                      </div>
                    )}
                    {bentoAi === 'diagram' && (
                      <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#8b5cf6' }}>
                        graph LR<br/>
                        Auth[REST API] --&gt;|JWT Token| Collab[Yjs Relay]<br/>
                        Collab --&gt;|State Vector| LevelDB[Delta Store]
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: CRDT Latency Visualizer (Span 4) */}
              <div className="launch-bento-card span-4" onMouseMove={handleMouseMove}>
                <div className="bento-badge-row">
                  <span className="launch-tag-green">CRDT Sync</span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>Sub-12ms</span>
                </div>
                <h3>Zero Lost Edits</h3>
                <p className="launch-bento-desc">Mathematical convergence backed by Yjs state vectors and LevelDB snapshots.</p>

                <div className="launch-canvas-box">
                  <canvas ref={canvasRef} width={280} height={70}></canvas>
                </div>
              </div>

              {/* Card 3: MCP Agent Console (Span 6) */}
              <div className="launch-bento-card span-6" onMouseMove={handleMouseMove}>
                <div className="bento-badge-row">
                  <span className="launch-tag-purple">MCP Standard</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>OAuth 2.1 Supported</span>
                </div>
                <h3>Autonomous AI Agent Protocol</h3>
                <p className="launch-bento-desc">Claude Desktop, Cursor, or Antigravity can autonomously inspect, search, and update workspace docs.</p>

                <div className="launch-mcp-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px', marginBottom: '8px' }}>
                    <span style={{ color: '#38bdf8' }}>$ devdocs-mcp-client</span>
                    <span style={{ color: '#10b981' }}>CONNECTED</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>→ Invoking tool:</span> devdocs_search("Postgres RLS pool")<br/>
                    <span style={{ color: '#a78bfa' }}>← Matched 3 docs:</span> RFC-204, DB Runbook, Deployment Topology<br/>
                    <span style={{ color: '#10b981' }}>✓ Auto-synchronized state vector</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Diagramify Studio (Span 6) */}
              <div className="launch-bento-card span-6" onMouseMove={handleMouseMove}>
                <div className="bento-badge-row">
                  <span className="launch-tag-blue">Diagramify Studio</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="launch-ai-pill" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => setDiagramZoom(z => Math.min(2, z + 0.2))}>+ Zoom</button>
                    <button className="launch-ai-pill" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => setDiagramZoom(z => Math.max(0.6, z - 0.2))}>- Zoom</button>
                    <button className="launch-ai-pill" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => setDiagramZoom(1)}>Reset</button>
                  </div>
                </div>
                <h3>Mermaid Vector Flowcharts</h3>
                <p className="launch-bento-desc">Write syntax or let AI diagramify requirements with dark mode theme synchronization.</p>

                <div className="launch-diagram-box">
                  <div style={{ transform: `scale(${diagramZoom})`, transition: 'transform 0.2s' }}>
                    <svg width="320" height="80" viewBox="0 0 320 80">
                      <rect x="10" y="20" width="70" height="40" rx="6" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5"/>
                      <text x="45" y="44" fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="middle">Editor</text>
                      <line x1="80" y1="40" x2="120" y2="40" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3"/>
                      <rect x="120" y="15" width="90" height="50" rx="8" fill="#2563eb" stroke="#60a5fa" strokeWidth="1.5"/>
                      <text x="165" y="44" fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle">Yjs Relay</text>
                      <line x1="210" y1="40" x2="250" y2="40" stroke="#8b5cf6" strokeWidth="1.5"/>
                      <rect x="250" y="20" width="60" height="40" rx="6" fill="#1e293b" stroke="#8b5cf6" strokeWidth="1.5"/>
                      <text x="280" y="44" fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="middle">LevelDB</text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Card 5: Quip vs DevDocs ROI Calculator (Span 12) */}
              <div className="launch-bento-card span-12" onMouseMove={handleMouseMove}>
                <div className="bento-badge-row">
                  <span className="launch-tag-purple">TCO Calculator</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>100% Free &amp; Open Source</span>
                </div>
                <h3>Calculate Your Team's Cost Savings vs. Quip &amp; Notion</h3>
                <p className="launch-bento-desc">Quip charges up to $25/user/month for enterprise workspaces. Move to DevDocs on your own server for virtually $0.</p>

                <div className="launch-roi-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>Engineers on your team:</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6' }}>{teamEngineers} engineers</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="500"
                    value={teamEngineers}
                    className="launch-slider"
                    onChange={(e) => setTeamEngineers(Number(e.target.value))}
                  />

                  <div className="launch-roi-grid">
                    <div className="launch-roi-tile red">
                      <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>Quip Annual SaaS Cost:</span>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444' }}>${quipAnnualCost.toLocaleString()} / yr</div>
                    </div>
                    <div className="launch-roi-tile green">
                      <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>DevDocs Self-Hosted Cost:</span>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>${devdocsCost} / yr <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>(EC2 t3.nano)</span></div>
                    </div>
                    <div className="launch-roi-tile blue">
                      <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 700 }}>Net Annual Savings:</span>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6' }}>${annualSavings.toLocaleString()} saved</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Complete Feature Suite */}
          <section className="launch-pillars-section">
            <div className="launch-section-heading">
              <span className="launch-pill-subtle">Complete Capabilities</span>
              <h2>Everything technical teams demand</h2>
            </div>

            <div className="launch-tabs-bar">
              <button
                className={`launch-tab-chip ${selectedFeature === 'collab' ? 'active' : ''}`}
                onClick={() => setSelectedFeature('collab')}
              >
                1. Multiplayer CRDT
              </button>
              <button
                className={`launch-tab-chip ${selectedFeature === 'ai' ? 'active' : ''}`}
                onClick={() => setSelectedFeature('ai')}
              >
                2. AI Superpowers
              </button>
              <button
                className={`launch-tab-chip ${selectedFeature === 'mcp' ? 'active' : ''}`}
                onClick={() => setSelectedFeature('mcp')}
              >
                3. Model Context Protocol
              </button>
              <button
                className={`launch-tab-chip ${selectedFeature === 'rfc' ? 'active' : ''}`}
                onClick={() => setSelectedFeature('rfc')}
              >
                4. RFC Governance
              </button>
              <button
                className={`launch-tab-chip ${selectedFeature === 'html' ? 'active' : ''}`}
                onClick={() => setSelectedFeature('html')}
              >
                5. Sandboxed HTML
              </button>
              <button
                className={`launch-tab-chip ${selectedFeature === 'security' ? 'active' : ''}`}
                onClick={() => setSelectedFeature('security')}
              >
                6. Postgres RLS
              </button>
            </div>

            <div className="launch-feature-showcase-panel">
              {selectedFeature === 'collab' && (
                <div>
                  <h3>Multiplayer CRDT Collaboration</h3>
                  <p>Built on Yjs and Tiptap. Deterministic convergence guarantees zero lost edits across simultaneous network partitions. Features colored presence carets, sub-15ms WebSocket relay, and LevelDB persistence.</p>
                </div>
              )}
              {selectedFeature === 'ai' && (
                <div>
                  <h3>AI Document Superpowers</h3>
                  <p>Context-aware in-editor transformations: Crispise verbose prose, Bulletise vague requirements, Tabularize text lists, and generate Mermaid flowcharts on demand with streaming feedback.</p>
                </div>
              )}
              {selectedFeature === 'mcp' && (
                <div>
                  <h3>Model Context Protocol (MCP) Server</h3>
                  <p>Native remote MCP server with per-user tokens and OAuth 2.1. Cursor, Claude Desktop, and autonomous agents read and edit docs automatically with full CRUD capabilities.</p>
                </div>
              )}
              {selectedFeature === 'rfc' && (
                <div>
                  <h3>RFC Review &amp; Team Governance</h3>
                  <p>Technical review state machine (DRAFT → IN_REVIEW → ACCEPTED → REJECTED). Assign mandatory teammates, collect review feedback, and enforce sign-offs.</p>
                </div>
              )}
              {selectedFeature === 'html' && (
                <div>
                  <h3>Interactive HTML Sandboxes</h3>
                  <p>Embed responsive mini-apps, KPI cards, and interactive forms directly in markdown documents. Test on Desktop, Tablet, and Mobile viewport modes with live split code view.</p>
                </div>
              )}
              {selectedFeature === 'security' && (
                <div>
                  <h3>Postgres RLS Security</h3>
                  <p>Granular view, edit, and manage roles enforced at the database layer. 100% self-hosted with zero telemetry and S3 object storage for assets.</p>
                </div>
              )}
            </div>
          </section>

          {/* 5. Comparison Matrix */}
          <section className="launch-compare-section">
            <div className="launch-section-heading">
              <span className="launch-pill-subtle">Feature Comparison</span>
              <h2>How DevDocs compares to Quip &amp; Notion</h2>
            </div>

            <div className="launch-table-wrap">
              <table className="launch-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th className="highlight-col">DevDocs</th>
                    <th>Salesforce Quip</th>
                    <th>Notion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>100% Self-Hostable</strong></td>
                    <td className="highlight-col"><span className="text-green">✓ Docker / Cloud</span></td>
                    <td><span className="text-red">✕ SaaS Only</span></td>
                    <td><span className="text-red">✕ Proprietary Cloud</span></td>
                  </tr>
                  <tr>
                    <td><strong>CRDT Conflict-Free Engine</strong></td>
                    <td className="highlight-col"><span className="text-green">✓ Yjs Protocol</span></td>
                    <td><span className="text-green">✓ Yes</span></td>
                    <td><span className="text-red">✕ Block Polling</span></td>
                  </tr>
                  <tr>
                    <td><strong>Model Context Protocol (MCP)</strong></td>
                    <td className="highlight-col"><span className="text-green">✓ Native MCP Server</span></td>
                    <td><span className="text-red">✕ No</span></td>
                    <td><span className="text-red">✕ No</span></td>
                  </tr>
                  <tr>
                    <td><strong>Technical RFC Review Machine</strong></td>
                    <td className="highlight-col"><span className="text-green">✓ Built-in Workflow</span></td>
                    <td><span className="text-red">✕ Manual checkboxes</span></td>
                    <td><span className="text-red">✕ Generic database</span></td>
                  </tr>
                  <tr>
                    <td><strong>Interactive HTML Sandboxes</strong></td>
                    <td className="highlight-col"><span className="text-green">✓ Live micro-apps</span></td>
                    <td><span className="text-red">✕ No</span></td>
                    <td><span className="text-red">✕ Static embeds</span></td>
                  </tr>
                  <tr>
                    <td><strong>Data Sovereignty &amp; Privacy</strong></td>
                    <td className="highlight-col"><span className="text-green">✓ 100% Local / Zero Telemetry</span></td>
                    <td><span className="text-red">✕ Salesforce Cloud</span></td>
                    <td><span className="text-red">✕ Proprietary</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 6. Deploy Section */}
          <section className="launch-deploy-section">
            <div className="launch-section-heading">
              <span className="launch-pill-subtle">Deployment</span>
              <h2>Run your own server in 60 seconds</h2>
            </div>

            <div className="launch-deploy-card">
              <div className="launch-deploy-tabs">
                <button
                  className={`launch-d-tab ${deployKey === 'docker' ? 'active' : ''}`}
                  onClick={() => setDeployKey('docker')}
                >
                  1. Docker Compose
                </button>
                <button
                  className={`launch-d-tab ${deployKey === 'node' ? 'active' : ''}`}
                  onClick={() => setDeployKey('node')}
                >
                  2. Local Node (Dev)
                </button>
                <button
                  className={`launch-d-tab ${deployKey === 'ec2' ? 'active' : ''}`}
                  onClick={() => setDeployKey('ec2')}
                >
                  3. AWS EC2 Provisioning
                </button>
              </div>

              <div className="launch-deploy-body">
                {deployKey === 'docker' && (
                  <pre className="launch-code-block">
                    <code>{`git clone https://github.com/KiroAINativeCoder/DXEditor.git
cd DXEditor
docker compose up -d

# ✓ Ready on http://localhost:5173`}</code>
                  </pre>
                )}
                {deployKey === 'node' && (
                  <pre className="launch-code-block">
                    <code>{`# 1. Install all dependencies
npm run install:all

# 2. Run local Prisma migration (zero-config SQLite)
npm --prefix server exec prisma migrate deploy

# 3. Launch API (:4000), Collab Relay (:4001), and Client (:5173)
npm run dev`}</code>
                  </pre>
                )}
                {deployKey === 'ec2' && (
                  <pre className="launch-code-block">
                    <code>{`# Run automated provisioning on a t3.nano instance (~$3.80/mo)
./deploy/provision-and-deploy.sh`}</code>
                  </pre>
                )}
              </div>
            </div>
          </section>

          {/* 7. FAQ Accordion */}
          <section className="launch-faq-section">
            <div className="launch-section-heading">
              <span className="launch-pill-subtle">FAQ</span>
              <h2>Frequently Asked Questions</h2>
            </div>

            <div className="launch-faq-grid">
              <div className={`launch-faq-item ${openFaq === 0 ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === 0 ? null : 0)}>
                <div className="launch-faq-q">
                  <span>Can I migrate all our documents from Quip?</span>
                  <span>{openFaq === 0 ? '▲' : '▼'}</span>
                </div>
                {openFaq === 0 && (
                  <div className="launch-faq-a">
                    Yes! DevDocs is markdown-native. You can export Quip folders to markdown or HTML and import them directly into DevDocs workspaces.
                  </div>
                )}
              </div>

              <div className={`launch-faq-item ${openFaq === 1 ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}>
                <div className="launch-faq-q">
                  <span>How does the Model Context Protocol (MCP) work?</span>
                  <span>{openFaq === 1 ? '▲' : '▼'}</span>
                </div>
                {openFaq === 1 && (
                  <div className="launch-faq-a">
                    DevDocs runs a remote MCP server. External agents connect via OAuth 2.1 or user API tokens to call read, edit, and search tools directly.
                  </div>
                )}
              </div>

              <div className={`launch-faq-item ${openFaq === 2 ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}>
                <div className="launch-faq-q">
                  <span>Can I run DevDocs completely offline with Ollama?</span>
                  <span>{openFaq === 2 ? '▲' : '▼'}</span>
                </div>
                {openFaq === 2 && (
                  <div className="launch-faq-a">
                    Yes. DevDocs supports custom OpenAI-compatible endpoints including local Ollama. No document contents or prompt vectors ever leave your machine.
                  </div>
                )}
              </div>

              <div className={`launch-faq-item ${openFaq === 3 ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}>
                <div className="launch-faq-q">
                  <span>What database is required for production?</span>
                  <span>{openFaq === 3 ? '▲' : '▼'}</span>
                </div>
                {openFaq === 3 && (
                  <div className="launch-faq-a">
                    For local development, DevDocs uses zero-config SQLite. In production, it connects to PostgreSQL / Supabase with Row-Level Security (RLS).
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 8. Bottom CTA Banner */}
          <div className="launch-ready-banner">
            <div className="launch-ready-bolt-box">
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#ffffff' }}>rocket_launch</span>
            </div>
            <div>
              <h3 className="launch-ready-title">Own your documentation. Zero lock-in.</h3>
              <p className="launch-ready-desc">Sign in and start writing. Your team, your server, your data.</p>
            </div>
            {onStartWriting ? (
              <button type="button" className="launch-ready-btn" onClick={onStartWriting}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bolt</span>
                <span>Open DevDocs</span>
              </button>
            ) : (
              <a href="/" className="launch-ready-btn">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bolt</span>
                <span>Open DevDocs</span>
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
