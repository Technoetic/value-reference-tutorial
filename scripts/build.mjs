import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const APP=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const STYLES=['tokens','base','components'];
const digest=v=>createHash('sha256').update(v).digest('hex');
const posix=v=>v.replaceAll('\\','/');

async function walk(rootDir){
  const files=[];
  for(const entry of await readdir(rootDir,{withFileTypes:true})){
    const full=path.join(rootDir,entry.name);
    if(entry.isDirectory())files.push(...await walk(full));
    else files.push(full);
  }
  return files.sort();
}

export async function build({outDir='dist',tag=''}={}){
  const out=path.resolve(APP,outDir);
  if(!out.startsWith(APP+path.sep)||out===path.join(APP,'src'))throw Error('Output must stay inside project');
  if(tag&&!/^[a-z\d-]{1,20}$/i.test(tag))throw Error('Invalid build tag');
  const js=(await walk(path.join(APP,'src'))).filter(f=>f.endsWith('.js'));
  const files=await Promise.all(js.map(async f=>({name:posix(path.relative(path.join(APP,'src'),f)),text:await readFile(f,'utf8')})));
  const css=(await Promise.all(STYLES.map(s=>readFile(path.join(APP,'src/styles',s+'.css'),'utf8')))).join('\n');
  const template=await readFile(path.join(APP,'index.html'),'utf8');
  const svg=await readFile(path.join(APP,'assets/vr-mark.svg'),'utf8');
  const builder=await readFile(fileURLToPath(import.meta.url),'utf8');
  const buildId='vr-'+digest(builder+template+css+svg+files.map(f=>f.name+f.text).join('\n')).slice(0,12)+(tag?'-'+tag:'');
  const mapping=new Map(files.map(f=>[f.name,f.name.replace(/\.js$/,'.'+buildId+'.js')]));
  for(const f of files){
    const output=f.text.replace(/\b(from\s*|import\s*)(['"])(\.[^'"]+)\2/g,(whole,prefix,quote,spec)=>{
      const key=path.posix.normalize(path.posix.join(path.posix.dirname(f.name),spec));
      const dest=mapping.get(key);
      if(!dest)throw Error('Unknown module '+spec+' from '+f.name);
      let relative=path.posix.relative(path.posix.dirname(mapping.get(f.name)),dest);
      if(!relative.startsWith('.'))relative='./'+relative;
      return prefix+quote+relative+quote;
    });
    const target=path.join(out,'assets',mapping.get(f.name));
    await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,output);
  }
  await mkdir(path.join(out,'data'),{recursive:true});
  const content=JSON.parse(await readFile(path.join(APP,'data/lessons.json'),'utf8'));
  if(content.schema!==1||content.lessons?.length!==6||content.questions?.length!==6)throw Error('Invalid lesson content');
  await writeFile(path.join(out,'data/lessons.json'),JSON.stringify(content));
  await writeFile(path.join(out,'assets','app.'+buildId+'.css'),css);
  await writeFile(path.join(out,'assets','vr-mark.'+buildId+'.svg'),svg);
  const html=template
    .replaceAll('__BUILD_ID__',buildId)
    .replaceAll('__ICON_URL__','./assets/vr-mark.'+buildId+'.svg')
    .replaceAll('__STYLE_URL__','./assets/app.'+buildId+'.css')
    .replaceAll('__ENTRY_URL__','./assets/'+mapping.get('main.js'));
  if(/__[A-Z_]+__/.test(html))throw Error('Unresolved build token');
  await writeFile(path.join(out,'index.html'),html);
  await writeFile(path.join(out,'version.json'),JSON.stringify({schema:1,buildId})+'\n');
  await writeFile(path.join(out,'.nojekyll'),'');
  const report={buildId,out,modules:files.length,externalDependencies:0};
  console.log(JSON.stringify(report));
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const opt=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined;};
  await build({outDir:opt('--out')||'dist',tag:opt('--tag')||''});
}
