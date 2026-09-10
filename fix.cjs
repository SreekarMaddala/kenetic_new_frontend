const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/routes/projects/$projectId');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'index.tsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const name = path.basename(file, '.tsx');
  
  // Replace route definition
  content = content.replace(new RegExp(`createFileRoute\\(["']/${name}["']\\)`), `createFileRoute("/projects/$projectId/${name}")`);
  
  // Replace imports
  content = content.replace(/from "\.\.\/components/g, 'from "../../../components');
  content = content.replace(/from "\.\.\/lib/g, 'from "../../../lib');
  
  fs.writeFileSync(filePath, content);
}
console.log('done');
