'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Biography } from '@/lib/types';

const CHART_HEIGHT = 340;

const START_YEAR = 1954;
const END_YEAR = 1965;

/** Extract year from death date string (DD/MM/YYYY, MM/YYYY, or YYYY). Returns null if not parseable. */
function parseDeathYear(deathDate: string | undefined): number | null {
  if (!deathDate || !deathDate.trim()) return null;
  const s = deathDate.trim();
  const ddmmyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyy) return parseInt(ddmmyy[3], 10);
  const mmyy = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyy) return parseInt(mmyy[2], 10);
  const yy = s.match(/^(\d{4})$/);
  if (yy) return parseInt(yy[1], 10);
  return null;
}

type YearCount = { year: number; count: number; label: string };

export default function StatsPage() {
  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMounted, setChartMounted] = useState(false);

  useLayoutEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setChartMounted(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch('/api/biographies');
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) setBiographies(data);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const chartData = useMemo((): YearCount[] => {
    const counts: Record<number, number> = {};
    for (let y = START_YEAR; y <= END_YEAR; y++) counts[y] = 0;

    for (const bio of biographies) {
      const year = parseDeathYear(bio.deathDate);
      if (year != null && year >= START_YEAR && year <= END_YEAR) {
        counts[year] = (counts[year] ?? 0) + 1;
      }
    }

    return Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => {
      const year = START_YEAR + i;
      return {
        year,
        count: counts[year] ?? 0,
        label: `${year}`,
      };
    });
  }, [biographies]);

  const totalInRange = useMemo(
    () => chartData.reduce((sum, d) => sum + d.count, 0),
    [chartData]
  );

  const BAR_COLOR = '#2563eb';

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Statistiques</h1>
        </div>
        <p className="empty-state">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Statistiques</h1>
        <Link href="/" className="btn btn-ghost">
          Retour à la liste
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>
          Décès par année (1954 – 1965)
        </h2>
        <p className="meta" style={{ marginBottom: '1.5rem' }}>
          Nombre de personnes décédées par année, d’après les biographies enregistrées.
          {totalInRange > 0 && (
            <> Au total : <strong>{totalInRange}</strong> dans cette période.</>
          )}
        </p>

        <div style={{ width: '100%', minWidth: 1, height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}>
          {chartMounted ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" />
              <XAxis
                dataKey="year"
                tick={{ fill: 'var(--text, #374151)', fontSize: 12 }}
                tickLine={{ stroke: 'var(--border, #e5e7eb)' }}
                axisLine={{ stroke: 'var(--border, #e5e7eb)' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--text, #374151)', fontSize: 12 }}
                tickLine={{ stroke: 'var(--border, #e5e7eb)' }}
                axisLine={{ stroke: 'var(--border, #e5e7eb)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border, #e5e7eb)',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: 'var(--text, #374151)' }}
                formatter={(value) => [value ?? 0, 'Décès']}
                labelFormatter={(label) => `Année ${label}`}
              />
              <Bar dataKey="count" name="Décès" radius={[4, 4, 0, 0]} maxBarSize={48} fill={BAR_COLOR}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div style={{ width: '100%', height: '100%', minHeight: CHART_HEIGHT }} aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
