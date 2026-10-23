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
# Reuse the 32 existing, already-protected Shantae assets without duplicating media.
audit={t['file_url']:t for t in json.loads((root/'artifacts/music-dynamics-audit/measurements.json').read_text())['tracks']}
for key,url in json.loads((root/'data/shantae-audio.json').read_text()).items():
 source=release/('public'+url);digest=hashlib.sha256(source.read_bytes()).hexdigest();assert digest==audit[url]['sha256'],key
 size=source.stat().st_size
 manifest['shantae-'+key]={'bytes':size,'sha256':digest,'mime':{'.flac':'audio/flac','.m4a':'audio/mp4','.mp3':'audio/mpeg'}[source.suffix], 'parts':[{'path':url,'bytes':size}]}
# Artist-permission recordings use the same verified private asset pipeline.
permission_tracks=json.loads((root/'data/permission-music.json').read_text())
existing=json.loads((root/'data/listening-pool-audio-manifest.json').read_text())
for track in permission_tracks:
 key=track['fileUrl'].removeprefix('/api/listening-audio/')
 assert key not in manifest,key
 asset=existing[key];digest=hashlib.sha256()
 for part in asset['parts']:
  relative=Path(part['path'].lstrip('/'))
  assert relative.parts[:2]==('music','listening-pool-chunks') and '..' not in relative.parts,key
  source=root/'public'/relative;destination=release/'public'/relative
  data=source.read_bytes();assert len(data)==part['bytes'],key;digest.update(data)
  if source.resolve()!=destination.resolve():
   destination.parent.mkdir(parents=True,exist_ok=True)
   if destination.exists():assert destination.read_bytes()==data,key
   else:destination.write_bytes(data)
 assert digest.hexdigest()==asset['sha256']==track['sha256'],key
 manifest[key]=asset
(release/'data/listening-pool-audio-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Keep a source copy of the metadata manifest; original audio remains outside Git.
(root/'data/listening-pool-audio-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'recordings':len(manifest),'parts':sum(len(t['parts']) for t in manifest.values()),'audio_bytes':sum(t['bytes'] for t in manifest.values()),'largest_part':max(p['bytes'] for t in manifest.values() for p in t['parts'])}))
