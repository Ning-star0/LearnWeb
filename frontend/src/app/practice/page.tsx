'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Brain, Check, CheckCircle2, ChevronLeft, Clock3, Sparkles, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const TYPE_MAP: Record<string, string> = {
  SINGLE: '单选题',
  MULTIPLE: '多选题',
  JUDGE: '判断题',
  SHORT: '简答题',
};

const MODE_MAP: Record<string, string> = {
  study: '背题模式',
  quiz: '答题模式',
};

function answerContains(answer: unknown, label: string) {
  if (Array.isArray(answer)) return answer.includes(label);
  return answer === label;
}

function formatAnswer(answer: unknown) {
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'boolean') return answer ? '正确' : '错误';
  return String(answer ?? '');
}

interface QuestionOption {
  label: string;
  content: string;
}

interface PracticeQuestion {
  id: number;
  type: string;
  stem: string;
  answerRaw?: string | null;
  answerJson?: unknown;
  book?: { name?: string };
  options?: QuestionOption[];
}

interface SubmitResult {
  isCorrect: boolean;
  correctAnswer?: unknown;
}

function PracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const mode = searchParams.get('mode') || 'study';
  const scope = searchParams.get('scope') || 'all';
  const bookId = searchParams.get('bookId') || '';
  const type = searchParams.get('type') || '';
  const order = searchParams.get('order') || 'random';

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [judgeAnswer, setJudgeAnswer] = useState<boolean | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [supporterDialogOpen, setSupporterDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [studyAction, setStudyAction] = useState<string | null>(null);

  const resetState = () => {
    setSelectedOption('');
    setSelectedOptions([]);
    setJudgeAnswer(null);
    setShortAnswer('');
    setSubmitted(false);
    setResult(null);
    setAiExplanation(null);
    setStudyAction(null);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('scope', scope);
    if (bookId) params.set('bookId', bookId);
    if (type) params.set('type', type);
    params.set('order', order);
    params.set('limit', '50');

    api.get(`/practice/questions?${params.toString()}`).then((res) => {
      if (res.code === 0) {
        setQuestions(res.data);
        setCurrentIndex(0);
        resetState();
      }
      setLoading(false);
    });
  }, [authLoading, user, mode, scope, bookId, type, order, router]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const correctAnswer = submitted && result ? result.correctAnswer : currentQuestion?.answerJson;

  const canSubmit = useMemo(() => {
    if (!currentQuestion || submitted) return false;
    if (currentQuestion.type === 'SINGLE') return Boolean(selectedOption);
    if (currentQuestion.type === 'MULTIPLE') return selectedOptions.length > 0;
    if (currentQuestion.type === 'JUDGE') return judgeAnswer !== null;
    if (currentQuestion.type === 'SHORT') return shortAnswer.trim().length > 0;
    return false;
  }, [currentQuestion, submitted, selectedOption, selectedOptions, judgeAnswer, shortAnswer]);

  const nextQuestion = () => {
    resetState();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push('/practice/select');
    }
  };

  const handleStudyAction = async (action: 'remembered' | 'not_remembered') => {
    setStudyAction(action);
    await api.post('/practice/study-action', {
      questionId: currentQuestion.id,
      action,
    });
  };

  const handleSubmit = async () => {
    let userAnswer: unknown;
    switch (currentQuestion.type) {
      case 'SINGLE':
        userAnswer = selectedOption;
        break;
      case 'MULTIPLE':
        userAnswer = selectedOptions;
        break;
      case 'JUDGE':
        userAnswer = judgeAnswer;
        break;
      case 'SHORT':
        userAnswer = true;
        break;
    }

    const res = await api.post('/practice/submit', {
      questionId: currentQuestion.id,
      userAnswer,
    });
    setSubmitted(true);
    setResult(res.data || res);
  };

  const handleAiExplanation = async () => {
    setAiLoading(true);
    const res = await api.post(`/questions/${currentQuestion.id}/ai-explanation`);
    if (res.code === -1 && res.message === 'NEED_SUPPORTER') {
      setSupporterDialogOpen(true);
    } else if (res.code === 0 && res.data) {
      setAiExplanation(res.data.content || '暂无解析');
      setAiDialogOpen(true);
    } else {
      setAiExplanation(res.message || '获取失败');
      setAiDialogOpen(true);
    }
    setAiLoading(false);
  };

  if (authLoading || loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-muted-foreground">加载题目中...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">暂无题目</h1>
        <p className="mt-2 text-sm text-muted-foreground">当前范围没有可练习的题，可以换一个范围或题型。</p>
        <Button className="mt-6" onClick={() => router.push('/practice/select')}>重新选择</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 lg:py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/practice/select')} className="w-fit">
          <ChevronLeft className="size-4" />
          重新选择
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{MODE_MAP[mode] || mode}</Badge>
          <Badge variant="outline">{TYPE_MAP[currentQuestion.type]}</Badge>
          <Badge variant="outline">{currentQuestion.book?.name}</Badge>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-4">
          <Card className="min-h-[420px]">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 text-sm text-muted-foreground">第 {currentIndex + 1} 题</div>
                  <CardTitle className="text-xl leading-relaxed">
                    {currentQuestion.stem}
                  </CardTitle>
                </div>
                <Badge>{TYPE_MAP[currentQuestion.type]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              {(currentQuestion.type === 'SINGLE' || currentQuestion.type === 'MULTIPLE') && (
                <div className="grid gap-3">
                  {currentQuestion.options?.map((opt) => {
                    const selected = currentQuestion.type === 'MULTIPLE'
                      ? selectedOptions.includes(opt.label)
                      : selectedOption === opt.label;
                    const isCorrect = mode === 'study' || submitted
                      ? answerContains(correctAnswer, opt.label)
                      : false;
                    const isWrongSelected = submitted && result && !result.isCorrect && selected && !isCorrect;

                    return (
                      <label
                        key={opt.label}
                        htmlFor={`opt-${opt.label}`}
                        className={`grid min-h-14 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border p-3 transition ${
                          isCorrect ? 'border-emerald-600 bg-emerald-50 text-emerald-950' :
                          isWrongSelected ? 'border-red-500 bg-red-50 text-red-950' :
                          selected ? 'border-foreground bg-muted' : 'border-border hover:border-foreground/40'
                        }`}
                      >
                        {currentQuestion.type === 'MULTIPLE' ? (
                          <Checkbox
                            id={`opt-${opt.label}`}
                            checked={selected}
                            onCheckedChange={(checked) => {
                              if (!submitted && mode !== 'study') {
                                setSelectedOptions(checked ? [...selectedOptions, opt.label] : selectedOptions.filter((item) => item !== opt.label));
                              }
                            }}
                            disabled={submitted || mode === 'study'}
                          />
                        ) : (
                          <input
                            id={`opt-${opt.label}`}
                            type="radio"
                            name="option"
                            value={opt.label}
                            checked={selected}
                            onChange={() => {
                              if (!submitted && mode !== 'study') setSelectedOption(opt.label);
                            }}
                            disabled={submitted || mode === 'study'}
                            className="size-4"
                          />
                        )}
                        <span className="text-sm leading-relaxed">
                          <span className="mr-2 font-semibold">{opt.label}.</span>
                          {opt.content}
                        </span>
                        {isCorrect && <Check className="size-4 text-emerald-700" />}
                        {isWrongSelected && <XCircle className="size-4 text-red-600" />}
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'JUDGE' && (
                <RadioGroup
                  value={judgeAnswer === null ? '' : String(judgeAnswer)}
                  onValueChange={(value) => {
                    if (!submitted && mode !== 'study') setJudgeAnswer(value === 'true');
                  }}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {[
                    { value: 'true', label: '正确' },
                    { value: 'false', label: '错误' },
                  ].map((item) => {
                    const itemValue = item.value === 'true';
                    const isCorrect = (mode === 'study' || submitted) && Boolean(correctAnswer) === itemValue;
                    const selected = judgeAnswer === itemValue;
                    const isWrongSelected = submitted && result && !result.isCorrect && selected && !isCorrect;
                    return (
                      <Label
                        key={item.value}
                        htmlFor={`judge-${item.value}`}
                        className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                          isCorrect ? 'border-emerald-600 bg-emerald-50 text-emerald-950' :
                          isWrongSelected ? 'border-red-500 bg-red-50 text-red-950' :
                          selected ? 'border-foreground bg-muted' : 'border-border hover:border-foreground/40'
                        }`}
                      >
                        <RadioGroupItem id={`judge-${item.value}`} value={item.value} disabled={submitted || mode === 'study'} />
                        <span className="font-medium">{item.label}</span>
                        {isCorrect && <Check className="ml-auto size-4 text-emerald-700" />}
                      </Label>
                    );
                  })}
                </RadioGroup>
              )}

              {currentQuestion.type === 'SHORT' && (
                <div className="space-y-4">
                  {(mode === 'study' || submitted) && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                      <p className="mb-2 text-sm font-medium">参考答案</p>
                      <p className="text-sm leading-relaxed">{currentQuestion.answerRaw || formatAnswer(currentQuestion.answerJson)}</p>
                    </div>
                  )}
                  {mode === 'quiz' && !submitted && (
                    <Textarea
                      placeholder="输入你的答案，提交后对照参考答案自查。"
                      value={shortAnswer}
                      onChange={(event) => setShortAnswer(event.target.value)}
                      rows={7}
                    />
                  )}
                </div>
              )}

              {submitted && result && (
                <div className={`rounded-lg border p-4 ${
                  result.isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-red-200 bg-red-50 text-red-950'
                }`}>
                  <div className="flex items-center gap-2 font-medium">
                    {result.isCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                    {currentQuestion.type === 'SHORT'
                      ? '请对照参考答案自查'
                      : result.isCorrect ? '回答正确' : '回答错误'}
                  </div>
                  {!result.isCorrect && currentQuestion.type !== 'SHORT' && (
                    <p className="mt-2 text-sm">正确答案：{formatAnswer(result.correctAnswer)}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>进度</span>
                <span className="text-sm text-muted-foreground">{currentIndex + 1} / {questions.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{progress}% 完成</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground">范围</div>
                  <div className="mt-1 font-medium">{scope === 'wrong' ? '错题本' : scope === 'review' ? '待背题' : scope === 'book' ? '指定教材' : '全部题库'}</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground">排序</div>
                  <div className="mt-1 font-medium">{order === 'random' ? '随机' : '顺序'}</div>
                </div>
              </div>
              <Separator />

              {mode === 'study' && !studyAction && (
                <div className="grid gap-2">
                  <Button onClick={() => handleStudyAction('remembered')} className="w-full">
                    <CheckCircle2 className="size-4" />
                    记住了
                  </Button>
                  <Button onClick={() => handleStudyAction('not_remembered')} variant="outline" className="w-full">
                    <Clock3 className="size-4" />
                    没记住
                  </Button>
                </div>
              )}

              {mode === 'study' && studyAction && (
                <Button onClick={nextQuestion} className="w-full">
                  {currentIndex < questions.length - 1 ? '下一题' : '完成'}
                  <ArrowRight className="size-4" />
                </Button>
              )}

              {mode === 'quiz' && !submitted && (
                <Button onClick={handleSubmit} className="w-full" disabled={!canSubmit}>
                  提交答案
                </Button>
              )}

              {mode === 'quiz' && submitted && (
                <Button onClick={nextQuestion} className="w-full">
                  {currentIndex < questions.length - 1 ? '下一题' : '完成刷题'}
                  <ArrowRight className="size-4" />
                </Button>
              )}

              <Button variant="outline" onClick={handleAiExplanation} disabled={aiLoading} className="w-full">
                <Sparkles className="size-4" />
                {aiLoading ? '加载中...' : '查看 AI 解析'}
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
            <Brain className="mr-1 inline size-3.5" />
            答错会进入错题本；背题时点“没记住”会进入待背题。
          </div>
        </aside>
      </div>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI 解析</DialogTitle>
          </DialogHeader>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{aiExplanation}</div>
          <p className="mt-4 text-xs text-muted-foreground">
            本解析由 AI 生成，仅供学习参考，可能存在不准确之处，请以教材、课堂内容和教师要求为准。
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={supporterDialogOpen} onOpenChange={setSupporterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>支持项目，解锁 AI 解析功能</DialogTitle>
            <DialogDescription>
              基础刷题、背题、查看正确答案功能永久免费。支持者可查看 AI 解析（考察知识点、正误辨析、记忆方法等）。
              AI 解析仅供学习参考，不保证考试结果。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupporterDialogOpen(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PracticePageWrapper() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-center">加载中...</div>}>
      <PracticePage />
    </Suspense>
  );
}
