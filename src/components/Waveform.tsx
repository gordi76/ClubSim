import { useId, type CSSProperties } from "react";
import type { WaveformSample } from "../types/deck";

type WaveformProps = {
  samples: WaveformSample[];
  compact?: boolean;
  palette?: "player" | "master";
  playhead?: number;
};

function barPath(
  samples: WaveformSample[],
  value: (sample: WaveformSample, index: number) => number,
  scale: number,
) {
  const lastIndex = Math.max(samples.length - 1, 1);
  return samples.map((sample, index) => {
    const x = (index / lastIndex) * 1000;
    const height = Math.max(0.8, value(sample, index) * scale);
    return `M ${x.toFixed(2)} ${(50 - height).toFixed(2)} V ${(50 + height).toFixed(2)}`;
  }).join(" ");
}

export function Waveform({
  samples,
  compact = false,
  palette = "player",
  playhead = 50,
}: WaveformProps) {
  const clipId = useId().replace(/:/g, "");
  const columnWidth = Math.max(1.4, (1000 / Math.max(samples.length, 1)) * 0.68);
  const outerPath = barPath(
    samples,
    (sample) => Math.max(sample.low, sample.mid * 0.94, sample.high * 0.86),
    0.48,
  );
  const midPath = barPath(
    samples,
    (sample) => Math.max(sample.mid, sample.high * 0.72),
    0.32,
  );
  const corePath = barPath(
    samples,
    (sample) => sample.high,
    0.16,
  );

  return (
    <div
      className={`cdj-waveform cdj-waveform--${palette}${compact ? " cdj-waveform--compact" : ""}`}
      style={{ "--playhead": `${playhead}%` } as CSSProperties}
      aria-hidden="true"
    >
      <div className="cdj-waveform__ticks">
        {Array.from({ length: 17 }, (_, index) => (
          <span className={index % 4 === 0 ? "downbeat" : ""} key={index} />
        ))}
      </div>

      <svg viewBox="0 0 1000 100" preserveAspectRatio="none">
        <defs>
          <clipPath id={clipId}>
            <rect width={playhead * 10} height="100" />
          </clipPath>
        </defs>
        <path className="wave-band wave-band--outer" d={outerPath} strokeWidth={columnWidth} />
        <path className="wave-band wave-band--middle" d={midPath} strokeWidth={columnWidth} />
        <path className="wave-band wave-band--core" d={corePath} strokeWidth={columnWidth} />
        {palette === "player" && (
          <g className="wave-band--played" clipPath={`url(#${clipId})`}>
            <path className="wave-band wave-band--outer" d={outerPath} strokeWidth={columnWidth} />
            <path className="wave-band wave-band--middle" d={midPath} strokeWidth={columnWidth} />
            <path className="wave-band wave-band--core" d={corePath} strokeWidth={columnWidth} />
          </g>
        )}
      </svg>

      <div className="cdj-waveform__playhead"><span /></div>
      {!compact && (
        <div className="cdj-waveform__beat-numbers">
          <span>4</span><span>8</span><span>12</span><span>16</span>
        </div>
      )}
    </div>
  );
}
