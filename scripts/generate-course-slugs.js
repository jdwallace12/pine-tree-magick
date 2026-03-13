// scripts/generate-course-slugs.js
// Reads course markdown files at build time and generates a JSON mapping of
// { "Course Title": "course-slug" } so Netlify functions can use it at runtime.
// Only includes courses that have a payPalButtonId (i.e. paid courses).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const courseContentPath = path.join(projectRoot, 'src/content/course');
const outputPath = path.join(projectRoot, 'netlify/functions/course-slugs.json');

const courseSlugs = {};

if (!fs.existsSync(courseContentPath)) {
  console.warn(`⚠️ Course content directory not found: ${courseContentPath}`);
  process.exit(0);
}

const files = fs.readdirSync(courseContentPath);
const mdFiles = files.filter((file) => file.endsWith('.md'));

for (const file of mdFiles) {
  const filePath = path.join(courseContentPath, file);
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

      if (title && slug && payPalButtonId) {
        courseSlugs[title] = slug;
        console.log(`✅ Loaded course: "${title}" -> "${slug}"`);
      } else if (title && !payPalButtonId) {
        console.warn(`⚠️ Skipping "${title}" — no payPalButtonId (not a paid course)`);
      }
    } catch (err) {
      console.error(`❌ Error parsing frontmatter in ${file}:`, err.message);
    }
  }
}

// Write JSON file
fs.writeFileSync(outputPath, JSON.stringify(courseSlugs, null, 2), 'utf-8');
console.log(`✅ Generated course slugs file: ${outputPath}`);
console.log(`📊 Total paid courses: ${Object.keys(courseSlugs).length}`);
