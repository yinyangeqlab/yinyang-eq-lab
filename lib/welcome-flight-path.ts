const turn = 2 * Math.PI;
const mix = (a: number, b: number, weight: number) => a + (b - a) * weight;
function ease(from: number, to: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * t * (t * (6 * t - 15) + 10);
}
/** A minimum without a corner, never above either argument. */
const softMin = (a: number, b: number) => .5 * (a + b - Math.sqrt((a - b) ** 2 + .008 ** 2));

/** Half of the empty band kept between the two rigs' nearest edges. */
const clearance = .017;
/** Highest top edge of a regular high pass, and lowest bottom edge of a low pass. */
const ceiling = .015;
const floor = .485;

/**
 * The line dividing the two lanes. It sinks towards the horizon in the deep
 * central sky and carries a slow serpentine, phased so the seam sits low where
 * the high rig enters and leaves at full size, and high where the low rig does.
 */
function seam(x: number) {
  return .222 + .098 * Math.exp(-(((x - .5) / .36) ** 2)) + .019 * (x - .5)
    + .013 * Math.sin(turn * 2.4 * (x - .5) - .415);
}

/** All distances are fractions of the 2:1 landscape plate. */
export function createWelcomeFlight(headphones: boolean, climb: boolean, random = Math.random) {
  const duration = (headphones ? 36 + 9 * random() : 44 + 11 * random()) * 1000;
  const near = .96 + .13 * random();
  const far = .46 + .13 * random();
  const bendPhase = random() * turn;
  const amplitude = .062 + .014 * random();
  const fold = .48 + .04 * random();
  const climbAltitude = .068 + .029 * random();
  const swayPeriod = headphones ? 6.1 + 1.1 * random() : 7.4 + 1.2 * random();
  // The low lane gets the wider meander; the room check below keeps it above
  // the ridge line and the high lane inside the top of the plate.
  const reach = headphones ? amplitude : 1.38 * amplitude;

  const steps = Math.ceil(duration / 110);
  const keyframes = Array.from({ length: steps + 1 }, (_, index): Keyframe => {
    const time = index / steps;
    // Pass more slowly through the distant centre. A climb decelerates into
    // its own far corner, leaving time for a long rise instead of a sharp turn.
    const along = climb
      ? -.1 + 1.067 * (1 - (1 - time) ** 2)
      : -.1 + 1.2 * (time + .045 * Math.sin(turn * time));
    const x = headphones ? along : 1 - along;
    const distance = Math.exp(-(((x - fold) / .235) ** 2));
    const recede = climb ? ease(.54, 1, time) : 0;
    const depth = mix(1 / near, 1 / far, distance) + 2.9 * recede;
    const size = 1 / depth;

    // The seam is the only thing the two flights share: a fixed function of x
    // that dips towards the horizon at the centre and snakes on the way. The
    // headphones stay wholly above it and the IEMs wholly below it, so the
    // seam's own rises and falls bend both routes without spending any of the
    // separation between them.
    const seams = [-1, -.5, 0, .5, 1].map((side) => seam(x + .035 * size * side));
    // Measuring the seam across the full projected width keeps the complete
    // rig clear on slopes, not only its centre.
    const edge = headphones ? Math.min(...seams) - clearance : Math.max(...seams) + clearance;
    const room = headphones ? edge - .14 * size - ceiling : floor - edge - .14 * size;
    // Each flight adds its own meander, always away from the seam, shrinking
    // with distance and yielding smoothly wherever the plate runs out of room.
    const range = Math.max(0, softMin(reach * Math.min(1, .45 + .55 * size), room));
    const sway = turn * (time * duration / 1000) / swayPeriod + bendPhase;
    const meander = .5 + .42 * Math.sin(sway) + .08 * Math.sin(2 * sway + .8);
    const gap = .07 * size + range * meander;
    const lane = headphones ? edge - gap : edge + gap;
    // The high exit only crosses the other lane in the reserved far corner,
    // outside the visible part of the opposite flight's entry.
    const lift = climb ? ease(.79, 1, time) : 0;
    const y = mix(lane, -climbAltitude, lift);

    const enter = ease(.16, .24, along);
    const exit = climb ? ease(-.06, .08, y) : 1 - ease(.925, 1.045, along);
    const opacity = .56 * enter * exit * (.42 + .53 * Math.min(size, 1.09));
    return {
      offset: time,
      transform: `translate3d(${(100 * x).toFixed(3)}cqw, ${(50 * y).toFixed(3)}cqw, 0) scale(${size.toFixed(4)})`,
      opacity,
    };
  });
  return { duration, keyframes };
}
