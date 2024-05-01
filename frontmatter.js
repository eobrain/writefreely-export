export function extractFrontMatter (inputMarkdown) {
  const lines = inputMarkdown.split('\n')
  const frontMatter = {}
  let i = 0
  if (lines[i] === '---') {
    i++
    while (lines[i] !== '---') {
      const [key, value] = lines[i].split(': ')
      frontMatter[key] = value
      i++
    }
    i++
  }
  const markdown = lines.slice(i).join('\n')
  return { frontMatter, markdown }
}

export const frontMatterText = obj =>
      `---  \n${Object.entries(obj)
          .filter(([k, v]) => v !== undefined)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      }\n---  \n`
