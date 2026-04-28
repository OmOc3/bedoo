const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('c:/Users/om894/Documents/Mawqi3-main/Mawqi3-main/mobile/src');
let changed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content.replace(/isRtl\s*\?\s*'row-reverse'\s*:\s*'row'/g, "'row'");
  content = content.replace(/isRtl\s*\?\s*'row'\s*:\s*'row-reverse'/g, "'row-reverse'");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Modified:', file);
    changed++;
  }
});

console.log('Total files changed:', changed);
