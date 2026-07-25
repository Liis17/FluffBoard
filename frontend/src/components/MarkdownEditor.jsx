import { useRef, useState } from 'react'
import { actions, applyAction, renderMarkdown } from '../markdown.js'
import { Icon } from './icons.jsx'

export function MarkdownEditor({ value, rows = 4, placeholder, onChange }) {
  const [preview, setPreview] = useState(false)
  const areaRef = useRef(null)

  function run(action) {
    const area = areaRef.current
    const next = applyAction(action, value, area.selectionStart, area.selectionEnd)
    onChange(next.value)
    // Выделение восстанавливается после того, как React отрисует новое значение.
    requestAnimationFrame(() => {
      area.focus()
      area.setSelectionRange(next.start, next.end)
    })
  }

  return (
    <div className="markdown-editor">
      <div className="markdown-toolbar">
        {actions.map((action) => (
          <button
            key={action.name}
            className="icon-button"
            type="button"
            title={action.title}
            aria-label={action.title}
            disabled={preview}
            onClick={() => run(action)}
          >
            <Icon name={action.name} />
          </button>
        ))}
        <button
          className={preview ? 'markdown-tab markdown-tab-active' : 'markdown-tab'}
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? 'Написать' : 'Просмотр'}
        </button>
      </div>

      {preview ? (
        value.trim().length > 0
          ? <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }} />
          : <p className="markdown-body markdown-empty">Описания пока нет.</p>
      ) : (
        <textarea
          ref={areaRef}
          className="field-input"
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}
