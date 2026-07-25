export function StatTiles({ metrics }) {
  return (
    <section className="stat-tiles" aria-label="Сводка по задачам">
      {metrics.map((metric) => (
        <article className="stat-tile" key={metric.label}>
          <div className="stat-head">
            <span className="stat-label">{metric.label}</span>
            <span className="stat-dot" style={{ background: metric.color }} />
          </div>
          <div className="stat-body">
            <strong className="stat-value">{metric.value}</strong>
            <span className="stat-suffix" style={metric.muted ? undefined : { color: metric.color }}>
              {metric.suffix}
            </span>
          </div>
        </article>
      ))}
    </section>
  )
}
