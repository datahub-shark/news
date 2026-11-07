import fs from 'node:fs';
// Keep the Apps Script fallback identical to the GitHub-hosted admin UI.
const read=p=>fs.readFileSync(p,'utf8');
let html=read('admin.html').replace(/<link rel="stylesheet" href="([^"]+)">/g,(tag,file)=>/^https?:\/\//i.test(file)?tag:'<style>'+read(file)+'</style>').replaceAll('href="./"','href="https://datahub-shark.github.io/news/"');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(tag,file)=>/^https?:\/\//i.test(file)?tag:'<script>'+read(file).replace(/<\/script/gi,'<\\/script')+'</script>');
fs.writeFileSync('google-apps-script/Admin.html',html);
