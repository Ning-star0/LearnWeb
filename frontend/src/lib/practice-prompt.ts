const legacyAnswerHeading = /^\s*(?:\*\*)?(?:我的原答案|正确答案|标准解法)(?:：|:)?(?:\*\*)?\s*$/m;

export function practicePrompt(markdown: string) {
  const answerStart = legacyAnswerHeading.exec(markdown);
  return markdown.slice(0, answerStart?.index ?? markdown.length).trim();
}
