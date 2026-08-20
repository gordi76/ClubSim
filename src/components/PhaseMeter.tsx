function PhaseLane({ color, offset = 0 }: { color: "orange" | "blue"; offset?: number }) {
  return (
    <div className={`cdj-phase__lane cdj-phase__lane--${color}`}>
      <div className="cdj-phase__line" />
      <div className="cdj-phase__markers" style={{ transform: `translateX(${offset * 6}%)` }}>
        {Array.from({ length: 17 }, (_, index) => (
          <span className={index % 4 === 0 ? "downbeat" : ""} key={index} />
        ))}
      </div>
    </div>
  );
}

export function PhaseMeter({ offsetBeats, masterId }: { offsetBeats: number; masterId: number }) {
  return (
    <div className="cdj-phase">
      <div className="cdj-bars-left">
        <div className="cdj-bars-left__row cdj-bars-left__row--master">
          <strong>{masterId}</strong><span>02.3<small>Bars</small></span>
        </div>
        <div className="cdj-bars-left__row cdj-bars-left__row--player">
          <i /><span>12.3<small>Bars</small></span>
        </div>
      </div>
      <div className="cdj-phase__lanes">
        <PhaseLane color="orange" />
        <PhaseLane color="blue" offset={offsetBeats} />
        <div className="cdj-phase__playhead" />
      </div>
    </div>
  );
}
