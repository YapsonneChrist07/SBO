import React from 'react'
import './BarChart.css'

/**
 * Single-series horizontal bar chart for ranked/magnitude comparisons
 * (top products, revenue per month, etc). One hue, direct end-labels,
 * no legend needed (single series — the panel title already names it).
 */
export default function BarChart({ data = [], valueFormatter = (v) => v, color = '#FF6B00', emptyMessage = 'Pas encore de données.' }) {
  if (!data.length) {
    return <p className="bar-chart__empty">{emptyMessage}</p>
  }

  const max = Math.max(...data.map((d) => d.value), 0) || 1

  return (
    <div className="bar-chart" role="img" aria-label={data.map((d) => `${d.label}: ${valueFormatter(d.value)}`).join(', ')}>
      {data.map((d, i) => {
        const pct = Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)
        return (
          <div className="bar-chart__row" key={d.label + i} tabIndex={0}>
            <div className="bar-chart__meta">
              <span className="bar-chart__label">{d.label}</span>
              {d.sub && <span className="bar-chart__sub">{d.sub}</span>}
            </div>
            <div className="bar-chart__track">
              <div
                className="bar-chart__fill"
                style={{ width: `${pct}%`, background: color }}
              />
              <span className="bar-chart__tooltip">
                {valueFormatter(d.value)}{d.sub ? ` · ${d.sub}` : ''}
              </span>
            </div>
            <span className="bar-chart__value">{valueFormatter(d.value)}</span>
          </div>
        )
      })}
    </div>
  )
}
