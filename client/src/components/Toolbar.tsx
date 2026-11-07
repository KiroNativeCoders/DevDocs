import type { Editor } from '@tiptap/react'
import './Toolbar.css'

type Props = {
  editor: Editor | null
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

export default function Toolbar({
  editor,
}: Props) {
  if (!editor) return null

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {/* Block type, font family, and font size live in the Format menu */}

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

      {/* Insert items live in the Insert menu */}

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
    </div>
  )
}
