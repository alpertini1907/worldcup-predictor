const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// A .docx is a zip file. We'll use PowerShell to extract it since we're on Windows.
const docxPath = 'C:\\Users\\user\\Downloads\\WorldCupPredictor_PRD.docx';
const extractDir = 'C:\\Users\\user\\Desktop\\dunya kupası\\docx_extracted';

// Use PowerShell to extract zip
try {
    execSync(`powershell -Command "Expand-Archive -Path '${docxPath}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'inherit' });
} catch(e) {
    // Try renaming to .zip first
    const zipPath = docxPath.replace('.docx', '.zip');
    fs.copyFileSync(docxPath, zipPath);
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'inherit' });
}

// Read document.xml
const docXml = fs.readFileSync(path.join(extractDir, 'word', 'document.xml'), 'utf8');

// Extract text - simple regex to get text between <w:t> tags
const texts = [];
const regex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
let match;
while ((match = regex.exec(docXml)) !== null) {
    texts.push(match[1]);
}

console.log(texts.join(''));
