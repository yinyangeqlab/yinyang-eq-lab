export type CommunityTrial = {
    id: string;
    pairIndex: number;
    probability: number;
    a: string;
    b: string;
    result: 'a' | 'b' | 'tie' | 'skip' | null;
};
export type CommunityBlock = {
    subject: string;
    trials: CommunityTrial[];
};
export function communityEstimate(ids: string[], blocks: CommunityBlock[]) {
    if (ids.length < 2 || new Set(ids).size !== ids.length)
        throw Error('Invalid catalog');
    const k = ids.length, pairs: [
        string,
        string
    ][] = [];
    for (let a = 0; a < k; a++)
        for (let b = a + 1; b < k; b++)
            pairs.push([ids[a], ids[b]]);
    if (new Set(blocks.map(b => b.subject)).size !== blocks.length)
        throw Error('Linked accounts must have one block');
    const complete = blocks.filter(b => b.trials.length === 10 && b.trials.every(t => t.result === 'a' || t.result === 'b' || t.result === 'tie')), sum = ids.map(() => 0), encountered = ids.map(() => 0);
    const cells = new Map<string, {
        accounts: Map<string, number[]>;
        ties: number;
    }>();
    let tieAnswers = 0;
    for (const block of complete) {
        const seen = new Set<string>(), exposed = new Set<string>();
        for (const t of block.trials) {
            if (seen.has(t.id))
                throw Error('Duplicate assignment');
            seen.add(t.id);
            const pair = pairs[t.pairIndex];
            if (!pair || !pair.includes(t.a) || !pair.includes(t.b) || t.a === t.b || Math.abs(t.probability - 1 / pairs.length) > 1e-12)
                throw Error('Unknown sampling probability or pair');
            const score = t.result === 'tie' ? .5 : t.result === 'a' ? 1 : 0;
            sum[ids.indexOf(t.a)] += k / 2 * score / 10;
            sum[ids.indexOf(t.b)] += k / 2 * (1 - score) / 10;
            exposed.add(t.a);
            exposed.add(t.b);
            if (t.result === 'tie')
                tieAnswers++;
            const key = pair.join('|'), cell = cells.get(key) || { accounts: new Map(), ties: 0 };
            const values = cell.accounts.get(block.subject) || [];
            values.push(t.a === pair[0] ? score : 1 - score);
            cell.accounts.set(block.subject, values);
            if (t.result === 'tie')
                cell.ties++;
            cells.set(key, cell);
        }
        for (const id of exposed)
            encountered[ids.indexOf(id)]++;
    }
    const n = complete.length, radius = n ? k / 2 * Math.sqrt(Math.log(2 * k / .05) / (2 * n)) : Infinity;
    const rows = ids.map((id, i) => { const score = n ? sum[i] / n : null; return { id, score, lower: score === null ? 0 : Math.max(0, score - radius), upper: score === null ? 1 : Math.min(1, score + radius), exposedAccounts: encountered[i], state: score === null ? 'insufficient-evidence' : score<0||score>1?'out-of-range-estimate': radius >= .5 ? 'inconclusive' : 'overlapping-uncertainty' }; });
    const pairRows = [...cells].map(([key, c]) => { const values = [...c.accounts.values()].map(v => v.reduce((a, b) => a + b, 0) / v.length); return { pair: key.split('|'), mean: values.reduce((a, b) => a + b, 0) / values.length, accounts: values.length, ties: c.ties }; });
    const adjacency=new Map(ids.map(id=>[id,[] as string[]]));
    for(const pair of pairRows){if(Math.abs(pair.mean-.5)<1e-12)continue;const edge=pair.mean>.5?pair.pair:[...pair.pair].reverse();adjacency.get(edge[0])!.push(edge[1]);}
    const marks=new Map<string,number>();
    function visit(id:string):boolean{if(marks.get(id)===1)return true;if(marks.get(id)===2)return false;marks.set(id,1);for(const next of adjacency.get(id)||[])if(visit(next))return true;marks.set(id,2);return false;}
    const cycle=ids.some(visit);
    return { publicReady: false, rows, pairs: pairRows, assignedBlocks: blocks.length, completeBlocks: n, incompleteBlocks: blocks.length - n, skippedAnswers: blocks.flatMap(b => b.trials).filter(t => t.result === 'skip').length, tieAnswers, cycle, coverage: pairs.length ? pairRows.length / pairs.length : 0, uncertainty: 'Simultaneous Hoeffding bounds under independent-account, fixed-horizon and no selective-completion assumptions. Self-selected complete blocks do not establish population preference. Estimates are not clipped; bounds intersect the parameter range.' };
}
