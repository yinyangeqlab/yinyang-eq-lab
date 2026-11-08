#!/usr/bin/env python3
"""Build peak-preserving multiresolution waveform assets from unchanged protected recordings.
Generated files remain outside Git. No network, database or audio rewriting.
"""
import concurrent.futures,hashlib,json,math,subprocess,tempfile
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/waveform-peaks/public/__waveform-peaks'
BLOCK=64
MAX_BINS=524288

def reduce_peaks(peaks,group):
    count=len(peaks); padded=math.ceil(count/group)*group
    lows=np.full((padded,2),np.inf,dtype='<f4'); highs=np.full((padded,2),-np.inf,dtype='<f4')
    lows[:count]=peaks[:,[0,2]];highs[:count]=peaks[:,[1,3]]
    low=lows.reshape(-1,group,2).min(axis=1);high=highs.reshape(-1,group,2).max(axis=1)
    return np.column_stack((low[:,0],high[:,0],low[:,1],high[:,1])).astype('<f4')

def write_peaks(target,fine,metadata):
    while len(fine)>MAX_BINS:
        fine=reduce_peaks(fine,2);metadata['samplesPerFinestBin']*=2
    levels=[fine]
    while len(levels[-1])>512:levels.append(reduce_peaks(levels[-1],4))
    offset=1024;entries=[]
    for level in reversed(levels):
        entries.append({'offset':offset,'count':len(level),'bytes':level.nbytes});offset+=level.nbytes
    metadata['levels']=entries
    header=json.dumps(metadata,separators=(',',':')).encode()
    if len(header)>1024:raise ValueError('Peak header overflow')
    OUT.mkdir(parents=True,exist_ok=True);temp=target.with_suffix('.tmp')
    with temp.open('wb') as stream:
        stream.write(header.ljust(1024,b' '))
        for level in reversed(levels):stream.write(level.tobytes())
    temp.replace(target)

def prepare(item):
    key,asset=item;target=OUT/(asset['sha256']+'.bin')
    if target.exists():
        with target.open('rb') as stream:
            metadata=json.loads(stream.read(1024));level=metadata['levels'][-1]
            if level['count']<=MAX_BINS:return target.stat().st_size
            stream.seek(level['offset']);fine=np.frombuffer(stream.read(level['bytes']),dtype='<f4').reshape(-1,4)
        write_peaks(target,fine,metadata);return target.stat().st_size
    digest=hashlib.sha256()
    with tempfile.TemporaryDirectory(prefix='waveform-source-') as folder:
        source=Path(folder)/'source.audio'
        with source.open('wb') as stream:
            for part in asset['parts']:
                data=(ROOT/'public'/part['path'].lstrip('/')).read_bytes()
                if len(data)!=part['bytes']:raise ValueError('Incomplete protected source')
                digest.update(data);stream.write(data)
        if digest.hexdigest()!=asset['sha256']:raise ValueError('Protected source hash mismatch')
        info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=sample_rate,channels','-of','json',str(source)]))['streams'][0]
        if info['channels']!=2:raise ValueError('Stereo source required')
        rate=int(info['sample_rate']);chunks=[];frames=0;pending=b''
        process=subprocess.Popen(['ffmpeg','-v','error','-i',str(source),'-map','0:a:0','-f','f32le','-acodec','pcm_f32le','pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        while True:
            data=process.stdout.read(BLOCK*8*4096)
            if not data:break
            pending+=data;size=len(pending)//(BLOCK*8)*(BLOCK*8)
            if not size:continue
            samples=np.frombuffer(pending[:size],dtype='<f4').reshape(-1,BLOCK,2);pending=pending[size:];frames+=samples.shape[0]*BLOCK
            low=samples.min(axis=1);high=samples.max(axis=1)
            chunks.append(np.column_stack((low[:,0],high[:,0],low[:,1],high[:,1])))
        error=process.stderr.read();code=process.wait()
        if code:raise ValueError('Audio decode failed: '+key)
        if pending:
            samples=np.frombuffer(pending,dtype='<f4').reshape(-1,2);frames+=len(samples)
            low=samples.min(axis=0);high=samples.max(axis=0);chunks.append(np.array([[low[0],high[0],low[1],high[1]]],dtype='<f4'))
        fine=np.concatenate(chunks).astype('<f4')
        metadata={'version':1,'sourceSha256':asset['sha256'],'sampleRate':rate,'frames':frames,'samplesPerFinestBin':BLOCK}
        write_peaks(target,fine,metadata)
    return target.stat().st_size

if __name__=='__main__':
    manifest=json.loads((ROOT/'data/listening-pool-audio-manifest.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:sizes=list(pool.map(prepare,manifest.items()))
    print(json.dumps({'recordings':len(sizes),'bytes':sum(sizes),'samplesPerFinestBin':BLOCK,'audioUnchanged':True}))
