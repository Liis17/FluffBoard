import { renderMarkdown } from '../markdown.js'
import { Avatar } from './atoms.jsx'

const when = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' })

/** Обсуждение задачи из GitHub. Поля ввода здесь нет намеренно — см. подпись под списком. */
export function TaskComments({ comments, error }) {
  return (
    <div className="field-group">
      <span className="field-label">
        Комментарии{comments && comments.length > 0 ? ` · ${comments.length}` : ''}
      </span>

      {error && <p className="field-note field-note-error">{error}</p>}
      {!error && comments === null && <p className="field-note">Загружаем комментарии…</p>}
      {comments?.length === 0 && <p className="field-note">Комментариев пока нет.</p>}

      {comments?.length > 0 && (
        <div className="comment-list">
          {comments.map((comment) => (
            <article className="comment" key={comment.id}>
              <header className="comment-head">
                <Avatar login={comment.author.login} avatarUrl={comment.author.avatarUrl} size={22} />
                <span className="comment-author">{comment.author.login}</span>
                <time className="comment-date" dateTime={comment.createdAt}>
                  {when.format(new Date(comment.createdAt))}
                </time>
              </header>
              {/* Тело комментария — такой же markdown из GitHub, как и описание, и очищается так же. */}
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.body) }} />
            </article>
          ))}
        </div>
      )}

      <p className="field-note">Ответить с доски нельзя: в GitHub она ходит от сервисного аккаунта.</p>
    </div>
  )
}
