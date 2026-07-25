import { doneColor } from '../board.js'

export function ProgressPanel({ progress }) {
  const share = progress.mode === 'share'

  return (
    <section className="progress-panel" aria-label="Общий прогресс">
      <div className="progress-head">
        <div>
          <p className="progress-caption">Общий прогресс</p>
          <div className="progress-figure">
            <strong>{progress.percent}%</strong>
            <span>готово из {progress.total} задач</span>
          </div>
        </div>

        <ul className="progress-legend">
          {progress.segments.map((segment) => (
            <li key={segment.key}>
              <span className="legend-dot" style={{ background: segment.color }} />
              <strong>{segment.count}</strong>
              <span className="legend-name">{segment.name}</span>
              {share && <span className="legend-share">{Math.round(segment.share)}%</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* В разрезах по платформам и исполнителям полоса делится на сегменты и показывает,
          как задачи распределены; в остальных — одной заливкой показывает выполненное. */}
      <div className="progress-track">
        {share ? progress.segments.map((segment) => (
          <div
            key={segment.key}
            className="progress-segment"
            style={{ width: `${segment.share}%`, background: segment.color }}
            title={`${segment.name}: ${segment.count}`}
          />
        )) : (
          <div
            className="progress-segment"
            style={{ width: `${progress.percent}%`, background: doneColor }}
            title={`Готово: ${progress.done} из ${progress.total}`}
          />
        )}
      </div>
    </section>
  )
}
