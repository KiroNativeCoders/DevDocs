import { useEffect, useState } from 'react'
import { fetchAnalyticsStats, type AnalyticsStats } from '../lib/analytics'
import './AnalyticsModal.css'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function AnalyticsModal({ isOpen, onClose }: Props) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetchAnalyticsStats()
      .then((data) => setStats(data))
      .finally(() => setLoading(false))
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="analytics-overlay" onClick={onClose}>
      <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <h2>📊 Site Traffic & Daily Visitors</h2>
          <button className="analytics-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="analytics-body">
          {loading && <div className="analytics-empty">Loading visitor metrics…</div>}

          {stats?.warning && (
            <div className="analytics-warning">
              ⚠️ <strong>Database table pending:</strong> {stats.warning}.
              <br />
              Run <code>server/supabase/0011_site_analytics.sql</code> in your Supabase SQL Editor to start logging live visits.
            </div>
          )}

          {stats && (
            <>
              <div className="analytics-cards">
                <div className="analytics-card">
                  <div className="card-label">Today's Visitors (DAU)</div>
                  <div className="card-value">{stats.today.uniqueVisitors}</div>
                </div>
                <div className="analytics-card">
                  <div className="card-label">Today's Page Views</div>
                  <div className="card-value">{stats.today.totalViews}</div>
                </div>
                <div className="analytics-card">
                  <div className="card-label">Total Visits (30 Days)</div>
                  <div className="card-value">{stats.totalRecordedVisits ?? 0}</div>
                </div>
              </div>

              <div className="analytics-section">
                <h3>Daily Visitor Trend</h3>
                {stats.history.length === 0 ? (
                  <div className="analytics-empty">No visits recorded in this period yet.</div>
                ) : (
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="num">Unique Visitors</th>
                        <th className="num">Total Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.history.map((row) => (
                        <tr key={row.date}>
                          <td>{row.date}</td>
                          <td className="num">{row.uniqueVisitors}</td>
                          <td className="num">{row.totalViews}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {stats.topPages && stats.topPages.length > 0 && (
                <div className="analytics-section">
                  <h3>Top Visited Pages</h3>
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Page Path</th>
                        <th className="num">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topPages.map((p) => (
                        <tr key={p.path}>
                          <td><code>{p.path}</code></td>
                          <td className="num">{p.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
