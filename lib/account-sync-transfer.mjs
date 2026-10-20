// Each request/row is bounded; there is no aggregate 512 KB account-history cap.
import { validateAccountValues } from './account-sync.mjs';
import { sectionDigest, digest, accountDataDigest } from './device-sync.mjs';
export const PART_CHARACTERS = 65536;
export const PACKET_BYTES = 700000;
export const PACKET_PARTS = 64;
export async function describeValues(raw) { const values = validateAccountValues(raw), manifest = {}; for (const [key, text] of Object.entries(values)) {
    const value = JSON.parse(text);
    manifest[key] = { kind: Array.isArray(value) ? 'array' : 'value', count: Array.isArray(value) ? value.length : 1, digest: await sectionDigest(value) };
} return manifest; }
export function* valueParts(values, manifest) { for (const [key, section] of Object.entries(manifest)) {
    if (section.reuse)
        continue;
    const value = JSON.parse(values[key]), entries = section.kind === 'array' ? value : [value];
    for (let entry = 0; entry < entries.length; entry++) {
        const text = JSON.stringify(entries[entry]);
        const fragments = [];
        for (let offset = 0; offset < text.length;) {
            let end = Math.min(offset + PART_CHARACTERS, text.length);
            if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]))
                end--;
            fragments.push(text.slice(offset, end));
            offset = end;
        }
        for (let part = 0; part < fragments.length; part++)
            yield { key, entry, part, total: fragments.length, text: fragments[part] };
    }
} }
export function* partPackets(values, manifest) { let packet = [], bytes = 0; for (const part of valueParts(values, manifest)) {
    const size = new TextEncoder().encode(JSON.stringify(part)).byteLength + 1;
    if (packet.length && (bytes + size > PACKET_BYTES || packet.length >= PACKET_PARTS)) {
        yield packet;
        packet = [];
        bytes = 0;
    }
    packet.push(part);
    bytes += size;
} if (packet.length)
    yield packet; }
export async function assembleValues(manifest, parts) {
    const entries = new Map();
    for (const part of parts) {
        const section = manifest[part.key];
        if (!section)
            throw Error('Unexpected account data section.');
        const id = JSON.stringify([part.key, part.entry]);
        let entry = entries.get(id);
        if (!entry) {
            entry = { key: part.key, index: part.entry, total: part.total, hash: part.hash, pieces: new Map() };
            entries.set(id, entry);
        }
        if (entry.total !== part.total || entry.hash !== part.hash || entry.pieces.has(part.part) || part.part < 0 || part.part >= part.total)
            throw Error('Account transfer pieces did not match.');
        entry.pieces.set(part.part, part.text);
    }
    const grouped = {};
    for (const entry of entries.values()) {
        if (entry.pieces.size !== entry.total)
            throw Error('Account transfer is incomplete. Local data is unchanged.');
        const text = Array.from({ length: entry.total }, (_, index) => entry.pieces.get(index)).join('');
        const value = JSON.parse(text);
        if (await digest(value) !== entry.hash)
            throw Error('Account transfer integrity check failed. Local data is unchanged.');
        (grouped[entry.key] ??= []).push({ index: entry.index, value });
    }
    const values = {};
    for (const [key, section] of Object.entries(manifest)) {
        const rows = (grouped[key] || []).sort((a, b) => a.index - b.index);
        if (rows.length !== section.count)
            throw Error('Account transfer is incomplete. Local data is unchanged.');
        const value = section.kind === 'array' ? rows.map(row => row.value) : rows[0]?.value;
        if (await sectionDigest(value) !== section.digest)
            throw Error('Account section integrity check failed.');
        values[key] = JSON.stringify(value);
    }
    return validateAccountValues(values);
}
export async function readAccountState(endpoint = '/api/my-profile/sync', fetcher = fetch) { const separator = endpoint.includes('?') ? '&' : '?'; const read = async (extra) => { const response = await fetcher(endpoint + separator + 'protocol=3' + extra, { cache: 'no-store' }), state = await response.json(); if (!response.ok)
    throw Object.assign(Error(state.error || 'Sync unavailable.'), { status: response.status }); return state; }; let state = await read(''); if (!state.segmented)
    return state; const first = state, parts = [...state.parts]; while (state.nextPart) {
    state = await read('&epoch=' + encodeURIComponent(first.epoch) + '&revision=' + first.revision + '&cursor=' + encodeURIComponent(state.nextPart));
    parts.push(...state.parts);
} const values = await assembleValues(first.sections, parts); if (await accountDataDigest(values) !== first.dataDigest)
    throw Error('Account integrity check failed. Local data is unchanged.'); const { parts: ignored, nextPart, ...metadata } = first; return { ...metadata, values }; }
export async function writeAccountState(state, values, fetcher = fetch, progress = (_message) => { }, storage = typeof sessionStorage === 'undefined' ? null : sessionStorage) {
    const manifest = await describeValues(values);
    for (const [key, section] of Object.entries(manifest))
        if (state.sections?.[key]?.digest === section.digest)
            manifest[key] = { ...section, reuse: true };
    const fingerprint = await digest({ accountKey: state.accountKey, epoch: state.epoch, revision: state.revision, manifest });
    const pendingKey = 'yinyang-account-transfer-v3';
    let pending;
    try {
        pending = JSON.parse(storage?.getItem(pendingKey) || 'null');
    }
    catch { }
    if (pending?.fingerprint !== fingerprint)
        pending = { fingerprint, id: crypto.randomUUID(), packet: 0 };
    try {
        storage?.setItem(pendingKey, JSON.stringify(pending));
    }
    catch { /* Retry remains safe even if the optional resume marker is unavailable. */ }
    const post = async (body) => { const response = await fetcher('/api/my-profile/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ protocol: 3, ...body }) }), result = await response.json(); if (!response.ok)
        throw Object.assign(Error(result.error || 'Sync could not finish.'), { status: response.status }); return result; };
    const started = await post({ action: 'begin', id: pending.id, epoch: state.epoch, revision: state.revision, manifest });
    if (!started.resumed)
        pending.packet = 0;
    let index = 0;
    for (const parts of partPackets(values, manifest)) {
        if (index++ < pending.packet)
            continue;
        progress('Uploading saved data… interrupted transfers resume safely.');
        await post({ action: 'parts', id: pending.id, parts });
        pending.packet = index;
        try {
            storage?.setItem(pendingKey, JSON.stringify(pending));
        }
        catch { }
    }
    progress('Verifying saved account data…');
    const saved = await post({ action: 'commit', id: pending.id });
    if (saved.dataDigest !== await accountDataDigest(values))
        throw Error('The saved account did not match this browser. Local data is unchanged.');
    try {
        storage?.removeItem(pendingKey);
    }
    catch { }
    return { ...saved, values };
}
