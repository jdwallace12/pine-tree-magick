const fs = require('fs');
// Very basic manual frontmatter check
const files = [
  "src/content/course/magickal-foundations.md",
  "src/content/course/chakra-balancing.md",
  "src/content/course/chakra-mastery.md"
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(file, "NOT FOUND");
    continue;
  }
  const content = fs.readFileSync(file, "utf8");
  const hasFeatures = content.includes("features:");
  console.log(file, "Has features string:", hasFeatures);
}
