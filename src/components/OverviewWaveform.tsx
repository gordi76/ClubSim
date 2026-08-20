import { useMemo } from "react";
import type { CuePoint, WaveformSample } from "../types/deck";

function areaPath(samples: WaveformSample[]) {
  const lastIndex = Math.max(samples.length - 1, 1);
  const points = samples.map((sample, index) => {
    const x = (index / lastIndex) * 1000;
    const pulse = index % 8 === 0 ? 1 : index % 4 === 0 ? 0.86 : index % 2 === 0 ? 0.72 : 0.58;
    const y = 92 - Math.max(sample.low, sample.mid, sample.high) * pulse * 0.72;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M 0,92 L ${points.join(" L ")} L 1000,92 Z`;
}

export function OverviewWaveform({
  samples,
  progress,
  cues,
}: {
  samples: WaveformSample[];
  progress: number;
  cues: CuePoint[];
}) {
  const path = useMemo(() => areaPath(samples), [samples]);

  return (
    <div className="cdj-overview" aria-label={`Track progress ${Math.round(progress * 100)} percent`}>
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="cdj-overview__base" d={path} />
        <path className="cdj-overview__energy" d={path} />
      </svg>
      <div className="cdj-overview__played" style={{ width: `${progress * 100}%` }} />
      <div className="cdj-overview__cursor" style={{ left: `${progress * 100}%` }}><span /></div>

      {cues.map((cue) => (
        <span
          className={`cdj-overview__cue cdj-overview__cue--${cue.color}`}
          key={cue.label}
          style={{ left: `${cue.position * 100}%` }}
        >
          {cue.label}
        </span>
      ))}

      <div className="cdj-overview__timeline">
        <span>1:00</span><span>2:00</span><span>3:00</span><span>4:00</span><span>5:00</span>
      </div>
    </div>
  );
}
