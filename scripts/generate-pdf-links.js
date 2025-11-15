// scripts/generate-pdf-links.js
// This script generates a JSON file with PDF links from markdown content files
// Run this during build so the Netlify function can read it at runtime

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const contentBasePath = path.join(projectRoot, 'src/content');
const outputPath = path.join(projectRoot, 'netlify/functions/pdf-links.json');

const pdfLinks = {};

// Read from ritual and bundle collections
const collections = ['ritual', 'bundle'];

for (const collection of collections) {
  const collectionPath = path.join(contentBasePath, collection);
  
  if (!fs.existsSync(collectionPath)) {
    console.warn(`⚠️ Content directory not found: ${collectionPath}`);
    continue;
  }
  
  const files = fs.readdirSync(collectionPath);
  const mdFiles = files.filter(file => file.endsWith('.md'));
  
  for (const file of mdFiles) {
    const filePath = path.join(collectionPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse frontmatter (between --- markers)
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        const frontmatter = yaml.load(frontmatterMatch[1]);
        const title = frontmatter?.title;
        const pdfUrl = frontmatter?.pdfUrl;
        
        if (title && pdfUrl) {
          pdfLinks[title] = pdfUrl;
          console.log(`✅ Loaded PDF link: ${title} -> ${pdfUrl}`);
        } else if (title && !pdfUrl) {
          console.warn(`⚠️ No pdfUrl found for: ${title}`);
        }
      } catch (err) {
        console.error(`❌ Error parsing frontmatter in ${file}:`, err.message);
      }
    }
  }
}

// Write JSON file
fs.writeFileSync(outputPath, JSON.stringify(pdfLinks, null, 2), 'utf-8');
console.log(`✅ Generated PDF links file: ${outputPath}`);
console.log(`📊 Total PDF links: ${Object.keys(pdfLinks).length}`);

