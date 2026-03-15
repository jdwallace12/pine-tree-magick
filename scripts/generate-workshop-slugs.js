// scripts/generate-workshop-slugs.js
// Reads workshop markdown files at build time and generates a JSON mapping of
// { "Workshop Title": "workshop-slug" } so Netlify functions can use it at runtime.
// Only includes workshops that have a payPalButtonId (i.e. paid workshops).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const workshopContentPath = path.join(projectRoot, 'src/content/workshop');
const outputPath = path.join(projectRoot, 'netlify/functions/workshop-slugs.json');

const workshopSlugs = {};

if (!fs.existsSync(workshopContentPath)) {
  console.warn(`⚠️ Workshop content directory not found: ${workshopContentPath}`);
  process.exit(0);
}

const files = fs.readdirSync(workshopContentPath);
const mdFiles = files.filter((file) => file.endsWith('.md'));

for (const file of mdFiles) {
  const filePath = path.join(workshopContentPath, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse frontmatter (between --- markers)
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    try {
      const frontmatter = yaml.load(frontmatterMatch[1]);
      const title = frontmatter?.title;
      // Slug can be explicit in frontmatter or derived from the filename
      const slug = frontmatter?.slug || file.replace(/\.md$/, '');
      const payPalButtonId = frontmatter?.payPalButtonId;
      const maxParticipants = frontmatter?.maxParticipants ?? null;

      if (title && slug && payPalButtonId) {
        workshopSlugs[title] = { slug, maxParticipants };
        console.log(`✅ Loaded workshop: "${title}" -> "${slug}" (max: ${maxParticipants ?? 'unlimited'})`);
      } else if (title && !payPalButtonId) {
        console.warn(`⚠️ Skipping "${title}" — no payPalButtonId (not a paid workshop)`);
      }
    } catch (err) {
      console.error(`❌ Error parsing frontmatter in ${file}:`, err.message);
    }
  }
}

// Write JSON file
fs.writeFileSync(outputPath, JSON.stringify(workshopSlugs, null, 2), 'utf-8');
console.log(`✅ Generated workshop slugs file: ${outputPath}`);
console.log(`📊 Total paid workshops: ${Object.keys(workshopSlugs).length}`);
