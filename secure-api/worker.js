// Same-origin Cloudflare Workers + Access + Google Sheets. No client-side secrets.
const sheetId = "1K7KrTz1tc9Uf-Ee7ferH2mSSHMbUzyb7U_j4IIeYFQ4";
const corsHeaders = {"Cache-Control":"private, no-store","Content-Type":"application/json; charset=utf-8"};
const fail = (message,status=400)=>new Response(JSON.stringify({error:message}),{status,headers:corsHeaders});
const b64url = b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const decode64 = s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
async function rsaKey(pem){const der=Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g,"").replace(/\s/g,"")),c=>c.charCodeAt(0));return crypto.subtle.importKey("pkcs8",der,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"])}
async function accessUser(request,env){
  const token=request.headers.get("Cf-Access-Jwt-Assertion");if(!token||!env.CF_ACCESS_TEAM_DOMAIN||!env.CF_ACCESS_AUD)throw Error("ACCESS_REQUIRED");
  const parts=token.split(".");if(parts.length!==3)throw Error("BAD_TOKEN");
  const head=JSON.parse(new TextDecoder().decode(decode64(parts[0])));
  const body=JSON.parse(new TextDecoder().decode(decode64(parts[1])));
  if(head.alg!=="RS256"||!head.kid||!body.exp||body.exp*1000<Date.now()||body.nbf&&body.nbf*1000>Date.now()||!([].concat(body.aud||[])).includes(env.CF_ACCESS_AUD))throw Error("INVALID_ACCESS");
  const domain=env.CF_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//,"").replace(/\/$/,"");
  if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain)||body.iss!==`https://${domain}`)throw Error("INVALID_ISSUER");
  const certs=await fetch(`https://${domain}/cdn-cgi/access/certs`);
  if(!certs.ok)throw Error("CERTS_FAILED");
  const jwk=(await certs.json()).keys?.find(k=>k.kid===head.kid);if(!jwk)throw Error("UNKNOWN_KEY");
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const ok=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode64(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
  if(!ok||typeof body.email!=="string")throw Error("INVALID_SIGNATURE");
  return body.email.trim().toLowerCase();
}
let oauth=null;
async function googleToken(env){
  if(oauth&&oauth.expires>Date.now()+60000)return oauth.token;
  if(!env.GOOGLE_CLIENT_EMAIL||!env.GOOGLE_PRIVATE_KEY)throw Error("GOOGLE_CREDENTIALS_MISSING");
  const now=Math.floor(Date.now()/1000);
  const header=b64url(new TextEncoder().encode(JSON.stringify({alg:"RS256",typ:"JWT"})));
  const payload=b64url(new TextEncoder().encode(JSON.stringify({iss:env.GOOGLE_CLIENT_EMAIL,scope:"https://www.googleapis.com/auth/spreadsheets.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})));
  const key=await rsaKey(env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,"\n"));
  const sig=b64url(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(header+"."+payload)));
  const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:header+"."+payload+"."+sig})});
  if(!res.ok)throw Error("GOOGLE_AUTH_FAILED");
  const j=await res.json();oauth={token:j.access_token,expires:Date.now()+(j.expires_in||3600)*1000};return oauth.token;
}
function val(v){if(typeof v==="number")return v;const s=String(v??"").trim().replace(/[^\d,.-]/g,"");if(!s)return 0;return Number(s.replace(/\./g,"").replace(",", "."))||0}
function iso(v){const m=String(v||"").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:String(v||"").slice(0,10)}
async function data(env,email,from,to){
  const rules=JSON.parse(env.ROLE_RULES_JSON||"{}"),rule=email==="pilot.manager@giga.internal"?{role:"manager"}:rules[email];if(!rule||!["manager","ads"].includes(rule.role))return null;
  const bearer=await googleToken(env),range=encodeURIComponent("ADS_PERFORMANCE!A2:Q6000");
  const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`,{headers:{Authorization:"Bearer "+bearer}});
  if(!res.ok)throw Error("SHEETS_READ_FAILED");
  const values=(await res.json()).values||[];
  return values.filter(r=>{const d=iso(r[0]);return /^\d{4}-\d{2}-\d{2}$/.test(d)&&d>=from&&d<=to&&(rule.role==="manager"||String(r[3]||"").trim().toLowerCase()===String(rule.owner||"").trim().toLowerCase())}).map(r=>({
    date:iso(r[0]),ad:String(r[1]||""),ad_id:String(r[2]||""),owner:String(r[3]||""),
    objective:String(r[4]||""),page:String(r[5]||""),product:String(r[6]||""),target:String(r[7]||""),
    audience:String(r[8]||""),age:String(r[9]||""),gender:String(r[10]||""),detail:String(r[11]||""),creative:String(r[12]||""),
    campaign:String(r[1]||""),spend:val(r[13]),purchases:val(r[14]),gmv:val(r[15]),
    // Meta impression/click/lead counts are unavailable in this sheet: never fabricate them.
    impressions:0,reach:0,clicks:0,messages:0,leads:0,video3s:0,thruplay:0
  }));
}
// Private connectivity test: never return sheet rows, campaign information or credentials.
async function privateCheck(request,env){
  if(request.method!=="POST")return fail("NOT_FOUND",404);
  const supplied=request.headers.get("X-Giga-Health-Key")||"";
  if(!env.HEALTH_CHECK_KEY||supplied.length<32||supplied.length>512)return fail("NOT_FOUND",404);
  const digest=async s=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
  const a=await digest(supplied),b=await digest(env.HEALTH_CHECK_KEY);
  let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
  if(mismatch!==0)return fail("NOT_FOUND",404);
  try{
    const token=await googleToken(env);
    const range=encodeURIComponent("ADS_PERFORMANCE!A1:A1");
    const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,{headers:{Authorization:"Bearer "+token}});
    if(!res.ok){console.error("health: SHEETS_READ_FAILED",res.status);return fail("SHEETS_READ_FAILED",503);}
    return new Response(JSON.stringify({ok:true,googleAuth:true,sheetReadable:true}),{headers:corsHeaders});
  }catch(e){const category=String(e.message||"");console.error("health:",category);return fail(["GOOGLE_CREDENTIALS_MISSING","GOOGLE_AUTH_FAILED"].includes(category)?category:"HEALTH_CHECK_FAILED",503)}
}

const enc=new TextEncoder();
async function hash(s){return new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(s)))}
function ctEq(a,b){if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a[i]^b[i];return v===0}
async function sig(s,secret){let key=await crypto.subtle.importKey("raw",enc.encode(secret),"HMAC",false,["sign"]);return b64url(await crypto.subtle.sign("HMAC",key,enc.encode(s)))}
function getCookie(req){return (req.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("giga_session="))?.slice("giga_session=".length)||""}
async function session(req,env){
 if(!env.SESSION_SIGNING_KEY||env.SESSION_SIGNING_KEY.length<48)return false;
 const parts=getCookie(req).split(".");if(parts.length!==2)return false;
 if(!ctEq(await hash(parts[1]),await hash(await sig(parts[0],env.SESSION_SIGNING_KEY))))return false;
 try{const p=JSON.parse(new TextDecoder().decode(decode64(parts[0])));return p.role==="manager"&&p.exp>Date.now()&&p.exp<=Date.now()+28800000}catch{return false}
}
async function authentication(req,env,path){
 if(path==="/api/logout"&&req.method==="POST")return new Response(JSON.stringify({ok:true}),{headers:{...corsHeaders,"Set-Cookie":"giga_session=; Secure; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0"}});
 if(path==="/api/session"&&req.method==="GET")return new Response(JSON.stringify({authenticated:await session(req,env)}),{headers:corsHeaders});
 if(path!=="/api/login"||req.method!=="POST")return fail("NOT_FOUND",404);
 if(!env.ADMIN_LOGIN_PASSWORD||env.ADMIN_LOGIN_PASSWORD.length<20||!env.SESSION_SIGNING_KEY||env.SESSION_SIGNING_KEY.length<48)return fail("AUTH_NOT_CONFIGURED",503);
 if(Number(req.headers.get("Content-Length")||0)>2048)return fail("INVALID_REQUEST");
 let body;try{body=await req.json()}catch{return fail("INVALID_REQUEST")}
 const supplied=String(body.password||"");if(supplied.length>512||!ctEq(await hash(supplied),await hash(env.ADMIN_LOGIN_PASSWORD)))return fail("INVALID_CREDENTIALS",401);
 const payload=b64url(enc.encode(JSON.stringify({role:"manager",exp:Date.now()+28800000})));
 return new Response(JSON.stringify({ok:true}),{headers:{...corsHeaders,"Set-Cookie":"giga_session="+payload+"."+await sig(payload,env.SESSION_SIGNING_KEY)+"; Secure; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800"}});
}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/api/"))return env.ASSETS.fetch(request);
  if(url.pathname==="/api/private-health")return privateCheck(request,env);
  if(["/api/login","/api/logout","/api/session"].includes(url.pathname))return authentication(request,env,url.pathname);
  try{
    if(!(await session(request,env)))return fail("UNAUTHORIZED",401);
    const email="pilot.manager@giga.internal";
    if(url.pathname!=="/api/insights"||request.method!=="GET")return fail("NOT_FOUND",404);
    const since=url.searchParams.get("since")||"2026-01-01",until=url.searchParams.get("until")||new Date().toISOString().slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(since)||!/^\d{4}-\d{2}-\d{2}$/.test(until)||since>until)return fail("INVALID_DATE_RANGE");
    const rows=await data(env,email,since,until);if(rows===null)return fail("FORBIDDEN",403);
    return new Response(JSON.stringify({currency:"VND",rows,source:"ADS_PERFORMANCE",metricsAvailable:["spend","purchases","gmv"]}),{headers:corsHeaders});
  }catch(e){const code=String(e.message||"");if(["ACCESS_REQUIRED","BAD_TOKEN","INVALID_ACCESS","INVALID_ISSUER","INVALID_SIGNATURE","UNKNOWN_KEY"].includes(code))return fail("UNAUTHORIZED",401);console.error(code);return fail("API_UNAVAILABLE",503)}
}};
