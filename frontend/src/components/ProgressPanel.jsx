export function ProgressPanel({ progress }) {
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
              <span>{segment.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="progress-track">
        {progress.segments.map((segment) => (
          <div
            key={segment.key}
            className="progress-segment"
            style={{ width: `${segment.share}%`, background: segment.color }}
            title={`${segment.name}: ${segment.count}`}
          />
        ))}
      </div>
    </section>
  )
}
