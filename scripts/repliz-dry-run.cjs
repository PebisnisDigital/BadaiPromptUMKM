'use strict';

/**
 * PROMPTIONAL -> Repliz integration planner.
 * Dry-run only. No network requests, Repliz credentials, scheduling, or account mutation.
 *
 * Usage:
 *   node scripts/repliz-dry-run.cjs --start=2026-10-15 --brand=demo-rose --days=3
 *   node scripts/repliz-dry-run.cjs --start=2026-10-15 --brand=demo-noir --days=30
 */
const crypto=require('node:crypto');
const master=require('../data/repliz-master-30.json');
const {normalizeCode,getDemoTenant,STAGING_ALLOWED_BPS}=require('../lib/marketing-public');
const DEFAULT_ORIGIN='https://promptional-gratis.vercel.app';
const DEMO_ACCOUNT='DEMO_ACCOUNT_NOT_CONNECTED';
const cleanDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&
  !Number.isNaN(Date.parse(d+'T00:00:00Z'))&&
  new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const cleanTime=t=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t||'');

function scheduledAt(startDate,clock,day) {
  if (!cleanDate(startDate)||!cleanTime(clock)||!Number.isInteger(day)||day<1||day>365)
    throw new Error('Invalid start date, clock or day');
  const [y,m,d]=startDate.split('-').map(Number);
  const [h,min]=clock.split(':').map(Number);
  // Jakarta/WIB has fixed UTC+07:00 all year.
  return new Date(Date.UTC(y,m-1,d+day-1,h-7,min)).toISOString();
}
function pageUrl(origin,client,bp) {
  if(!getDemoTenant(client)||!normalizeCode(bp))throw new Error('Unknown tenant or BP');
  const u=new URL(origin);
  if(u.protocol!=='https:'||!u.hostname.endsWith('.vercel.app')||u.username||u.password)
    throw new Error('Dry-run origin must be HTTPS Vercel preview');
  return u.origin+'/c/'+client+'/p/'+bp;
}
const inactiveMessage=()=>({
  isActive:false,type:'text',text:'',prompt:'',
  opening:{
    postback:{isActive:false,text:'',image:'',button:{type:'postback',title:'',payload:''}},
    additional:{isActive:false,isPreventBeforeFollow:false,text:'',image:'',button:{type:'postback',title:'',payload:''}},
    webUrl:{text:'',image:'',buttons:[]}
  },
  keyword:{isExactMatch:true,values:[]},
  condition:{isActive:false,isExactMatch:true,keywords:[]},
  delay:{isActive:false,value:10,type:'second'}
});
function createTemplatePayload(bp,page,title) {
  const opening=inactiveMessage();
  opening.isActive=true;
  opening.type='opening';
  opening.condition={isActive:true,isExactMatch:false,keywords:['MAU']};
  opening.opening.postback={
    isActive:true,
    text:'Mau prompt '+bp+' dari posting ini? Tekan tombolnya dulu, ya!',
    image:'',
    button:{type:'postback',title:'AMBIL PROMPT',payload:''}
  };
  opening.opening.webUrl={
    text:'Ini halaman prompt '+bp+'. Salin prompt lengkapnya di halaman ini, ya!',
    image:'',
    buttons:[{type:'web_url',title:'BUKA PROMPT',url:page}]
  };
  return {
    name:'PROMPTIONAL DEMO - '+bp+' - '+title.slice(0,65),
    config:{
      delete:{isActive:false,type:'keyword',keywords:[],prompt:''},
      reply:{
        isActive:false,type:'text',text:'',prompt:'',isIncludeContentContext:false,
        keyword:{isExactMatch:true,values:[]},
        condition:{isActive:false,isExactMatch:false,keywords:[]},
        exception:{isActive:false,isExactMatch:false,keywords:[]},
        delay:{isActive:false,value:10,type:'second'}
      },
      like:{isActive:false},
      message:opening,
      chat:{
        isActive:false,type:'text',text:'',prompt:'',
        keyword:{isExactMatch:true,values:[]},
        delay:{isActive:false,value:10,type:'second'}
      },
      story:inactiveMessage()
    }
  };
}
function createSchedulePayload(item,brand,when,templateRef){
  return {
    title:item.bpCode+' - '+item.title,
    description:item.captionTemplate.replaceAll('{BRAND}',brand),
    topic:item.category,
    type:'image',
    medias:[{
      alt:'Contoh visual AI '+item.bpCode,
      customThumbnail:false,
      type:'image',
      url:item.imageUrl
    }],
    meta:{title:'',description:'',url:''},
    additionalInfo:{isAiGenerated:true,isDraft:true},
    accountId:DEMO_ACCOUNT,
    scheduleAt:when,
    templateId:templateRef
  };
}
function buildPlan({startDate='2026-10-15',startTime='07:00',client='demo-rose',days=3,origin=DEFAULT_ORIGIN}={}) {
  const brand=getDemoTenant(client);
  if(!brand)throw new Error('Unknown demo client');
  if(![3,30].includes(days))throw new Error('Dry run supports 3 or 30 days');
  if(!Array.isArray(master.items)||master.items.length!==30)throw new Error('Master must have exactly 30 posts');
  const seen=new Set();
  const entries=master.items.slice(0,days).map(item=>{
    if(!normalizeCode(item.bpCode)||seen.has(item.bpCode)||!item.imageUrl.startsWith('https://'))
      throw new Error('Invalid or duplicate BP/media '+item.bpCode);
    seen.add(item.bpCode);
    const landing=pageUrl(origin,client,item.bpCode);
    const date=scheduledAt(startDate,startTime,item.day);
    const fingerprint=crypto.createHash('sha256').update([client,DEMO_ACCOUNT,item.bpCode,date].join('|')).digest('hex').slice(0,20);
    const safe=STAGING_ALLOWED_BPS.has(item.bpCode);
    const templateRef='DRY_RUN_TEMPLATE_'+item.bpCode;
    return {
      day:item.day,code:item.bpCode,dateWib:startDate+' + '+(item.day-1)+'d at '+startTime,
      scheduleAtUtc:date,commentKeyword:'MAU',
      landingUrl:landing,previewWhitelisted:safe,
      canPublish:false,blockedReasons:[
        'DRY_RUN_ONLY: no credentials and no live Repliz calls',
        ...(safe?[]:['PAGE_NOT_ENABLED_IN_PREVIEW: '+item.bpCode]),
        'CLIENT_NOT_AUTHORIZED_AND_NO_ACTIVE_CHECKOUT'
      ],
      idempotencyKey:fingerprint,template:createTemplatePayload(item.bpCode,landing,item.title),
      schedule:createSchedulePayload(item,brand.name,date,templateRef)
    };
  });
  return {
    dryRun:true,requiresApproval:true,noNetworkOperations:true,
    source:'PROMPTIONAL 30-day approved Instagram content manifest',
    client:brand.name,clientSlug:client,accountId:DEMO_ACCOUNT,
    count:entries.length,matched:entries.every(x=>x.template.name.includes(x.code) && x.schedule.title.startsWith(x.code) && x.landingUrl.endsWith(x.code)),
    previewEnabled:entries.filter(x=>x.previewWhitelisted).length,
    blocked:entries.filter(x=>x.blockedReasons.length).length,
    entries
  };
}
if(require.main===module){
  const args=Object.fromEntries(process.argv.slice(2).map(k=>{
    const match=/^--([a-zA-Z-]+)=(.*)$/.exec(k);
    if(!match)throw new Error('Arguments use --key=value');
    return [match[1],match[2]];
  }));
  const plan=buildPlan({
    client:args.brand||'demo-rose',
    startDate:args.start||'2026-10-15',
    startTime:args.time||'07:00',
    days:Number(args.days||3)
  });
  process.stdout.write(JSON.stringify(plan,null,2)+'\n');
}
module.exports={buildPlan,scheduledAt,pageUrl,createTemplatePayload,createSchedulePayload};
