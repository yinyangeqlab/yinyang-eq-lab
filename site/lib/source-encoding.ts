export type SourceEncoding = {
  format?:string;sampleRate?:number;bitrate?:number;mode?:"CBR"|"VBR"|"ABR";
  basis?:"frame"|"average"|"byte-rate";verified?:boolean;sourceSha256?:string;
  frameCount?:number;samplesPerFrame?:number;mpegVersion?:number;frameRates?:string;encoderDelaySamples?:number;
  codec?:string;lossless?:boolean;
};
const rates1=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320];
const rates2=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
function frameHeader(b:Uint8Array){
  if(b.length<4||b[0]!==255||(b[1]&224)!==224)return null;
  const version=(b[1]>>3)&3,layer=(b[1]>>1)&3,index=b[2]>>4,rateIndex=(b[2]>>2)&3;
  if(version===1||layer!==1||index===0||index===15||rateIndex===3)return null;
  const sampleRate=[44100,48000,32000][rateIndex]/(version===3?1:version===2?2:4);
  const bitrate=(version===3?rates1:rates2)[index]*1000;
  return {version,index,sampleRate,bitrate,samples:version===3?1152:576,bytes:Math.floor((version===3?144:72)*bitrate/sampleRate)+((b[2]>>1)&1)};
}
const textAt=(bytes:Uint8Array,offset:number,text:string)=>[...text].every((c,i)=>bytes[offset+i]===c.charCodeAt(0));

/** Inspect every encoded MP3 frame. Bounded reads never decode PCM or upload music. */
export async function scanMp3Source(input:{size:number;read:(offset:number,length:number)=>Promise<Uint8Array>},cancelled=()=>false):Promise<SourceEncoding|null>{
  let cache:Uint8Array<ArrayBufferLike>=new Uint8Array(),cacheStart=-1;
  const read=async(offset:number,length:number)=>{
    if(offset<cacheStart||offset+length>cacheStart+cache.length){cache=await input.read(offset,Math.min(input.size-offset,Math.max(1_048_576,length)));cacheStart=offset;}
    return cache.subarray(offset-cacheStart,offset-cacheStart+length);
  };
  const head=await read(0,10);let offset=0;
  if(textAt(head,0,"ID3")){if(head.length<10||head.slice(6,10).some(b=>b>127))return null;offset=10+((head[6]<<21)|(head[7]<<14)|(head[8]<<7)|head[9])+((head[3]===4&&head[5]&16)?10:0);}
  const firstOffset=offset;let first:ReturnType<typeof frameHeader>=null;
  while(offset<Math.min(input.size-4,firstOffset+4096)){
    first=frameHeader(await read(offset,4));
    if(first&&offset+first.bytes<=input.size){const next=frameHeader(await read(offset+first.bytes,4));if(next&&next.sampleRate===first.sampleRate&&next.version===first.version)break;}
    first=null;offset++;
  }
  if(!first)return null;
  const codes:number[]=[];let totalBytes=0,metadata=false,declaredAbr=false,encoderDelaySamples=0;
  while(offset+4<=input.size){
    if(cancelled())return null;
    const bytes=await read(offset,4),frame=frameHeader(bytes);
    if(!frame){
      const tailSize=input.size-offset;if(tailSize>1_048_576)return null;
      const tail=await read(offset,tailSize);
      if(textAt(tail,0,"TAG")&&tailSize===128||textAt(tail,0,"APETAGEX")||tail.every(b=>b===0)){offset=input.size;break;}
      return null;
    }
    if(frame.version!==first.version||frame.sampleRate!==first.sampleRate||offset+frame.bytes>input.size)return null;
    let skip=false;
    if(!codes.length&&!metadata){
      const content=await read(offset,frame.bytes),mono=(content[3]>>6)===3;
      const tag=4+((content[1]&1)?0:2)+(frame.version===3?(mono?17:32):(mono?9:17));
      skip=textAt(content,tag,"Xing")||textAt(content,tag,"Info")||textAt(content,36,"VBRI");
      if(skip&&tag+8<content.length&&!textAt(content,36,"VBRI")){
        const v=new DataView(content.buffer,content.byteOffset,content.byteLength),flags=v.getUint32(tag+4,false);
        const cursor=tag+8+((flags&1)?4:0)+((flags&2)?4:0)+((flags&4)?100:0)+((flags&8)?4:0);
        if(cursor+24<=content.length&&textAt(content,cursor,"LAME")){declaredAbr=(content[cursor+9]&15)===2;encoderDelaySamples=(content[cursor+21]<<4)|(content[cursor+22]>>4);}
      }
      metadata=skip;
    }
    if(!skip){codes.push(frame.index);totalBytes+=frame.bytes;}
    offset+=frame.bytes;
    if(codes.length&&codes.length%2048===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  if(offset!==input.size||codes.length<2)return null;
  const uniform=codes.every(code=>code===codes[0]);let frameRates:string|undefined;
  if(!uniform){const packed=new Uint8Array(Math.ceil(codes.length/2));codes.forEach((code,i)=>packed[i>>1]|=code<<((i%2)*4));let binary="";for(const byte of packed)binary+=String.fromCharCode(byte);frameRates=btoa(binary);}
  return {format:"MP3",sampleRate:first.sampleRate,bitrate:Math.round(totalBytes*8/(codes.length*first.samples/first.sampleRate)),basis:"average",mode:declaredAbr?"ABR":uniform?"CBR":"VBR",verified:true,frameCount:codes.length,samplesPerFrame:first.samples,mpegVersion:first.version,frameRates,encoderDelaySamples};
}

export function sourceBitrateAt(details:SourceEncoding,seconds:number){
  if(!Number.isFinite(seconds)||!details.verified||!details.frameRates||!details.frameCount||!details.sampleRate||!details.samplesPerFrame)return null;
  const frame=Math.max(0,Math.min(details.frameCount-1,Math.floor((seconds*details.sampleRate+(details.encoderDelaySamples??0))/details.samplesPerFrame)));
  const packed=atob(details.frameRates).charCodeAt(frame>>1),code=(packed>>((frame%2)*4))&15;
  return (details.mpegVersion===3?rates1:rates2)[code]*1000||null;
}
