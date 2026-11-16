export class EntryService{
  constructor({version,currentURL,replace}){
    Object.assign(this,{version,currentURL,replace});
  }
  async start(){
    try{await this.version.refresh();}catch{return 'continue';}
    if(!this.version.pendingBuild)return 'continue';
    const target=new URL(this.currentURL);
    if(target.searchParams.get('_vr')?.startsWith(this.version.pendingBuild+'-'))return 'continue';
    target.searchParams.set('_vr',this.version.pendingBuild+'-'+crypto.randomUUID());
    this.replace(target.href);
    return 'replaced';
  }
}
