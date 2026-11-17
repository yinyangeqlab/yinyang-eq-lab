type Fetcher={fetch(request:Request):Promise<Response>};
type Level={offset:number;count:number;bytes:number};
// Asset bindings may ignore Range. Slice a bounded stream without buffering the
// whole asset; keep the native partial-response path when the binding supports it.
async function assetRange(assets:Fetcher,url:URL,start:number,end:number){
 const response=await assets.fetch(new Request(url,{headers:{Range:`bytes=${start}-${end}`}}));
 if(response.status===206&&response.headers.get("Content-Range")?.startsWith(`bytes ${start}-${end}/`))return response;
 if(response.status!==200||!response.body){await response.body?.cancel();return null;}
 const reader=response.body.getReader();let position=0,remaining=end-start+1;
 const body=new ReadableStream<Uint8Array>({
  async pull(controller){
   try{
    while(remaining>0){
     const {value,done}=await reader.read();
     if(done)throw new Error("Incomplete waveform asset");
     const low=Math.max(0,start-position),high=Math.min(value.length,end-position+1);
     position+=value.length;
     if(high>low){const slice=value.subarray(low,high);remaining-=slice.length;controller.enqueue(slice);if(!remaining){controller.close();await reader.cancel();}return;}
    }
   }catch(error){controller.error(error);await reader.cancel();}
  },
  cancel(reason){return reader.cancel(reason);}
 });
 return new Response(body);
}
// The existing private gate authenticates this route and the backing asset path.
export async function serveWaveformPeaks(request:Request,sha256:string,assets:Fetcher){
 const bins=Number(new URL(request.url).searchParams.get("bins")||512);
 if(!Number.isInteger(bins)||bins<1||bins>524288||!/^[a-f0-9]{64}$/.test(sha256))return new Response(null,{status:400});
 const url=new URL(`/__waveform-peaks/${sha256}.bin`,request.url);
 const header=await assetRange(assets,url,0,1023);
 if(!header)return new Response(null,{status:503,headers:{"Cache-Control":"private, no-store"}});
 let metadata:{version:number;sourceSha256:string;levels:Level[]};
 try{metadata=JSON.parse(await header.text());}catch{return new Response(null,{status:503});}
 if(metadata.version!==1||metadata.sourceSha256!==sha256||!Array.isArray(metadata.levels)||!metadata.levels.length||metadata.levels.some(level=>!Number.isSafeInteger(level.offset)||level.offset<1024||!Number.isSafeInteger(level.count)||level.count<1||level.count*16!==level.bytes||level.bytes>16_777_216||level.offset+level.bytes>16_777_216))return new Response(null,{status:503});
 const level=metadata.levels.find(value=>value.count>=bins)||metadata.levels.at(-1)!;
 const response=await assetRange(assets,url,level.offset,level.offset+level.bytes-1);
 if(!response)return new Response(null,{status:503});
 const headers={"Content-Type":"application/octet-stream","Content-Length":String(level.bytes),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Waveform-Bins":String(level.count)};
 if(request.method==="HEAD")await response.body?.cancel();
 return new Response(request.method==="HEAD"?null:response.body,{headers});
}
