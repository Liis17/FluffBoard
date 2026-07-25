import { getLabelColors } from '../board.js'

export function LabelFilter({ labels, filters, onToggle, onReset }) {
  if (labels.length === 0) {
    return null
  }

  return (
    <div className="label-filter">
      <span className="filter-caption">Фильтр:</span>
      {labels.map((label) => {
        const active = filters.includes(label.name)
        return (
          <button
            key={label.name}
            type="button"
            aria-pressed={active}
            className={active ? 'filter-chip filter-chip-active' : 'filter-chip'}
            style={active ? getLabelColors(label.color) : undefined}
            onClick={() => onToggle(label.name)}
          >
            {label.name}
          </button>
        )
      })}
      {filters.length > 0 && (
        <button className="filter-reset" type="button" onClick={onReset}>сбросить</button>
      )}
    </div>
  )
}
