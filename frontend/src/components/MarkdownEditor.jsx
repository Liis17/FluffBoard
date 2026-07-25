import { useRef, useState } from 'react'
import { actions, applyAction, imageSnippet, insertText, renderMarkdown } from '../markdown.js'
import { Icon } from './icons.jsx'

export function MarkdownEditor({ value, rows = 4, placeholder, onChange, onUpload }) {
  const [preview, setPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const areaRef = useRef(null)
  const fileRef = useRef(null)

  // Выделение восстанавливается после того, как React отрисует новое значение.
  function replace(next) {
    onChange(next.value)
    requestAnimationFrame(() => {
      areaRef.current?.focus()
      areaRef.current?.setSelectionRange(next.start, next.end)
    })
  }

  function run(action) {
    const area = areaRef.current
    replace(applyAction(action, value, area.selectionStart, area.selectionEnd))
  }

  async function upload(file) {
    // Позиция курсора запоминается до запроса: пока идёт загрузка, поле можно расфокусировать.
    const area = areaRef.current
    const start = area?.selectionStart ?? value.length
    const end = area?.selectionEnd ?? value.length

    setUploading(true)
    setError('')
    try {
      const asset = await onUpload(file)
      replace(insertText(value, start, end, imageSnippet(asset)))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUploading(false)
    }
  }

  function pick(event) {
    const file = event.target.files[0]
    // Значение сбрасывается, иначе повторный выбор того же файла не вызовет change.
    event.target.value = ''
    if (file) {
      upload(file)
    }
  }

  // Картинку из буфера браузер отдаёт файлом, а текст пусть вставляется обычным путём.
  function paste(event) {
    const file = [...event.clipboardData.files].find((item) => item.type.startsWith('image/'))
    if (file) {
      event.preventDefault()
      upload(file)
    }
  }

  const busy = preview || uploading

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
            disabled={busy}
            onClick={() => run(action)}
          >
            <Icon name={action.name} />
          </button>
        ))}

        {onUpload && (
          <button
            className={uploading ? 'icon-button icon-button-busy' : 'icon-button'}
            type="button"
            title="Прикрепить картинку"
            aria-label="Прикрепить картинку"
            disabled={busy}
            onClick={() => fileRef.current.click()}
          >
            <Icon name={uploading ? 'refresh' : 'image'} />
          </button>
        )}

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
          onPaste={onUpload ? paste : undefined}
        />
      )}

      {onUpload && (
        <input
          ref={fileRef}
          className="visually-hidden"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          tabIndex={-1}
          onChange={pick}
        />
      )}

      {uploading && <p className="field-note">Загружаем картинку в GitHub…</p>}
      {error && <p className="field-note field-note-error">{error}</p>}
    </div>
  )
}
