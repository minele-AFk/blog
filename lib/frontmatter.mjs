import matter from 'gray-matter';

// gray-matter auto-selects an eval-based JS engine for ---js/---javascript.
// Content is data: reject language switches before either parsing or stringify.
function assertYaml(raw) {
  if (typeof raw !== 'string') throw new TypeError('Markdown must be a string');
  const language = /^---([^\r\n]*)/.exec(raw.replace(/^\uFEFF/, ''))?.[1].trim();
  if (language && !language.startsWith('-') && !['yaml', 'yml'].includes(language.toLowerCase())) {
    throw new Error('Only YAML frontmatter is allowed');
  }
}

export function parseFrontmatter(raw) {
  assertYaml(raw);
  return matter(raw, { language: 'yaml' });
}

export function stringifyFrontmatter(content, data) {
  if (typeof content !== 'string') throw new TypeError('Markdown must be a string');
  // Pass an object so gray-matter cannot interpret the body as executable frontmatter.
  return matter.stringify({ content }, data, { language: 'yaml' });
}
