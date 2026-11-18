import { useRef, useState } from 'react';

const tiers = [
  { metal: 'gold', light: '#f6d998', dark: '#b68c4f', ink: '#513d25' },
  { metal: 'silver', light: '#e0e9ec', dark: '#98aab1', ink: '#364650' },
  { metal: 'bronze', light: '#e7ae8c', dark: '#a77759', ink: '#563b2f' },
];
const rankedTargets = [
  { letter: 'A', color: '#efa3ae', trace: 'M83 1c7-1 10-8 18-7s11 11 18 6l9-4' },
  { letter: 'B', color: '#9cc5ed', trace: 'M83-3c8-3 12 0 18 5s12-8 19-6l8 3' },
  { letter: 'C', color: '#a0daca', trace: 'M83 2c10 0 13-7 20-4s11 5 16 1l9-5' },
];

function Ranking() {
  return <>
    <defs>{tiers.map(({metal, light, dark}) =>
      <linearGradient key={metal} id={'tier-' + metal} x2=".18" y2="1">
        <stop stopColor={light}/><stop offset="1" stopColor={dark}/>
      </linearGradient>)}</defs>
    {tiers.map(({metal, ink}, i) =>
      <g key={metal} className="rank-tier" transform={`translate(0 ${23+27*i})`}>
        <rect x="12" y="-11" width="135" height="22" rx="3" fill="#17282d" stroke="#395056"/>
        <path d="M15-11h26v22H15q-3 0-3-3V-8q0-3 3-3Z" fill={`url(#tier-${metal})`}/>
        <text x="26" y="6" textAnchor="middle" fill={ink} fontFamily="Barlow, sans-serif" fontSize="18" fontWeight="700">{i+1}</text>
      </g>)}
    {rankedTargets.map(({letter, color, trace}, i) =>
      <g key={letter} transform={`translate(0 ${23+27*i})`}>
        <g className={'rank-piece target-' + letter.toLowerCase()}>
          <rect x="49" y="-9" width="89" height="18" rx="3" fill="#263a40" stroke={color} strokeOpacity=".65"/>
          <text x="62" y="5" textAnchor="middle" fill={color} fontFamily="Barlow, sans-serif" fontWeight="700" fontSize="14">{letter}</text>
          <path d="M74-6V6" stroke={color} strokeOpacity=".35"/>
          <path d={trace} stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
        </g>
      </g>)}
  </>;
}

function Tuning() {
  return <>
    <rect x="11" y="10" width="138" height="80" rx="5" fill="#13252b" stroke="#3d575e"/>
    <g fill="none" stroke="#355057" strokeWidth=".8">
      <path d="M19 29h122M19 73h122M32 17v65m32-65v65m32-65v65m32-65v65"/>
      <path d="M17 52h126" stroke="#6b888c" strokeDasharray="2 3"/>
    </g>
    <g fill="none" stroke="#a4e8db" strokeWidth="2.8" strokeLinecap="round">
      <path className="eq-low-lobe" d="M18 52C30 52 33 36 48 36S67 52 80 52" vectorEffect="non-scaling-stroke"/>
      <path className="eq-high-lobe" d="M80 52C94 52 98 64 112 64S131 52 142 52" vectorEffect="non-scaling-stroke"/>
    </g>
    {[[48,36,'low'],[112,64,'high']].map(([x,y,band]) =>
      <g key={band} className={'eq-' + band + '-point'}>
        <circle cx={x} cy={y} r="6.3" fill="#172c31" stroke="#c6f7e9" strokeWidth="2"/>
        <circle cx={x} cy={y} r="2.2" fill="#99e5d3"/>
      </g>)}
  </>;
}

function Mask({ happy, x }: { happy: boolean; x: number }) {
  return <g transform={`translate(${x} 45) rotate(${happy ? -8 : 8})`}>
    <path d="M-17-17Q0-12 17-17L16 1C15 13 5 21 0 22S-16 13-17 1Z"
      fill={happy ? '#f0d3a1' : '#b7d1db'} stroke={happy ? '#ffebc8' : '#d8e8ed'}/>
    <path d="M1-13q-2 9-3 15l5-1" fill="none" stroke={happy ? '#bd9969' : '#87aab8'} strokeWidth="1.6"/>
    <g fill="#202a30">{happy ? <>
      <path d="M-13-4q4-7 10-1-5-2-10 1Zm16-1q5-6 10 0-5-2-10 0Z"/>
      <path d="M-10 4Q0 9 10 4Q1 23-10 4Z"/>
    </> : <>
      <path d="M-13-6q6 3 9-1-2 9-9 1Zm16-1q5 4 10 1-7 8-10-1Z"/>
      <path d="M-10 13Q0-3 10 13Q0 7-10 13Z"/>
    </>}</g>
  </g>;
}

