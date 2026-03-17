'use client';

interface ContributionHeatmapProps {
  data: Record<string, number>;
}

function getDatesForLastYear(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getColor(count: number): string {
  if (count === 0) return '#0D0D0D';
  if (count === 1) return 'rgba(99,102,241,0.25)';
  if (count === 2) return 'rgba(99,102,241,0.5)';
  if (count >= 3) return 'rgba(99,102,241,0.85)';
  return '#6366F1';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ContributionHeatmap({ data }: ContributionHeatmapProps) {
  const dates = getDatesForLastYear();

  // Pad to start on Sunday
  const firstDay = dates[0].getDay();
  const paddedDates: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...dates,
  ];

  // Group into weeks
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < paddedDates.length; i += 7) {
    weeks.push(paddedDates.slice(i, i + 7));
  }

  // Month labels
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstReal = week.find((d) => d !== null);
    if (firstReal && firstReal.getMonth() !== lastMonth) {
      lastMonth = firstReal.getMonth();
      monthLabels.push({ label: MONTHS[lastMonth], weekIndex: wi });
    }
  });

  const totalWorkouts = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm text-[#888888] tracking-wider">WORKOUT FREQUENCY</h3>
        <span className="text-xs text-[#555555]">{totalWorkouts} total workouts</span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: `${weeks.length * 14}px` }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ paddingLeft: '20px' }}>
            {weeks.map((_, wi) => {
              const label = monthLabels.find((m) => m.weekIndex === wi);
              return (
                <div
                  key={wi}
                  style={{ width: '12px', marginRight: '2px', flexShrink: 0 }}
                  className="text-[9px] text-[#555555]"
                >
                  {label?.label ?? ''}
                </div>
              );
            })}
          </div>

          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1" style={{ width: '16px' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div
                  key={i}
                  className="text-[9px] text-[#444444] flex items-center justify-center"
                  style={{ height: '12px' }}
                >
                  {i % 2 === 1 ? d : ''}
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => {
                  if (!day) {
                    return <div key={di} style={{ width: '12px', height: '12px' }} />;
                  }
                  const dateStr = toDateString(day);
                  const count = data[dateStr] ?? 0;
                  return (
                    <div
                      key={di}
                      title={`${dateStr}: ${count} workout${count !== 1 ? 's' : ''}`}
                      style={{
                        width: '12px',
                        height: '12px',
                        background: getColor(count),
                        border: count > 0 ? '1px solid rgba(99,102,241,0.2)' : '1px solid #1A1A1A',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[9px] text-[#444444]">Less</span>
        {[0, 1, 2, 3].map((level) => (
          <div
            key={level}
            style={{
              width: '10px',
              height: '10px',
              background: getColor(level),
              border: '1px solid #1A1A1A',
            }}
          />
        ))}
        <span className="text-[9px] text-[#444444]">More</span>
      </div>
    </div>
  );
}
