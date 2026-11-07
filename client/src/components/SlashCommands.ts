import { Extension, type Editor, type Range } from '@tiptap/core'
import { Suggestion } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { ReactRenderer } from '@tiptap/react'
import { computePosition, flip, shift, offset } from '@floating-ui/dom'
import SlashMenu, { type SlashMenuRef } from './SlashMenu'
import type { EmbedProvider } from '../lib/embed'

export type SlashItem = {
  title: string
  hint: string
  group: string
  keywords: string
  icon: string
  color: string
  run: (editor: Editor, range: Range) => void
}

// Replace the "/query" range, then run the action.
function apply(editor: Editor, range: Range, fn: (c: ReturnType<Editor['chain']>) => void) {
  const chain = editor.chain().focus().deleteRange(range)
  fn(chain)
  chain.run()
}

export const SLASH_ITEMS: SlashItem[] = [
  { title: 'Heading 1', hint: 'Big section title', group: 'Basic', keywords: 'h1 title heading', icon: 'H1', color: '#64748b',
    run: (e, r) => apply(e, r, (c) => c.setHeading({ level: 1 })) },
  { title: 'Heading 2', hint: 'Medium heading', group: 'Basic', keywords: 'h2 heading subtitle', icon: 'H2', color: '#64748b',
    run: (e, r) => apply(e, r, (c) => c.setHeading({ level: 2 })) },
  { title: 'Heading 3', hint: 'Small heading', group: 'Basic', keywords: 'h3 heading', icon: 'H3', color: '#64748b',
    run: (e, r) => apply(e, r, (c) => c.setHeading({ level: 3 })) },
  { title: 'Bullet list', hint: 'Unordered list', group: 'Basic', keywords: 'ul bullet unordered list', icon: '•', color: '#64748b',
    run: (e, r) => apply(e, r, (c) => c.toggleBulletList()) },
  { title: 'Numbered list', hint: 'Ordered list', group: 'Basic', keywords: 'ol numbered ordered list', icon: '1.', color: '#64748b',
    run: (e, r) => apply(e, r, (c) => c.toggleOrderedList()) },
  { title: 'Checklist', hint: 'Task list', group: 'Basic', keywords: 'todo task checklist check', icon: '☑', color: '#64748b',
    run: (e, r) => apply(e, r, (c) => c.toggleTaskList()) },
  { title: 'Quote', hint: 'Block quote', group: 'Basic', keywords: 'quote blockquote', icon: '❝', color: '#64748b',
    run: (e, r) => apply(e, r, (c) => c.toggleBlockquote()) },
  { title: 'Code block', hint: 'Fenced code', group: 'Basic', keywords: 'code block pre fenced', icon: '{ }', color: '#64748b',
    run: (e, r) => apply(e, r, (c) => c.toggleCodeBlock()) },
  { title: 'Divider', hint: 'Horizontal rule', group: 'Basic', keywords: 'divider hr rule line', icon: '―', color: '#64748b',
    run: (e, r) => apply(e, r, (c) => c.setHorizontalRule()) },
  { title: 'Table', hint: '3×3 table', group: 'Basic', keywords: 'table grid', icon: '▦', color: '#64748b',
    run: (e, r) => apply(e, r, (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })) },
  { title: 'Mermaid diagram', hint: 'Flowchart / diagram', group: 'Embeds', keywords: 'mermaid diagram flowchart graph', icon: '◈', color: '#8b5cf6',
    run: (e, r) => apply(e, r, (c) => c.insertContent({ type: 'mermaid' })) },
  { title: 'Code reference', hint: 'Pinned GitHub snippet', group: 'Embeds', keywords: 'code github reference snippet ref', icon: '⌥', color: '#1f2328',
    run: (e, r) => apply(e, r, (c) => c.insertContent({ type: 'codeRef', attrs: {} })) },
  ...([
    { key: 'youtube' as EmbedProvider, label: 'YouTube', icon: '▶', color: '#ff0000' },
    { key: 'figma' as EmbedProvider, label: 'Figma', icon: 'F', color: '#a259ff' },
    { key: 'loom' as EmbedProvider, label: 'Loom', icon: '◉', color: '#625df5' },
    { key: 'googlemaps' as EmbedProvider, label: 'Google Maps', icon: '◆', color: '#34a853' },
  ]).map(({ key, label, icon, color }) => ({
    title: label,
    hint: 'Embed by pasting a link',
    group: 'Embeds',
    keywords: `${key} embed video design map iframe`,
    icon,
    color,
    run: (e: Editor, r: Range) => apply(e, r, (c) => c.insertContent({ type: 'embed', attrs: { provider: key } })),
  })),
]

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        pluginKey: new PluginKey('slashCommands'),
        char: '/',
        // Only at the start of an empty-ish line / after whitespace.
        allowSpaces: false,
        startOfLine: false,
        items: ({ query }) => {
          const q = query.toLowerCase()
          return SLASH_ITEMS.filter(
            (i) => !q || i.title.toLowerCase().includes(q) || i.keywords.includes(q),
          ).slice(0, 20)
        },
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let component: ReactRenderer<SlashMenuRef> | null = null
          let el: HTMLElement | null = null

          const position = (clientRect: (() => DOMRect | null) | null | undefined) => {
            if (!el || !clientRect) return
            const rect = clientRect()
            if (!rect) return
            const virtual = { getBoundingClientRect: () => rect }
            void computePosition(virtual as unknown as Element, el, {
              placement: 'bottom-start',
              middleware: [offset(6), flip(), shift({ padding: 8 })],
            }).then(({ x, y }) => {
              if (!el) return
              el.style.left = `${x}px`
              el.style.top = `${y}px`
            })
          }

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenu, { props, editor: props.editor })
              el = document.createElement('div')
              el.style.position = 'absolute'
              el.style.zIndex = '60'
              el.appendChild(component.element)
              document.body.appendChild(el)
              position(props.clientRect)
            },
            onUpdate: (props) => {
              component?.updateProps(props)
              position(props.clientRect)
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                el?.remove()
                el = null
                return true
              }
              return component?.ref?.onKeyDown(props.event) ?? false
            },
            onExit: () => {
              el?.remove()
              el = null
              component?.destroy()
              component = null
            },
          }
        },
      }),
    ]
  },
})
