#!/usr/bin/env python3
"""Prepare pinned, external-only inputs and ignored local WASM assets. No deployment."""
import argparse, base64, hashlib, json, pathlib, shutil, subprocess, tarfile, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
PIN = 'fdc0db772164387c2df8739742594197c6851fc3'
SOURCES = {
    'src/autoeq.c': '7001edc709ff063a1e4e7e8d1fb9f0567e961267',
    'src/biquad.c': 'adf436d13651fa85a60b5cb777f78d567fde5c15',
    'src/init.c': '563a55bdf2726cf24055043be91f9e28ec23571b',
    'src/lib.h': 'eea339ea7e503f143479d400cbfb491339fb73e7',
    'LICENSE': '0a041280bd00a9d068f503b8ee7ce35214bd24a1',
}
TARGETS = {
    'oe': ('Harman over-ear 2018', 'c8b1e7ef08fa1f6a3f0c9836c6e9227392a0848a'),
    'ie': ('Harman in-ear 2019', 'f96afd93500fcf13466f53c3e9d56307dc5467b9'),
}
NAMES = ['Sennheiser HD 600', 'Sennheiser HD 650', 'AKG K371',
         'Moondrop Blessing 2', '7Hz Salnotes Zero', 'Moondrop Chu']

def git_hash(data):
    return hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()

def blob(repo, sha, dest):
    if not dest.exists():
        req = urllib.request.Request(f'https://api.github.com/repos/{repo}/git/blobs/{sha}', headers={'User-Agent': 'YinYangEQ-local-autoeq-review'})
        with urllib.request.urlopen(req, timeout=60) as response:
            data = base64.b64decode(json.load(response)['content'])
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    data = dest.read_bytes()
    if git_hash(data) != sha:
        raise ValueError(f'Input hash mismatch: {dest.name}')
    return data

def points(data):
    result = []
    for line in data.decode().splitlines():
        try:
            x, y = map(float, line.split(',')[:2])
        except ValueError:
            continue
        if 20 <= x <= 20000:
            result.append([x, y])
    if len(result) < 100:
        raise ValueError('Unexpected curve format')
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--inputs', type=pathlib.Path, required=True)
    parser.add_argument('--emsdk', type=pathlib.Path, required=True)
    parser.add_argument('--gpl', type=pathlib.Path, required=True, help='Local copy of the complete GNU GPLv3 license text')
    args = parser.parse_args()
    inputs = args.inputs.resolve()
    if 'GNU GENERAL PUBLIC LICENSE' not in args.gpl.read_text()[:200] or 'Version 3, 29 June 2007' not in args.gpl.read_text()[:200]:
        raise ValueError('Supply the complete GPLv3 license text')
    emcc = args.emsdk.resolve() / 'upstream/emscripten/emcc'
    if '4.0.14' not in subprocess.check_output([str(emcc), '--version'], text=True).splitlines()[0]:
        raise ValueError('This prototype requires Emscripten 4.0.14')
    # Raw third-party source/curves and the SDK must stay outside all Git checkouts.
    if subprocess.run(['git', '-C', str(inputs.parent), 'rev-parse', '--show-toplevel'], capture_output=True).returncode == 0:
        raise ValueError('Keep --inputs outside Git')
    out = ROOT / 'artifacts/autoeq-lab/public'
    engine = out / 'engine'
    engine.mkdir(parents=True, exist_ok=True)
    for path, sha in SOURCES.items():
        blob('peqdb/autoeq-c', sha, inputs / 'upstream' / path)
    patched = inputs / 'build-source'
    shutil.copytree(inputs / 'upstream', patched, dirs_exist_ok=True)
    for file in (patched / 'src').iterdir():
        text = file.read_text().replace('exp10(', 'peq_exp10(')
        if file.name == 'lib.h':
            text = text.replace('#define INFO(...) fprintf(stderr, __VA_ARGS__)', '#define INFO(...) ((void)0)')
        file.write_text(text)
    cmd = [str(emcc),
           *map(str, sorted((patched / 'src').glob('*.c'))),
           '-o', str(engine / 'autoeq-wasm.mjs'), '-O3', '-ffast-math', '-msimd128',
           '-DWASM=1', '-sSTACK_SIZE=1048576', '-sALLOW_MEMORY_GROWTH=1',
           '-sEXPORT_ES6=1', '-sMODULARIZE=1', '-sENVIRONMENT=web,worker,node',
           '-sEXPORTED_RUNTIME_METHODS=HEAP32,HEAPF32',
           '-sEXPORTED_FUNCTIONS=_malloc,_free,_preprocess,_autoeq,_get_ie_smooth,_get_oe_smooth']
    subprocess.run(cmd, check=True)
    shutil.copy2(inputs / 'upstream/LICENSE', engine / 'LICENSE')
    shutil.copy2(args.gpl, engine / 'COPYING')
    catalog = json.loads((ROOT / 'data/autoeq-catalog.json').read_text())
    fixtures = []
    for name in NAMES:
        entry = next(e for e in catalog['entries'] if e['name'] == name and e['source'] == 'oratory1990')
        data = blob('jaakkopasanen/AutoEq', entry['sha'], inputs / 'curves' / (entry['sha'] + '.csv'))
        target_name, target_sha = TARGETS[entry['type']]
        target_data = blob('jaakkopasanen/AutoEq', target_sha, inputs / 'curves' / (target_sha + '.csv'))
        fixtures.append({**entry, 'points': points(data), 'target': points(target_data),
                         'targetName': target_name, 'targetSha': target_sha,
                         'sourceUrl': 'https://github.com/jaakkopasanen/AutoEq/blob/master/' + entry['path']})
    (out / 'fixtures.json').write_text(json.dumps(fixtures))
    receipt = {'upstream': PIN, 'emscripten': '4.0.14',
               'patches': ['Rename exp10 helper for libc portability', 'Disable optimizer stderr logging'],
               'buildCommand': cmd,
               'assets': {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in engine.iterdir() if p.name != 'source.tar.gz'},
               'measurements': [{k: f[k] for k in ['name', 'source', 'rig', 'sha', 'targetName', 'targetSha']} for f in fixtures]}
    (out.parent / 'build-receipt.json').write_text(json.dumps(receipt, indent=2))
    # Local source offer contains all code needed to rebuild/replace the engine and lab.
    # No media, participant state, credentials or downloaded measurement files.
    with tarfile.open(engine / 'source.tar.gz', 'w:gz') as archive:
        archive.add(inputs / 'upstream', arcname='upstream')
        archive.add(patched, arcname='modified-engine')
        archive.add(args.gpl, arcname='COPYING')
        archive.add(out.parent / 'build-receipt.json', arcname='build-receipt.json')
        for path in ['LICENSE', 'package.json', 'package-lock.json', 'data/autoeq-catalog.json',
                     'lib/autoeq.ts', 'lib/preference-finalize.ts', 'lib/curves.ts', 'lib/blind-eq.ts', 'lib/blind-eq-audio.ts']:
            archive.add(ROOT / path, arcname='application/' + path)
        for path in (ROOT / 'experiments/autoeq').iterdir():
            if path.is_file(): archive.add(path, arcname='application/experiments/autoeq/' + path.name)
    print(json.dumps(receipt['assets'], indent=2))

if __name__ == '__main__':
    main()
