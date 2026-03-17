'use client';

interface PRPoint {
  date: string;
  weightKg: number;
  reps: number;
}

interface PRChartProps {
  data: PRPoint[];
  exerciseName: string;
}

export function PRChart({ data, exerciseName }: PRChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[#555555] text-sm">
        No data yet
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const weights = sorted.map((d) => d.weightKg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const width = 400;
  const height = 120;
  const paddingX = 30;
  const paddingY = 16;
  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;

  const points = sorted.map((d, i) => {
    const x = paddingX + (i / Math.max(sorted.length - 1, 1)) * innerW;
    const y = paddingY + innerH - ((d.weightKg - minW) / range) * innerH;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div>
      <p className="text-xs text-[#888888] mb-2">{exerciseName} — weight over time (kg)</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: '140px' }}
      >
        {/* Area fill */}
        <path d={areaD} fill="rgba(99,102,241,0.08)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#6366F1" strokeWidth="2" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366F1" stroke="#0A0A0A" strokeWidth="2">
            <title>{`${p.date}: ${p.weightKg}kg x ${p.reps}`}</title>
          </circle>
        ))}

        {/* Y axis labels */}
        <text x={paddingX - 4} y={paddingY + 4} textAnchor="end" fill="#555555" fontSize="8">
          {maxW}
        </text>
        <text x={paddingX - 4} y={height - paddingY + 4} textAnchor="end" fill="#555555" fontSize="8">
          {minW}
        </text>

        {/* X axis first/last dates */}
        {sorted.length > 0 && (
          <>
            <text x={paddingX} y={height - 2} textAnchor="start" fill="#555555" fontSize="8">
              {new Date(sorted[0].date).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })}
            </text>
            {sorted.length > 1 && (
              <text x={width - paddingX} y={height - 2} textAnchor="end" fill="#555555" fontSize="8">
                {new Date(sorted[sorted.length - 1].date).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
}
