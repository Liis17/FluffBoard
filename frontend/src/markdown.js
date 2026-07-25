// Разметка описания: чистые функции без React, как и board.js.
import DOMPurify from 'dompurify'
import { marked } from 'marked'

// Тело issue в GitHub — GFM: переносы строк значимы, таблицы и чек-листы работают.
marked.setOptions({ gfm: true, breaks: true })

/** Разметка приходит от пользователя, поэтому HTML из неё обязательно чистится перед вставкой. */
export function renderMarkdown(text) {
  return DOMPurify.sanitize(marked.parse(text))
}

// Кнопка либо оборачивает выделение, либо ставит префикс в начало каждой выделенной строки:
// у списков и цитат обёртка бессмысленна.
export const actions = [
  { name: 'bold', title: 'Жирный', wrap: '**' },
  { name: 'italic', title: 'Курсив', wrap: '_' },
  { name: 'strike', title: 'Зачёркнутый', wrap: '~~' },
  { name: 'code', title: 'Код', wrap: '`' },
  { name: 'link', title: 'Ссылка', before: '[', after: '](https://)' },
  { name: 'list', title: 'Список', prefix: '- ' },
  { name: 'listNumbered', title: 'Нумерованный список', prefix: '1. ' },
  { name: 'checklist', title: 'Чек-лист', prefix: '- [ ] ' },
  { name: 'quote', title: 'Цитата', prefix: '> ' },
]

/**
 * Возвращает новое значение поля и выделение, которое нужно восстановить.
 * Префикс ставится с начала строки, в которой стоит курсор, — иначе список начинался
 * бы посреди строки.
 */
export function applyAction(action, value, start, end) {
  const selected = value.slice(start, end)

  if (action.prefix) {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const block = value.slice(lineStart, end)
    const prefixed = block.split('\n').map((line) => action.prefix + line).join('\n')
    return {
      value: value.slice(0, lineStart) + prefixed + value.slice(end),
      start: lineStart,
      end: lineStart + prefixed.length,
    }
  }

  const before = action.before ?? action.wrap
  const after = action.after ?? action.wrap
  return {
    value: value.slice(0, start) + before + selected + after + value.slice(end),
    // Без выделения курсор встаёт между знаками, с выделением остаётся на самом тексте.
    start: start + before.length,
    end: start + before.length + selected.length,
  }
}
