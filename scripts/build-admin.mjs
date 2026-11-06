import fs from 'node:fs';
// Keep the Apps Script fallback identical to the GitHub-hosted admin UI.
const read=p=>fs.readFileSync(p,'utf8');
let html=read('admin.html').replace('<link rel="stylesheet" href="admin.css">',()=>'<style>'+read('admin.css')+'</style>').replaceAll('href="./"','href="https://datahub-shark.github.io/news/"');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>'<script>'+read(file).replace(/<\/script/gi,'<\\/script')+'</script>');
fs.writeFileSync('google-apps-script/Admin.html',html);
