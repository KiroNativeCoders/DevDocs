import { useEffect } from 'react'
import './ExcalidrawModal.css'

type Props = {
  url: string
  title?: string
  onClose: () => void
}

export default function ExcalidrawModal({ url, title = 'Excalidraw Drawing', onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const openInNewTab = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="excalidraw-modal-backdrop" onClick={onClose}>
      <div
        className="excalidraw-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Excalidraw Fullscreen Viewer"
      >
        <div className="excalidraw-modal-header">
          <div className="em-header-left">
            <span className="em-header-icon">🎨</span>
            <span className="em-header-title">{title}</span>
          </div>

          <div className="em-header-right">
            <button
              type="button"
              className="em-action-btn"
              onClick={openInNewTab}
              title="Open drawing in Excalidraw"
            >
              ↗ Open on Excalidraw.com
            </button>
            <button
              type="button"
              className="em-close-btn"
              onClick={onClose}
              title="Close fullscreen (Esc)"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="excalidraw-modal-viewport">
          <iframe
            className="em-iframe"
            src={url}
            title={title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </div>
  )
}
