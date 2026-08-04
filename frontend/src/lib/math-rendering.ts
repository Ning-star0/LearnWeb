export function printMathMarkdown(markdown: string) {
  return markdown.replace(/\$\$([\s\S]*?)\$\$/g, (_block, formula: string) => {
    const printFormula = formula.replace(/\\frac\b/g, '\\dfrac');
    return `$$${printFormula}$$`;
  });
}
