import type { Editor } from '@tiptap/react'
import Select from './Select'
import { type FontKey, FONT_OPTIONS, FONT_STACKS, FONT_SIZES } from './Editor'
import GeminiSparkleIcon from './GeminiSparkleIcon'
import './HtmlPage'
import './Toolbar.css'

type Props = {
  editor: Editor | null
  font?: FontKey
  onChangeFont?: (font: FontKey) => void
  onOpenAi?: () => void
  onOpenSettings?: () => void
  navOpen?: boolean
  onRevealNav?: () => void
  onToggleNav?: () => void
}

function Btn({
  label,
  title,
  onClick,
  isActive,
  canRun = true,
}: {
  label: React.ReactNode
  title: string
  onClick: () => void
  isActive?: boolean
  canRun?: boolean
}) {
  return (
    <button
      type="button"
      className={`tb-btn${isActive ? ' is-active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      disabled={!canRun}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3'

const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: 'Paragraph',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
}

export default function Toolbar({
  editor,
  onOpenAi,
  onOpenSettings,
  navOpen,
  onRevealNav,
  onToggleNav,
}: Props) {
  if (!editor) return null

  // Current block type, for the dropdown's displayed value.
  const current: BlockType = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : 'paragraph'

  // Reflect the selection's current font-family mark as a FontKey (default sans).
  const activeFamily = (editor.getAttributes('textStyle').fontFamily as string | undefined) ?? ''
  const activeFontKey: FontKey =
    (Object.keys(FONT_STACKS) as FontKey[]).find((k) => FONT_STACKS[k] === activeFamily) ?? 'sans'
  // Reflect the selection's current font-size mark (strip 'px'), default 16.
  const activeSizeRaw = (editor.getAttributes('textStyle').fontSize as string | undefined) ?? ''
  const activeFontSize: string = activeSizeRaw.replace('px', '') || '16'

  function setBlock(type: BlockType) {
    const chain = editor!.chain().focus()
    if (type === 'paragraph') chain.setParagraph().run()
    else chain.setHeading({ level: Number(type[1]) as 1 | 2 | 3 }).run()
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {onToggleNav && (
        <>
          <button
            type="button"
            className={`tb-btn tb-nav-reveal${navOpen ? ' is-active' : ''}`}
            title={navOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-label="Toggle sidebar"
            onMouseEnter={onRevealNav}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleNav}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <span className="tb-sep" />
        </>
      )}
      {/* Undo / redo */}
      <div className="tb-group">
        <Btn title="Undo (⌘Z)" label="↺" canRun={editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()} />
        <Btn title="Redo (⌘⇧Z)" label="↻" canRun={editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()} />
      </div>

      <span className="tb-sep" />

      {/* Block type dropdown */}
      <Select<BlockType>
        className="tb-block-select-wrapper"
        value={current}
        onChange={setBlock}
        options={(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => ({
          value: t,
          label: BLOCK_LABELS[t],
        }))}
        size="sm"
        ariaLabel="Paragraph style"
      />

      {/* Font dropdown — sets the FontFamily mark on the current selection */}
      <Select<FontKey>
        className="tb-font-select-wrapper"
        value={activeFontKey}
        onChange={(key) => editor.chain().focus().setFontFamily(FONT_STACKS[key]).run()}
        options={FONT_OPTIONS.map((f) => ({
          value: f.key,
          label: f.label,
        }))}
        size="sm"
        ariaLabel="Font family (applies to selected text)"
      />

      {/* Font-size picker — sets the FontSize mark on the current selection */}
      <Select<string>
        className="tb-size-select-wrapper"
        value={activeFontSize}
        onChange={(px) => editor.chain().focus().setFontSize(`${px}px`).run()}
        options={FONT_SIZES.map((s) => ({ value: s, label: s }))}
        size="sm"
        ariaLabel="Font size (applies to selected text)"
      />

      <span className="tb-sep" />

      {/* Inline formatting */}
      <div className="tb-group">
        <Btn title="Bold (⌘B)" label={<b>B</b>} isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()} />
        <Btn title="Italic (⌘I)" label={<i>I</i>} isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()} />
        <Btn title="Underline" label={<u>U</u>} isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <Btn title="Strikethrough" label={<s>S</s>} isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()} />
        <Btn title="Inline code" label={<code>{'<>'}</code>} isActive={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()} />
      </div>

      <span className="tb-sep" />

      {/* Insert group */}
      <div className="tb-group tb-insert">
        <span className="tb-insert-label">Insert:</span>
        <Btn title="Checklist" label="☑" isActive={editor.isActive('taskList')}
          onClick={() => editor.chain().focus().toggleTaskList().run()} />
        <Btn title="Bullet list" label="•" isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <Btn title="Numbered list" label="1." isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <Btn title="Blockquote" label="❝" isActive={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <Btn title="Code block" label="{ }" isActive={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <Btn title="Table" label="▦"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <Btn title="Divider" label="―"
          onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        <Btn title="Insert HTML page" label="🌐 HTML"
          onClick={() => editor.chain().focus().insertHtmlPage().run()} />
      </div>

      {editor.isActive('table') && (
        <>
          <span className="tb-sep" />
          <div className="tb-group tb-table-controls">
            <span className="tb-insert-label" style={{ fontWeight: 600 }}>Table:</span>
            <Btn title="Add row below" label="+ Row"
              onClick={() => editor.chain().focus().addRowAfter().run()} />
            <Btn title="Delete current row" label="- Row"
              onClick={() => editor.chain().focus().deleteRow().run()} />
            <Btn title="Add column right" label="+ Col"
              onClick={() => editor.chain().focus().addColumnAfter().run()} />
            <Btn title="Delete current column" label="- Col"
              onClick={() => editor.chain().focus().deleteColumn().run()} />
            <Btn title="Delete table" label="🗑"
              onClick={() => editor.chain().focus().deleteTable().run()} />
          </div>
        </>
      )}

      {onOpenAi && (
        <>
          <span className="tb-sep" />
          <div className="tb-group" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="tb-ai-btn"
              title="AI Buddy — rewrite selected text (Crispify or Bulletize)"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onOpenAi}
            >
              <GeminiSparkleIcon size={14} />
              AI Buddy
            </button>
            {onOpenSettings && (
              <button
                type="button"
                className="tb-btn tb-ai-gear"
                title="AI Settings (API key, model, provider)"
                aria-label="AI Settings"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onOpenSettings}
              >
                ⚙
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
