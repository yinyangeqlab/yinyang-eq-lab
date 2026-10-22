import Link from "next/link";
import { ArrowUpRight, AudioLines, UsersRound, ChartNoAxesColumn } from "lucide-react";
import "./style.css";
export const metadata = {title:"Discover | YinYang EQ"};
const destinations = [
  {href:"/curve-credits",title:"Targets & sources",text:"Find target names, creators and documented sources.",Icon:AudioLines},
  {href:"/community-preferences",title:"Community preferences",text:"Explore the preference pilot, sharing choices and current limits.",Icon:UsersRound},
  {href:"/shootout?tab=rankings",title:"Research rankings",text:"View eligible blind-comparison results and how the scores work.",Icon:ChartNoAxesColumn},
];
export default function DiscoverPage(){return <main className="discover-page"><header><span>FOLLOW YOUR CURIOSITY</span><h1>Discover</h1><p>Meet the targets, understand the research, and see what others prefer.</p></header><div className="discover-directory">{destinations.map(({href,title,text,Icon})=><Link key={href} href={href} prefetch={false}><Icon size={25} aria-hidden="true"/><div><h2>{title}</h2><p>{text}</p></div><ArrowUpRight size={19} aria-hidden="true"/></Link>)}</div><p className="discover-related">Looking for recordings or want to suggest a song? <Link href="/music-library" prefetch={false}>Open Music library →</Link></p></main>}
