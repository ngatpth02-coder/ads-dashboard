import http from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readConfig,dateRange,getInsights,MetaError} from './meta.mjs';
const webRoot=fileURLToPath(new URL('../meta_ads_dashboard_web/',import.meta.url));
const digest=value=>createHash('sha256').update(value).digest();
function authorized(req,config){
  const match=/^Basic ([A-Za-z0-9+/=]+)$/.exec(req.headers.authorization||'');
  if(!match)return false;
  const supplied=Buffer.from(match[1],'base64').toString('utf8');
  return timingSafeEqual(digest(supplied),digest(`${config.user}:${config.password}`));
}
export function createServer(config,{insights=getInsights,now=()=>new Date()}={}){
  const cache=new Map();
  return http.createServer(async(req,res)=>{
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
    try{
      const url=new URL(req.url,'http://localhost');
      if(req.method!=='GET'&&req.method!=='HEAD')return json(405,{error:'Method not allowed'});
      if(url.pathname==='/healthz')return json(200,{status:'ok'});
      if(!authorized(req,config)){res.setHeader('WWW-Authenticate','Basic realm="Ads Dashboard", charset="UTF-8"');return json(401,{error:'Đăng nhập bằng tài khoản dashboard của bạn.'});}
      if(url.pathname==='/api/insights'){
        const range=dateRange(url.searchParams,now()),key=JSON.stringify(range),entry=cache.get(key);
        let data;
        if(entry&&entry.until>Date.now())data=await entry.promise;
        else{
          const promise=insights(config,range);cache.set(key,{promise,until:Date.now()+60000});
          if(cache.size>20)cache.delete(cache.keys().next().value);
          try{data=await promise;}catch(error){cache.delete(key);throw error;}
        }
        return json(200,data);
      }
      if(url.pathname==='/'||url.pathname==='/meta_ads_dashboard_web'){res.writeHead(302,{Location:'/meta_ads_dashboard_web/'});return res.end();}
      if(url.pathname==='/meta_ads_dashboard_web/config.js'){res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8'});return res.end('window.DASHBOARD_CONFIG='+JSON.stringify({jsonEndpoint:'/api/insights',autoRefreshMs:15*60*1000,accountName:config.account})+';');}
      const assets={'/meta_ads_dashboard_web/':'index.html','/meta_ads_dashboard_web/index.html':'index.html','/meta_ads_dashboard_web/styles.css':'styles.css','/meta_ads_dashboard_web/app.js':'app.js','/meta_ads_dashboard_web/patch.js':'patch.js','/meta_ads_dashboard_web/modes.js':'modes.js'};
      const asset=assets[url.pathname];if(!asset)return json(404,{error:'Not found'});
      const content=await readFile(resolve(webRoot,asset));res.writeHead(200,{'Content-Type':asset.endsWith('.html')?'text/html; charset=utf-8':asset.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8'});res.end(req.method==='HEAD'?undefined:content);
    }catch(error){json(error instanceof MetaError?error.status:502,{error:error instanceof MetaError?error.message:'Không thể tải dữ liệu. Kiểm tra cấu hình backend hoặc thử lại sau.'});}
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{process.loadEnvFile();}catch(error){if(error.code!=='ENOENT')throw error;}
  try{const config=readConfig();const server=createServer(config);server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Ads dashboard backend listening.'));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
