#!/usr/bin/env python3
"""Prepare pinned, external-only inputs and ignored local WASM assets. No deployment."""
import argparse, base64, hashlib, io, json, pathlib, shutil, subprocess, tarfile, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
PIN = 'fdc0db772164387c2df8739742594197c6851fc3'
SOURCES = {
    'src/autoeq.c': '7001edc709ff063a1e4e7e8d1fb9f0567e961267',
    'src/biquad.c': 'adf436d13651fa85a60b5cb777f78d567fde5c15',
    'src/init.c': '563a55bdf2726cf24055043be91f9e28ec23571b',
    'src/lib.h': 'eea339ea7e503f143479d400cbfb491339fb73e7',
    'LICENSE': '0a041280bd00a9d068f503b8ee7ce35214bd24a1',
}

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


def source_files():
    tracked = subprocess.check_output(['git', 'ls-files', '--cached', '-z'], cwd=ROOT).decode().split('\0')
    untracked = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
    directories = ('app/', 'components/', 'lib/', 'hooks/', 'build/', 'scripts/', 'drizzle/', 'data/', 'vendor/')
    root_files = {'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'eslint.config.mjs', '.npmrc', '.node-version', '.openai/hosting.json', 'LICENSE', 'LICENSE_SCOPE.md', 'THIRD_PARTY.md', 'README.md'}
    extras = {'docs/PEQDB_AUTOEQ.md', 'docs/LOCAL_SETUP.md', 'public/dynamic-range-worklet.js'}
    eligible = lambda name: name and (name in root_files or name in extras or name.startswith(directories))
    allowlist = set(json.loads((ROOT / 'scripts/peqdb-source-allowlist.json').read_text()))
    unexpected = sorted(name for name in untracked if eligible(name) and name not in allowlist)
    if unexpected:
        raise ValueError('Unreviewed untracked source inputs: ' + ', '.join(unexpected))
    names = sorted({name for name in tracked + untracked if eligible(name)})
    if any(not (ROOT / name).is_file() or (ROOT / name).is_symlink() for name in names):
        raise ValueError('Source inputs must be existing regular files, without symlinks')
    return names

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--inputs', type=pathlib.Path, required=True)
    parser.add_argument('--emsdk', type=pathlib.Path, required=True)
    parser.add_argument('--gpl', type=pathlib.Path, required=True, help='Local copy of the complete GNU GPLv3 license text')
    args = parser.parse_args()
    source_names = source_files()
    inputs = args.inputs.resolve()
    if 'GNU GENERAL PUBLIC LICENSE' not in args.gpl.read_text()[:200] or 'Version 3, 29 June 2007' not in args.gpl.read_text()[:200]:
        raise ValueError('Supply the complete GPLv3 license text')
    emcc = args.emsdk.resolve() / 'upstream/emscripten/emcc'
    if '4.0.14' not in subprocess.check_output([str(emcc), '--version'], text=True).splitlines()[0]:
        raise ValueError('This prototype requires Emscripten 4.0.14')
    # Raw third-party source/curves and the SDK must stay outside all Git checkouts.
    for external in [inputs, args.emsdk.resolve()]:
        probe = external
        while not probe.exists() and probe != probe.parent: probe = probe.parent
        if subprocess.run(['git', '-C', str(probe), 'rev-parse', '--show-toplevel'], capture_output=True).returncode == 0:
            raise ValueError('Keep engine inputs and toolchain outside Git')
    out = ROOT / 'artifacts/peqdb-autoeq/public/vendor'
    engine = out / 'peqdb-autoeq'
    (ROOT / 'artifacts/peqdb-autoeq').mkdir(parents=True, exist_ok=True)
    engine.mkdir(parents=True, exist_ok=True)
    for path, sha in SOURCES.items():
        blob('peqdb/autoeq-c', sha, inputs / 'upstream' / path)
    patched = inputs / 'build-source'
    for name in SOURCES:
        destination = patched / name; destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(inputs / 'upstream' / name, destination)
    for file in [patched / name for name in SOURCES if name.startswith('src/')]:
        text = file.read_text()
        expected = {'autoeq.c': 2, 'biquad.c': 1, 'lib.h': 1, 'init.c': 0}[file.name]
        if text.count('exp10(') != expected:
            raise ValueError('Unexpected exp10 patch count: ' + file.name)
        text = text.replace('exp10(', 'peq_exp10(')
        if file.name == 'lib.h':
            if text.count('#define INFO(...) fprintf(stderr, __VA_ARGS__)') != 1:
                raise ValueError('Unexpected INFO patch count')
            text = text.replace('#define INFO(...) fprintf(stderr, __VA_ARGS__)', '#define INFO(...) ((void)0)')
        if expected:
            file.write_text("/* Modified by Yin Yang EQ Lab on 2026-10-27: exp10 helper renamed for libc portability; debug printing disabled in lib.h. */\n" + text)
    cmd = [str(emcc),
           *[str(patched / name) for name in sorted(SOURCES) if name.endswith('.c')],
           '-o', str(engine / 'autoeq-wasm.mjs'), '-O3', '-ffast-math', '-msimd128',
           '-DWASM=1', '-sSTACK_SIZE=1048576', '-sALLOW_MEMORY_GROWTH=1',
           '-sEXPORT_ES6=1', '-sMODULARIZE=1', '-sENVIRONMENT=web,worker,node',
           '-sEXPORTED_RUNTIME_METHODS=HEAP32,HEAPF32',
           '-sEXPORTED_FUNCTIONS=_malloc,_free,_preprocess,_autoeq,_get_ie_smooth,_get_oe_smooth']
    subprocess.run(cmd, check=True)
    shutil.copy2(inputs / 'upstream/LICENSE', engine / 'LICENSE')
    shutil.copy2(args.gpl, engine / 'COPYING')
    runtime = args.emsdk.resolve() / 'upstream/emscripten'
    (engine / 'RUNTIME-NOTICES.txt').write_text('Emscripten runtime license\n\n' + (runtime / 'LICENSE').read_text() + '\n\nMusl libc copyright notices\n\n' + (runtime / 'system/lib/libc/musl/COPYRIGHT').read_text())
    receipt = {'upstream': PIN, 'emscripten': '4.0.14',
               'patches': ['Rename exp10 helper for libc portability', 'Disable optimizer stderr logging'],
               'buildCommand': ['emcc', *['modified-engine/' + name for name in sorted(SOURCES) if name.endswith('.c')], '-o', 'autoeq-wasm.mjs', *cmd[cmd.index('-O3'):]],
               'assets': {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in engine.iterdir() if p.name != 'source.tar.gz'}}
    (ROOT / 'artifacts/peqdb-autoeq/build-receipt.json').write_text(json.dumps(receipt, indent=2))
    application_snapshot = {path: (ROOT / path).read_bytes() for path in source_names}
    # Corresponding engine source, complete original application code, and rebuild instructions.
    # No media, participant state, credentials or downloaded measurement files.
    with tarfile.open(engine / 'source.tar.gz', 'w:gz') as archive:
        for name in SOURCES:
            archive.add(inputs / 'upstream' / name, arcname='upstream/' + name)
            archive.add(patched / name, arcname='modified-engine/' + name)
        archive.add(args.gpl, arcname='COPYING')
        archive.add(engine / 'RUNTIME-NOTICES.txt', arcname='RUNTIME-NOTICES.txt')
        archive.add(ROOT / 'artifacts/peqdb-autoeq/build-receipt.json', arcname='build-receipt.json')
        for path, data in application_snapshot.items():
            info = tarfile.TarInfo('application/' + path); info.size = len(data); info.mode = 0o644
            archive.addfile(info, io.BytesIO(data))
    receipt['sourceFiles'] = {path: hashlib.sha256(data).hexdigest() for path, data in application_snapshot.items()}
    receipt['assets']['source.tar.gz'] = {'bytes': (engine / 'source.tar.gz').stat().st_size, 'sha256': hashlib.sha256((engine / 'source.tar.gz').read_bytes()).hexdigest()}
    (ROOT / 'artifacts/peqdb-autoeq/manifest.json').write_text(json.dumps(receipt, indent=2))
    print(json.dumps(receipt['assets'], indent=2))

if __name__ == '__main__':
    main()
