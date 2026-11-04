import {readFileSync,writeFileSync} from "node:fs";
function set(file,name,value){const old=readFileSync(file,"utf8"),line=name+"="+value,re=new RegExp("^"+name+"=.*$","m");writeFileSync(file,re.test(old)?old.replace(re,line):old.trimEnd()+"\n"+line+"\n");}
set(".env.local","NEXT_PUBLIC_CONVEX_URL","https://prestigious-porcupine-482.convex.cloud");
set(".env.n8n","CONVEX_SITE_URL","https://prestigious-porcupine-482.convex.site");
console.log("Saved the supplied public Convex URLs. Other values were preserved.");
