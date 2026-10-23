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
  const rule=lookupRole(env,email);if(!rule||!["manager","ads"].includes(rule.role))return null;
  const bearer=await googleToken(env),range=encodeURIComponent("ADS_PERFORMANCE!A2:Q");
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
async function sig(s,secret){let key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64url(await crypto.subtle.sign("HMAC",key,enc.encode(s)))}
function getCookie(req){return (req.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("giga_session="))?.slice("giga_session=".length)||""}
function lookupRole(env,email){
  const target=String(email||"").trim().toLowerCase();
  const managers=String(env.ALLOWED_MANAGER_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(managers.includes(target))return {role:"manager"};
  const rules=JSON.parse(env.ROLE_RULES_JSON||"{}");
  const rule=rules[target];
  return rule&&["manager","ads"].includes(rule.role)?rule:null;
}
function cookieValue(req,name){return (req.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1)||""}
function cookieHeader(name,value,maxAge,path="/api"){return name+"="+value+"; Secure; HttpOnly; SameSite=Lax; Path="+path+"; Max-Age="+maxAge}
async function session(req,env){
 if(!env.SESSION_SIGNING_KEY||env.SESSION_SIGNING_KEY.length<48)return null;
 const parts=cookieValue(req,"giga_session").split(".");if(parts.length!==2)return null;
 if(!ctEq(await hash(parts[1]),await hash(await sig(parts[0],env.SESSION_SIGNING_KEY))))return null;
 try{const p=JSON.parse(new TextDecoder().decode(decode64(parts[0])));if(!p.email||!p.exp||p.exp<Date.now()||p.exp>Date.now()+28800000)return null;const rule=lookupRole(env,p.email);return rule?{email:p.email,role:rule.role}:null}catch{return null}
}
function newRandom(){return b64url(crypto.getRandomValues(new Uint8Array(32)))}
function originFor(req){return new URL(req.url).origin}
async function oauthStart(req,env){
 if(req.method!=="GET")return fail("METHOD_NOT_ALLOWED",405);
 if(!env.GOOGLE_OAUTH_CLIENT_ID)return fail("MISSING_OAUTH_CLIENT_ID",503);
 if(!env.SESSION_SIGNING_KEY||env.SESSION_SIGNING_KEY.length<48)return fail("MISSING_SESSION_SIGNING_KEY",503);
 let stage="create_state";
 try {
  const state=newRandom(),nonce=newRandom();
  const payload=b64url(enc.encode(JSON.stringify({state,nonce,exp:Date.now()+600000})));
  stage="sign_state";
  const stateSig=await sig(payload,env.SESSION_SIGNING_KEY);
  stage="build_redirect";
  const redirect=originFor(req)+"/api/auth/google/callback";
  const params=new URLSearchParams({client_id:String(env.GOOGLE_OAUTH_CLIENT_ID).trim(),redirect_uri:redirect,response_type:"code",scope:"openid email profile",state,prompt:"select_account",nonce});
  const headers=new Headers({"Cache-Control":"no-store"});
  headers.set("Location","https://accounts.google.com/o/oauth2/v2/auth?"+params.toString());
  headers.append("Set-Cookie",cookieHeader("giga_oauth_state",payload+"."+stateSig,600,"/api/auth/google"));
  return new Response(null,{status:302,headers});
 }catch(e){
  console.error("OAUTH_START_ERROR",stage,String(e?.name||"Error"),String(e?.message||e));
  return fail("OAUTH_START_"+stage.toUpperCase()+"_FAILED",503);
 }
}
async function oauthCallback(req,env){
 const url=new URL(req.url),state=url.searchParams.get("state"),code=url.searchParams.get("code"),returned=cookieValue(req,"giga_oauth_state");
 const clear=cookieHeader("giga_oauth_state","",0,"/api/auth/google");
 const landing=(message)=>new Response(null,{status:302,headers:{Location:"/?auth="+encodeURIComponent(message),"Cache-Control":"no-store","Set-Cookie":clear}});
 if(!state||!code||!returned||!env.SESSION_SIGNING_KEY)return landing("denied");
 const parts=returned.split(".");if(parts.length!==2||!ctEq(await hash(parts[1]),await hash(await sig(parts[0],env.SESSION_SIGNING_KEY))))return landing("denied");
 let saved;try{saved=JSON.parse(new TextDecoder().decode(decode64(parts[0])))}catch{return landing("denied")}
 if(saved.state!==state||saved.exp<Date.now())return landing("expired");
 const redirect=originFor(req)+"/api/auth/google/callback";
 const exchange=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:env.GOOGLE_OAUTH_CLIENT_ID,client_secret:env.GOOGLE_OAUTH_CLIENT_SECRET,redirect_uri:redirect,grant_type:"authorization_code"})});
 if(!exchange.ok){console.error("oauth code exchange failed",exchange.status);return landing("exchange_failed")}
 const tokens=await exchange.json();
 if(!tokens.access_token)return landing("exchange_failed");
 const infoRes=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:"Bearer "+tokens.access_token}});
 if(!infoRes.ok)return landing("identity_failed");
 const profile=await infoRes.json();
 const email=String(profile.email||"").trim().toLowerCase();
 if(profile.email_verified!==true||!lookupRole(env,email))return landing("not_authorized");
 const payload=b64url(enc.encode(JSON.stringify({email,exp:Date.now()+28800000})));
 const sessionCookie=cookieHeader("giga_session",payload+"."+await sig(payload,env.SESSION_SIGNING_KEY),28800);
 const headers=new Headers({Location:"/","Cache-Control":"no-store"});
 headers.append("Set-Cookie",clear);headers.append("Set-Cookie",sessionCookie);
 return new Response(null,{status:302,headers});
}
async function authentication(req,env,path){
 if(path==="/api/logout"&&req.method==="POST")return new Response(JSON.stringify({ok:true}),{headers:{...corsHeaders,"Set-Cookie":cookieHeader("giga_session","",0)}});
 if(path==="/api/session"&&req.method==="GET"){const p=await session(req,env);return new Response(JSON.stringify({authenticated:!!p,email:p?.email||null,role:p?.role||null}),{headers:corsHeaders});}
 return fail("NOT_FOUND",404);
}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/api/")) {
    try { return await env.ASSETS.fetch(request); }
    catch (error) {
      console.error("ASSET_ROUTE_ERROR",String(error));
      return new Response("Dashboard currently unavailable. Check Worker logs.",{status:503});
    }
  }
  if(url.pathname==="/api/private-health")return privateCheck(request,env);
  if(url.pathname==="/api/auth/google/start") { try { return await oauthStart(request,env); } catch(e) { console.error("OAUTH_START_ERROR",String(e?.message||e)); return fail("OAUTH_START_FAILED",503); } }
  if(url.pathname==="/api/auth/google/callback") { try { return await oauthCallback(request,env); } catch(e) { console.error("OAUTH_CALLBACK_ERROR",String(e?.message||e)); return new Response(null,{status:302,headers:{Location:"/?auth=callback_failed","Cache-Control":"no-store"}}); } }
  if(["/api/logout","/api/session"].includes(url.pathname))return authentication(request,env,url.pathname);
  try{
    const user=await session(request,env);
    if(!user)return fail("UNAUTHORIZED",401);
    const email=user.email;
    if(url.pathname!=="/api/insights"||request.method!=="GET")return fail("NOT_FOUND",404);
    const since=url.searchParams.get("since")||"2026-01-01",until=url.searchParams.get("until")||new Date().toISOString().slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(since)||!/^\d{4}-\d{2}-\d{2}$/.test(until)||since>until)return fail("INVALID_DATE_RANGE");
    const rows=await data(env,email,since,until);if(rows===null)return fail("FORBIDDEN",403);
    return new Response(JSON.stringify({currency:"VND",rows,source:"ADS_PERFORMANCE",metricsAvailable:["spend","purchases","gmv"]}),{headers:corsHeaders});
  }catch(e){const code=String(e.message||"");if(["ACCESS_REQUIRED","BAD_TOKEN","INVALID_ACCESS","INVALID_ISSUER","INVALID_SIGNATURE","UNKNOWN_KEY"].includes(code))return fail("UNAUTHORIZED",401);console.error(code);return fail("API_UNAVAILABLE",503)}
}};
