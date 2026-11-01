import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useState } from 'react'
import { resolveEmbed, PROVIDER_META, type EmbedProvider } from '../lib/embed'
import './Embed.css'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      /** Insert an embed block; optionally seed with a provider hint. */
      insertEmbed: (provider?: EmbedProvider) => ReturnType
    }
  }
}

function EmbedView({ node, updateAttributes, editor }: NodeViewProps) {
  const canEdit = editor.isEditable
  const src = node.attrs.src as string
  const ratio = (node.attrs.ratio as number) || 16 / 9
  const title = (node.attrs.title as string) || 'Embedded content'
  const [url, setUrl] = useState('')
  const [err, setErr] = useState<string | null>(null)

  function load(raw: string) {
    const info = resolveEmbed(raw)
    if (!info) {
      setErr('Unrecognised link. Supported: YouTube, Figma, Loom, Google Maps.')
      return
    }
    setErr(null)
    updateAttributes({ src: info.src, provider: info.provider, ratio: info.ratio ?? 16 / 9, title: info.title })
  }

  if (!src) {
    const meta = PROVIDER_META[(node.attrs.provider as EmbedProvider) || 'generic']
    return (
      <NodeViewWrapper className="embed-block" contentEditable={false}>
        <div className="embed-inline">
          <span className="embed-inline-dot" style={{ color: meta.color }}>{meta.icon}</span>
          <input
            className="embed-inline-input"
            placeholder={meta.placeholder + ' — paste and press Enter'}
            value={url}
            disabled={!canEdit}
            autoFocus
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(url) }}
          />
        </div>
        {err && <div className="embed-err">{err}</div>}
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="embed-block" contentEditable={false}>
      <div className="embed-frame-wrap" style={{ aspectRatio: String(ratio) }}>
        <iframe
          className="embed-frame"
          src={src}
          title={title}
          loading="lazy"
          allow="fullscreen; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </NodeViewWrapper>
  )
}

export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: '' },
      provider: { default: 'generic' },
      ratio: { default: 16 / 9 },
      title: { default: 'Embedded content' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-embed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-embed': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedView)
  },

  addCommands() {
    return {
      insertEmbed:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: {} }),
    }
  },
})
