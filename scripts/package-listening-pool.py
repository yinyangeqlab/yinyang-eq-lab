"""Package unchanged source audio into private Cloudflare assets (8 MiB parts)."""
import argparse,hashlib,json,mimetypes
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--release-root',required=True);args=p.parse_args()
root=Path(__file__).resolve().parents[1];release=Path(args.release_root).resolve()
originals=json.loads((root/'data/listening-pool-original-files.json').read_text())
research=json.loads((root/'artifacts/expanded-music-research/results.json').read_text())['tracks']
files=[(t['key'],root/t['local_file'],t['sha256']) for t in originals]+[(t['key'],root/'artifacts/expanded-music-research'/t['local_file'],t['sha256']) for t in research]
manifest={};partsize=8*1024*1024
for key,source,expected in files:
 digest=hashlib.sha256();parts=[];total=0
 folder=release/'public/music/listening-pool-chunks'/key;folder.mkdir(parents=True,exist_ok=True)
 with source.open('rb') as src:
  while data:=src.read(partsize):
   digest.update(data);total+=len(data);name=f'{len(parts):03d}.bin';(folder/name).write_bytes(data)
   parts.append({'path':f'/music/listening-pool-chunks/{key}/{name}','bytes':len(data)})
 assert digest.hexdigest()==expected,key
 manifest[key]={'bytes':total,'sha256':expected,'mime':{'.mp3':'audio/mpeg','.wav':'audio/wav','.flac':'audio/flac','.m4a':'audio/mp4','.ogg':'audio/ogg'}.get(source.suffix.lower(),'application/octet-stream'),'parts':parts}
(release/'data/listening-pool-audio-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Keep a source copy of the metadata manifest; original audio remains outside Git.
(root/'data/listening-pool-audio-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'recordings':len(manifest),'parts':sum(len(t['parts']) for t in manifest.values()),'audio_bytes':sum(t['bytes'] for t in manifest.values()),'largest_part':max(p['bytes'] for t in manifest.values() for p in t['parts'])}))
