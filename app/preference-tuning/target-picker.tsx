"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, ListFilter } from "lucide-react";
import { searchScore } from "@/lib/search";

type TargetOption = { id: string; name: string; creator: string; rank?: number; privateCopy?: boolean };
type SortOrder = "rank" | "name";
const names = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const targetLabel = (row: TargetOption) => row.rank ? `#${row.rank} · ${row.name}` : row.name;
const sameTarget = (a: TargetOption, b: TargetOption) => a.id === b.id;

export default function TuningTargetPicker({ targets, selected, onSelect }: {
  targets: readonly TargetOption[];
  selected: TargetOption;
  onSelect: (id: string) => void;
}) {
  const [sort, setSort] = useState<SortOrder>("rank");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open && document.activeElement === input.current) input.current?.select();
  }, [open]);
  const ordered = useMemo(() => [...targets].sort((a, b) =>
    (sort === "rank" ? (a.rank ?? Infinity) - (b.rank ?? Infinity) : 0) ||
    names.compare(a.name, b.name) || names.compare(a.creator, b.creator)
  ), [targets, sort]);
  const matches = useMemo(() => query === null ? ordered : ordered.filter(row =>
    searchScore(query, [row.name, row.creator]) >= 0
  ), [ordered, query]);

  return <div className="pt-target-tools">
    <div className="pt-target-picker">
      <label htmlFor="tuning-target-search">Search targets</label>
      <Combobox.Root<TargetOption>
        items={ordered}
        filteredItems={matches}
        value={selected}
        inputValue={query ?? targetLabel(selected)}
        open={open}
        onOpenChange={next => {
          setOpen(next);
          if (!next) setQuery(null);
        }}
        onInputValueChange={(value, event) => {
          if (event.reason === "input-change") {
            setQuery(value);
            setOpen(true);
          }
        }}
        onValueChange={row => { if (row) onSelect(row.id); }}
        itemToStringLabel={targetLabel}
        isItemEqualToValue={sameTarget}
        autoHighlight
      >
        <div className="pt-target-input" ref={anchor}>
          <Combobox.Input ref={input} id="tuning-target-search" type="search" placeholder="Name or source" autoComplete="off" spellCheck={false}
            onFocus={event => event.currentTarget.select()}
            onClick={event => { if (!open) event.currentTarget.select(); }} />
          <Combobox.Trigger className="pt-target-trigger" aria-label="Show targets" tabIndex={-1}><ChevronDown size={16} aria-hidden="true"/></Combobox.Trigger>
        </div>
        <Combobox.Portal>
          <Combobox.Positioner className="pt-target-positioner" anchor={anchor} side="bottom" align="start" sideOffset={4}
            collisionAvoidance={{ side: "none", align: "none", fallbackAxisSide: "none" }}>
            <Combobox.Popup className="pt-target-popup">
              <Combobox.Empty className="pt-target-empty">No matching targets</Combobox.Empty>
              <Combobox.List className="pt-target-options" aria-label="Target curves">
                {(row: TargetOption) => <Combobox.Item key={row.id} value={row} className="pt-target-option">
                  <span>{targetLabel(row)}{(row.creator || row.privateCopy) && <small>{[row.creator, row.privateCopy && "Private copy"].filter(Boolean).join(" · ")}</small>}</span>
                  <Combobox.ItemIndicator><Check size={16} aria-hidden="true"/></Combobox.ItemIndicator>
                </Combobox.Item>}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
    <div className="pt-target-sort">
      <span aria-hidden="true">Sort</span>
      <Menu.Root modal={false}>
        <Menu.Trigger className="pt-target-sort-button" aria-label={`Sort targets. Current order: ${sort === "rank" ? "Global rank" : "Alphabetical"}`} aria-describedby="tuning-target-rank-source">
          <ListFilter size={20} aria-hidden="true"/>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="pt-menu-positioner" align="end" sideOffset={5}>
            <Menu.Popup className="pt-option-menu">
              <Menu.RadioGroup value={sort} onValueChange={setSort} aria-label="Sort targets">
                <Menu.RadioItem value="rank" closeOnClick><Menu.RadioItemIndicator><Check size={14} aria-hidden="true"/></Menu.RadioItemIndicator>Global rank</Menu.RadioItem>
                <Menu.RadioItem value="name" closeOnClick><Menu.RadioItemIndicator><Check size={14} aria-hidden="true"/></Menu.RadioItemIndicator>Alphabetical (A–Z)</Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  </div>;
}
