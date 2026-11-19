import { approvedEqModels } from "../site/data/approved-eq-models.ts";
import { packagePeqdbAssets } from "./peqdb-assets.mjs";
import { verifyVoteFontAssets } from "./vote-font-assets.mjs";
import { verifyGuideAssets } from './guide-assets.mjs';
import {readdirSync,mkdirSync,lstatSync,statSync,linkSync,copyFileSync,unlinkSync,readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),source=join(root,'public'),destination=join(root,'dist/client');
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const publicOnly=process.argv.includes('--public-only'),marker=join(root,'dist/.public-only-package');
// The approved promotional film is distributed alongside the Android release.
const films = [
  ["companion-tour.mp4", "android-20261118-r3/YinYang-Companion-Rain-Garden.mp4", "903d64d4ec7dc5fb595abafc2f3106b996cb9031dff584d6ce92dafee9b4667c"],
  ["companion-tour-portrait.mp4", "android-20261118-r4/YinYang-Companion-Discord-Portrait.mp4", "4e9206917bffa8151904420eacc3972b58d103525c516230b9257f7914d72c02"],
];
for (const [name, releaseAsset, checksum] of films) {
  const file = join(source, 'android', name);
  if (!existsSync(file)) {
    const bytes = execFileSync('curl', ['--fail', '--silent', '--show-error', '--location',
      'https://github.com/yinyangeqlab/yinyang-android/releases/download/' + releaseAsset], { maxBuffer: 8 * 1024 * 1024 });
    if (createHash('sha256').update(bytes).digest('hex') !== checksum) throw Error('Unexpected trailer download: ' + name);
    writeFileSync(file, bytes);
  }
  if (digest(file) !== checksum) throw Error('Unexpected trailer checksum: ' + name);
}
const previewRoot = join(source, 'sample-assets');
const fontRevision = '6cdf01867df0813c2390f90dff7dc66c87f14cf7';
const fonts = {
  'Barlow-Regular.ttf': '95aa02c7c43096e0dd44d787ba6216864a67157e402adab59b35572e0c1577ea',
  'Barlow-SemiBold.ttf': '86577cb32f8abe3673db53ca0f4221e6856751a4f6730c867e00f720f8bb1fc5',
  'OFL.txt': '186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f',
};
mkdirSync(previewRoot, {recursive:true});
for (const [name, hash] of Object.entries(fonts)) {
  const file = join(previewRoot, name);
  if (!existsSync(file)) {
    const response = await fetch(`https://raw.githubusercontent.com/google/fonts/${fontRevision}/ofl/barlow/${name}`, {signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw Error('Unable to restore homepage font asset: ' + name);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== hash) throw Error('Unexpected font download: ' + name);
    writeFileSync(file, bytes);
  }
  if (digest(file) !== hash) throw Error('Unexpected homepage font asset: ' + name);
}
const panels = ['ranking','tuning','comparison','contribute'];
if (panels.some(name => !existsSync(join(previewRoot, 'destinations', name + '-print.webp'))))
  execFileSync('python3', ['scripts/build/first-listen-art.py', join(previewRoot, 'destinations')], {stdio:'inherit'});
if (['a','b'].some(name => !existsSync(join(previewRoot, name + '.flac'))))
  execFileSync('python3', ['scripts/build/first-listen-audio.py', previewRoot], {stdio:'inherit'});
// Only the reviewed synthetic previews may be served from these public URLs.
const sampleDigests = {
  a: '42006475494f63f0c19e02018b5cde567d9482ca4e551e369159bcb9d7e26083',
  b: '3766bb78cc9a4cc899ee6452c6ae8a42cb87fd3c88afb3b09bf3cd34656eead7',
};
for (const [side, expected] of Object.entries(sampleDigests)) {
  const actual = execFileSync('ffmpeg', ['-v','error','-i',join(previewRoot, side + '.flac'),'-map','0:a:0','-f','hash','-'], {encoding:'utf8'}).trim();
  if (actual !== 'SHA256=' + expected) throw Error('Incorrect homepage preview audio: ' + side);
}
verifyGuideAssets(source, { allowMissing: publicOnly });
for (const { presets } of approvedEqModels) {
  for (const { preview } of presets) {
    if (!preview) continue;
    const input = join(source, preview.path.slice(1));
    if (publicOnly && !existsSync(input)) continue;
    if (!existsSync(input) || digest(input) !== preview.sha256) {
      throw new Error(`Restore the exact approved EQ preset at public${preview.path} before packaging.`);
    }
  }
}
verifyVoteFontAssets();
if(publicOnly){mkdirSync(join(root,'dist'),{recursive:true});writeFileSync(marker,'Public clone package; restore all protected media and run full packaging before deployment.\n');}
let files=0;
function visit(folder,relative=''){
 for(const name of readdirSync(folder)){
  const input=join(folder,name),path=join(relative,name),output=join(destination,path),info=lstatSync(input);
  if(info.isSymbolicLink())throw new Error('Public asset symlinks must be resolved before packaging.');
  if(info.isDirectory()){mkdirSync(output,{recursive:true});visit(input,path);continue}
  if(!info.isFile())continue;
  mkdirSync(resolve(output,'..'),{recursive:true});
  let existing;try{existing=statSync(output)}catch{}
  if(existing&&existing.dev===info.dev&&existing.ino===info.ino){files++;continue}
  if(existing&&existing.size===info.size&&digest(input)===digest(output)){files++;continue}
  if(existing)unlinkSync(output);
  try{linkSync(input,output)}catch(error){if(error.code!=='EXDEV')throw error;copyFileSync(input,output)}
  files++;
 }
}
const model = 'vendor/site-help/potion-2m-int4-v1.bin';
const modelLicense = 'vendor/site-help/LICENSE.txt';
if (existsSync(join(source, model))) {
 if (digest(join(source, model)) !== '4520cbfdcbb08add6a94c02d03ab0c50d3c33e002a271c79ebb4e6d8b79a81f1' ||
     !existsSync(join(source, modelLicense)) ||
     digest(join(source, modelLicense)) !== digest(join(root, 'site/vendor/potion-2m-model2vec.LICENSE'))) {
  throw Error('Site help model or license differs from the pinned asset. Run scripts/prepare-site-help-model.py.');
 }
} else if (existsSync(join(destination, model))) {
 unlinkSync(join(destination, model));
 if (existsSync(join(destination, modelLicense))) unlinkSync(join(destination, modelLicense));
}
visit(source);
verifyGuideAssets(destination, { allowMissing: publicOnly });
packagePeqdbAssets(destination);
if (existsSync(join(source, model))) {
 const headerFile = join(destination, '_headers');
 const headers = existsSync(headerFile) ? readFileSync(headerFile, 'utf8') : '';
 const rule = '/' + model + '\n  Cache-Control: public, max-age=31536000, immutable\n';
 if (!headers.includes(rule)) {
  // Packaging may link this output to public/_headers.
  if (existsSync(headerFile)) unlinkSync(headerFile);
  writeFileSync(headerFile, headers.trimEnd() + '\n\n' + rule);
 }
}
if(!publicOnly){
 const peaks=join(root,'artifacts/waveform-peaks/public/__waveform-peaks');
 const audioManifest=JSON.parse(readFileSync(join(root,'site/data/listening-pool-audio-manifest.json'),'utf8'));
 mkdirSync(join(destination,'__waveform-peaks'),{recursive:true});
 for(const asset of Object.values(audioManifest)){
  const name=asset.sha256+'.bin',input=join(peaks,name),output=join(destination,'__waveform-peaks',name);
  if(!existsSync(input))throw new Error('Missing detailed waveform assets. Run python3 scripts/prepare-waveform-peaks.py before full packaging.');
  if(existsSync(output))unlinkSync(output);copyFileSync(input,output);
 }
}
const manifest=JSON.parse(readFileSync(join(root,'site/data/listening-pool-audio-manifest.json'),'utf8'));
if(!publicOnly)for(const asset of Object.values(manifest))for(const part of asset.parts){const file=resolve(destination,'.'+part.path);if(!file.startsWith(destination+'/')||!existsSync(file)||statSync(file).size!==part.bytes)throw new Error('Incomplete protected media package. Restore the authorized media for a live rebuild; use --public-only solely for a public clone preview.');}
if(publicOnly)console.log(`Packaged ${files} public-clone assets. Protected recordings not verified; NOT a deployable live package.`);
else {if(existsSync(marker))unlinkSync(marker);console.log(`Packaged ${files} static assets; ${Object.keys(manifest).length} protected recordings complete. Do not edit public assets while this release is being deployed.`);}
execFileSync(process.execPath,[resolve(root,'scripts/check-client-assets.mjs'),'--repair-preloads'],{stdio:'inherit'});
