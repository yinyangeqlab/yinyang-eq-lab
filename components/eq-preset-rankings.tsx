import { eqRankingsForDevice, publishedEqModels, type PublishedEqModel, type RankingDevice } from "@/lib/eq-rankings";
import EqPresetReactions from "@/components/eq-preset-reactions";

export default function EqPresetRankings({ device, models = publishedEqModels }: { device: RankingDevice; models?: readonly PublishedEqModel[] }) {
  const groups = eqRankingsForDevice(models, device);
  return <section className="eq-preset-rankings" aria-labelledby="eq-preset-rankings-title">
    <h2 id="eq-preset-rankings-title" className="research-section-title">EQ preset rankings</h2>
    <p>Presets are ranked within their headphone or IEM model using level-matched blind comparisons.</p>
    {groups.length ? groups.map(({ model, ranked, awaiting, needsConnection }) => <section className="eq-model-ranking" key={model.id} aria-labelledby={`eq-model-${model.id}`}>
      <h3 id={`eq-model-${model.id}`}>{model.name}</h3>
      {ranked.length > 0 && <div className="ranking-list">
        {ranked.map(row => <div className="ranking-row" key={row.id}>
          <div className="rank-name"><span className="rank-number" aria-label={`Rank ${row.rank}`}>{row.rank}</span>
            <div><strong>{row.name}</strong>{row.credit && <small>by {row.credit}</small>}{row.tags?.length ? <small>{row.tags.join(" · ")}</small> : null}</div>
          </div>
          <span className="record">{row.wins} W / {row.losses} L / {row.ties} T</span>
          <strong className="rating">{Math.round(row.rating)}<small className="ranking-deviation">± {Math.round(row.sd)} SD</small></strong>
          {row.preview && <EqPresetReactions modelId={model.id} preset={row}/>}
        </div>)}
      </div>}
      {awaiting.length > 0 && <div className="eq-preset-awaiting">
        <p>{needsConnection ? "Awaiting comparisons across these presets" : "Awaiting comparisons"}</p>
        <ul>{awaiting.map(preset => <li key={preset.id}><strong>{preset.name}</strong>{preset.credit && <small>by {preset.credit}</small>}{preset.tags?.length ? <small>{preset.tags.join(" · ")}</small> : null}{preset.preview && <EqPresetReactions modelId={model.id} preset={preset}/>}</li>)}</ul>
      </div>}
    </section>) : <div className="empty compact"><strong>Awaiting comparisons</strong><p>Published results for {device === "oe" ? "headphones" : device === "ie" ? "IEMs" : "headphones and IEMs"} will appear here by model.</p></div>}
    {groups.some(group => group.ranked.length > 0) && <p className="footnote">Each published A/B pair counts one outcome per listener group. Ties count half. Scores and model SD are exploratory.</p>}
  </section>;
}
