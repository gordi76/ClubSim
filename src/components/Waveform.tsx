import { useId, type CSSProperties } from "react";
import type { WaveformSample } from "../types/deck";

type WaveformProps = {
  samples: WaveformSample[];
  compact?: boolean;
  palette?: "player" | "master";
  playhead?: number;
};

function mirrorPath(
  samples: WaveformSample[],
  value: (sample: WaveformSample, index: number) => number,
  scale: number,
) {
  const lastIndex = Math.max(samples.length - 1, 1);
  const top = samples.map((sample, index) => {
    const x = (index / lastIndex) * 1000;
    const y = 50 - value(sample, index) * scale;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const bottom = [...samples].reverse().map((sample, reverseIndex) => {
    const index = samples.length - 1 - reverseIndex;
    const x = (index / lastIndex) * 1000;
    const y = 50 + value(sample, index) * scale;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return `M ${top.join(" L ")} L ${bottom.join(" L ")} Z`;
}

export function Waveform({
  samples,
  compact = false,
  palette = "player",
  playhead = 38,
}: WaveformProps) {
  const clipId = useId().replace(/:/g, "");
  const pulse = (index: number) =>
    index % 8 === 0 ? 1 : index % 4 === 0 ? 0.78 : index % 2 === 0 ? 0.6 : 0.43;
  const outerPath = mirrorPath(
    samples,
    (sample, index) =>
      Math.max(sample.high, sample.mid * 0.9, sample.low * 0.82) * pulse(index),
    0.48,
  );
  const midPath = mirrorPath(
    samples,
    (sample, index) => sample.mid * Math.min(1, pulse(index) + 0.12),
    0.34,
  );
  const corePath = mirrorPath(
    samples,
    (sample, index) => sample.low * Math.min(1, pulse(index) + 0.22),
    0.17,
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
        <path className="wave-band wave-band--outer" d={outerPath} />
        <path className="wave-band wave-band--middle" d={midPath} />
        <path className="wave-band wave-band--core" d={corePath} />
        {palette === "player" && (
          <g className="wave-band--played" clipPath={`url(#${clipId})`}>
            <path className="wave-band wave-band--outer" d={outerPath} />
            <path className="wave-band wave-band--middle" d={midPath} />
            <path className="wave-band wave-band--core" d={corePath} />
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