function Drapery() {
  return <>
    <path d="M16 16h65v57q-6 5-13 1-8 4-14 0-9 4-16 0-10 4-22 0z" fill="#478a72"/>
    <path d="M21 16h9l-2 58-7 1zm17 0h9l2 59-9-1zm19 0h9l3 59-10-1zm17 0h7v57l-5 2z" fill="#235746"/>
    <path d="M32 17 31 71m21-54 2 55m16-55 3 55" stroke="#79ab88" strokeWidth="1.7"/>
  </>;
}

function Comparison() {
  const [swapped, setSwapped] = useState(false);
  const repeated = useRef(true);
  function uncover() {
    // Allow one repeat. Change the cast only during the fully closed hold.
    const swap = repeated.current || Math.random() < .5;
    repeated.current = !swap;
    if (swap) setSwapped(value => !value);
  }
  return <>
    <rect x="16" y="14" width="128" height="62" fill="#30282e" stroke="#4b4645"/>
    <path d="M34 74 47 19h14l18 55zm48 0 15-55h12l18 55z" fill="#403338"/>
    <Mask happy x={swapped ? 106 : 54}/><Mask happy={false} x={swapped ? 54 : 106}/>
    <g className="stage-curtain" onAnimationIteration={uncover}><Drapery/></g>
    <g transform="translate(160 0) scale(-1 1)"><g className="stage-curtain"><Drapery/></g></g>
    <path d="M13 13h134v5H13z" fill="#99a28a"/><path d="M14 13h132" stroke="#d0caba" strokeWidth="1.4"/>
    <path d="M13 76h134l-4 10H17z" fill="#293b3d" stroke="#596d69"/>
    <g fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m51 84 3-6 3 6m-5-2h4" stroke="#eea2a8"/>
      <path d="M104 78v6h3c3 0 3-3 0-3h-3m0-3h3c3 0 3 3 0 3" stroke="#96bfeb"/>
    </g>
  </>;
}

function BallotBox({ vote, x }: { vote: 'A' | 'B'; x: number }) {
  const a = vote === 'A';
  const accent = a ? '#e9a0a6' : '#9cbfdf';
  return <g transform={`translate(${x} 0)`}>
    <path d="m-31 62 8-13h46l8 13-6 23h-50z" fill="#51666a" stroke="#90a2a0" strokeLinejoin="round"/>
    <path d="m-17 58 2-3h31l2 3z" fill="#08151a" stroke="#23373a"/>
    <g clipPath="url(#vote-slot)">
      <g className={'cast-ballot ballot-' + vote.toLowerCase()}>
        <g transform={`rotate(${a ? -9 : 9} 0 27)`}>
          <path d="M-12 13H8l5 5v24h-25z" fill={a ? '#efc5c1' : '#c7ddeb'} stroke="#f4ecdd"/>
          <path d="M8 13v6h5" fill="none" stroke={a ? '#bc8e89' : '#8caebe'}/>
          <path d={a ? 'm-5 34 5-12 5 12m-8-4h6' : 'M-4 22v12h5c5 0 5-6 0-6h-5m0-6h5c5 0 5 6 0 6'}
            fill="none" stroke="#293b42" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        </g>
      </g>
    </g>
    <path d="M-31 62h62l-6 23h-50z" fill="#2b4148" stroke="#809594" strokeLinejoin="round"/>
    <path d="M-27 64h54" stroke="#667e82"/>
    <rect x="-10" y="68" width="20" height="12" rx="2" fill="#14262c" stroke="#566e73"/>
    <text x="0" y="77.5" textAnchor="middle" fill={accent} fontFamily="Barlow, sans-serif" fontWeight="700" fontSize="10">{vote}</text>
  </g>;
}

function Ballot() {
  return <>
    <defs><clipPath id="vote-slot"><path d="M-39 0h78v57h-78z"/></clipPath></defs>
    <BallotBox vote="A" x={44}/><BallotBox vote="B" x={116}/>
  </>;
}

const illustrations = { ranking: <Ranking/>, tuning: <Tuning/>, comparison: <Comparison/>, contribute: <Ballot/> };
export type ListeningTool = keyof typeof illustrations;

export default function ToolIllustration({ tool }: { tool: ListeningTool }) {
  return <svg className="destination-art" viewBox="0 0 160 100" aria-hidden="true" focusable="false">
    {illustrations[tool]}
  </svg>;
}
