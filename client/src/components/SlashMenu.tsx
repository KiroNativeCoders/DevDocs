import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Editor, Range } from '@tiptap/core'
import type { SlashItem } from './SlashCommands'
import './SlashMenu.css'

export type SlashMenuRef = { onKeyDown: (e: KeyboardEvent) => boolean }

type Props = {
  items: SlashItem[]
  command: (item: SlashItem) => void
  editor: Editor
  range?: Range
}

const SlashMenu = forwardRef<SlashMenuRef, Props>(({ items, command }, ref) => {
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => setActive(0), [items])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [active])

  useImperativeHandle(ref, () => ({
    onKeyDown: (e: KeyboardEvent) => {
      if (items.length === 0) return false
      if (e.key === 'ArrowDown') { setActive((i) => (i + 1) % items.length); return true }
      if (e.key === 'ArrowUp') { setActive((i) => (i - 1 + items.length) % items.length); return true }
      if (e.key === 'Enter') { command(items[active]); return true }
      return false
    },
  }))

  if (items.length === 0) {
    return <div className="slash-menu"><div className="slash-empty">No matches</div></div>
  }

  // Render grouped, but keep a flat index for keyboard nav.
  let idx = -1
  const groups = Array.from(new Set(items.map((i) => i.group)))

  return (
    <div className="slash-menu" ref={listRef}>
      <div className="slash-filter-hint">Type to filter…</div>
      {groups.map((g) => (
        <div key={g} className="slash-group">
          <div className="slash-group-label">{g}</div>
          {items.filter((i) => i.group === g).map((item) => {
            idx += 1
            const myIdx = idx
            return (
              <button
                key={item.title}
                data-idx={myIdx}
                className={`slash-item${myIdx === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(myIdx)}
                onMouseDown={(e) => { e.preventDefault(); command(item) }}
              >
                <span className="slash-item-icon" style={{ background: item.color }}>{item.icon}</span>
                <span className="slash-item-text">
                  <span className="slash-item-title">{item.title}</span>
                  <span className="slash-item-hint">{item.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
})

SlashMenu.displayName = 'SlashMenu'
export default SlashMenu
