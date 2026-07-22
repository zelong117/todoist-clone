const fs = require('fs');
const path = 'D:\\360MoveData\\Users\\ww\\Desktop\\github项目文件\\todoist-clone\\src\\components\\TaskDetail.tsx';
const content = fs.readFileSync(path, 'utf8');
// Check for encoding issues
const hasGarbled = content.includes('鍒嗛') || content.includes('鏀朵欢') || content.includes('鍏抽棴');
console.log('File length:', content.length);
console.log('Has garbled text:', hasGarbled);
if (hasGarbled) {
  console.log('Sample garbled:', content.substring(content.indexOf('鏀朵欢'), content.indexOf('鏀朵欢') + 20));
}
