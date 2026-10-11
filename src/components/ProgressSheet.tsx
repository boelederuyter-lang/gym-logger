import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db';
import { fmtDate, fmtSet } from '../format';
import {
  fmtMetric,
  inPeriod,
  isWeighted,
  METRIC_LABELS,
  metricsFor,
  metricValue,
  PERIOD_LABELS,
  type Metric,
  type Period,
} from '../progress';
import { loadSessions } from '../sessions';
import { bestSet } from '../stats';
import { LineChart } from './LineChart';
import { Sheet } from './Sheet';

export function ProgressSheet({ exerciseId, onClose }: { exerciseId: number; onClose: () => void }) {
  const ex = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  const all = useLiveQuery(async () => (await loadSessions(exerciseId)).get(exerciseId) ?? [], [exerciseId]);
  const [metric, setMetric] = useState<Metric | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const [selected, setSelected] = useState<number | null>(null);

  if (!ex || !all) return null;
  const metrics = metricsFor(isWeighted(all));
  const m = metric && metrics.includes(metric) ? metric : metrics[0];
  const sessions = inPeriod(all, period, Date.now());
  const values = sessions.map((s) => metricValue(s, m));
  const last = values[values.length - 1];
  const best = values.length ? Math.max(...values) : undefined;
  const diff = values.length > 1 ? last - values[0] : undefined;

  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div className="segmented">
        {metrics.map((k) => (
          <button key={k} className={k === m ? 'active' : ''} onClick={() => (setMetric(k), setSelected(null))}>
            {METRIC_LABELS[k]}
          </button>
        ))}
      </div>
      <div className="segmented small-seg">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button key={p} className={p === period ? 'active' : ''} onClick={() => (setPeriod(p), setSelected(null))}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="stats">
        <div className="stat">
          <span className="small muted">Laatst</span>
          <strong>{last != null ? fmtMetric(last, m) : '–'}</strong>
        </div>
        <div className="stat">
          <span className="small muted">Beste</span>
          <strong>{best != null ? fmtMetric(best, m) : '–'}</strong>
        </div>
        <div className="stat">
          <span className="small muted">Verschil</span>
          <strong className={diff == null || diff === 0 ? '' : diff > 0 ? 'plus' : 'minus'}>
            {diff == null ? '–' : `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${fmtMetric(Math.abs(diff), m)}`}
          </strong>
        </div>
      </div>

      <section className="card chart-card">
        <LineChart
          points={sessions.map((s, i) => ({ x: s.date, y: values[i], pr: s.sets.some((x) => x.pr) }))}
          format={(y) => fmtMetric(y, m)}
          selected={selected}
          onSelect={setSelected}
        />
        <p className="small muted chart-hint">Tik of sleep over de grafiek om een workout te kiezen. 🟡 = PR</p>
      </section>

      {sessions.length > 0 && (
        <section className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Beste set</th>
                <th className="right">{METRIC_LABELS[m]}</th>
              </tr>
            </thead>
            <tbody>
              {[...sessions].reverse().map((s, ri) => {
                const i = sessions.length - 1 - ri;
                const b = bestSet(s.sets);
                return (
                  <tr key={s.workoutId} className={selected === i ? 'selected' : ''} onClick={() => setSelected(i)}>
                    <td>{fmtDate(s.date)}</td>
                    <td>
                      {b ? fmtSet(b) : '–'}
                      {s.sets.some((x) => x.pr) && ' 🏆'}
                    </td>
                    <td className="right num">{fmtMetric(values[i], m)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </Sheet>
  );
}
