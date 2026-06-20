'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Brain, Check, CheckCircle2, ChevronLeft, Clock3, HelpCircle, Keyboard, Sparkles, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

const SCOPE_MAP: Record<string, string> = {
  all: '全部题库',
  book: '按教材',
  wrong: '错题本',
  review: '待背题',
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
  const type = normalizeTypeParam(searchParams.get('type'));
  const order = searchParams.get('order') || 'random';

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [judgeAnswer, setJudgeAnswer] = useState<boolean | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<any>(null);
  const [showSupporterPrompt, setShowSupporterPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [studyAction, setStudyAction] = useState<string | null>(null);
  const [quizUncertain, setQuizUncertain] = useState(false);
  const [trialDialog, setTrialDialog] = useState<{ open: boolean; remaining: number }>({
    open: false,
    remaining: 5,
  });

  const resetState = () => {
    setSelectedOption('');
    setSelectedOptions([]);
    setJudgeAnswer(null);
    setShortAnswer('');
    setSubmitted(false);
    setResult(null);
    setAiExplanation(null);
    setStudyAction(null);
    setShowSupporterPrompt(false);
    setQuizUncertain(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('scope', scope);
    if (bookId) params.set('bookId', bookId);
    if (type) params.set('type', type);
    params.set('order', order);
    params.set('limit', '50');

    api.get(`/practice/questions?${params.toString()}`)
      .then((res) => {
        if (res.code === 0) {
          setQuestions(res.data);
          setCurrentIndex(0);
          resetState();
        } else {
          setQuestions([]);
          setLoadError(res.message || '题目加载失败');
        }
      })
      .catch(() => {
        setQuestions([]);
        setLoadError('题目加载失败，请稍后重试');
      })
      .finally(() => setLoading(false));
  }, [authLoading, user, mode, scope, bookId, type, order, router]);

  const backToSelect = () => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('scope', scope);
    if (bookId) params.set('bookId', bookId);
    if (type) params.set('type', type);
    params.set('order', order);
    router.push(`/practice/select?${params.toString()}`);
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const correctAnswer = submitted && result ? result.correctAnswer : currentQuestion?.answerJson;
  const canGoPrevious = currentIndex > 0;
  const isLastQuestion = currentIndex >= questions.length - 1;

  const canSubmit = useMemo(() => {
    if (!currentQuestion || submitted) return false;
    if (currentQuestion.type === 'SINGLE') return Boolean(selectedOption);
    if (currentQuestion.type === 'MULTIPLE') return selectedOptions.length > 0;
    if (currentQuestion.type === 'JUDGE') return judgeAnswer !== null;
    if (currentQuestion.type === 'SHORT') return shortAnswer.trim().length > 0;
    return false;
  }, [currentQuestion, submitted, selectedOption, selectedOptions, judgeAnswer, shortAnswer]);

  const previousQuestion = useCallback(() => {
    if (currentIndex <= 0) return;
    resetState();
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, [currentIndex]);

  const nextQuestion = useCallback(() => {
    resetState();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => Math.min(questions.length - 1, index + 1));
    } else {
      backToSelect();
    }
  }, [currentIndex, questions.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previousQuestion();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previousQuestion, nextQuestion]);

  const handleStudyAction = async (action: 'remembered' | 'not_remembered') => {
    setStudyAction(action);
    await api.post('/practice/study-action', {
      questionId: currentQuestion.id,
      action,
    });
  };

  const handleSubmit = async (answerOverride?: unknown) => {
    if (!currentQuestion || submitted) return;

    let userAnswer = answerOverride;
    if (userAnswer === undefined) {
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
    }

    const res = await api.post('/practice/submit', {
      questionId: currentQuestion.id,
      userAnswer,
    });
    setSubmitted(true);
    setResult(res.data || res);
  };

  const handleSingleAnswer = (label: string) => {
    if (submitted || mode === 'study') return;
    setSelectedOption(label);
    handleSubmit(label);
  };

  const handleJudgeAnswer = (value: boolean) => {
    if (submitted || mode === 'study') return;
    setJudgeAnswer(value);
    handleSubmit(value);
  };

  const handleAiExplanation = async (useTrial = false) => {
    setAiLoading(true);
    setShowSupporterPrompt(false);
    const res = await api.post(`/questions/${currentQuestion.id}/ai-explanation`, useTrial ? { useTrial: true } : {});
    if (res.code === -1 && res.message === 'TRIAL_CONFIRM_REQUIRED') {
      setTrialDialog({
        open: true,
        remaining: res.data?.trialRemaining || 5,
      });
    } else if (res.code === -1 && res.message === 'NEED_SUPPORTER') {
      // 跳转到支付页面并说明原因
      router.push('/payment?from=ai');
      return;
    } else if (res.code === 0 && res.data) {
      // 尝试解析 JSON 格式的 AI 回复
      const raw = res.data.content || '';
      try {
        const parsed = JSON.parse(raw);
        setAiExplanation(parsed);
      } catch {
        // 兼容旧格式（纯文本）
        setAiExplanation({ correctReason: raw });
      }
    } else {
      setAiExplanation({ correctReason: res.message || '获取失败' });
    }
    setAiLoading(false);
  };

  if (authLoading || loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-muted-foreground">加载题目中...</div>;
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <h1 className="text-2xl font-semibold">题目加载失败</h1>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <PracticeFilterSummary mode={mode} scope={scope} type={type} order={order} />
            <Button onClick={backToSelect}>返回重新选择</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <h1 className="text-2xl font-semibold">暂无题目</h1>
            <p className="text-sm text-muted-foreground">当前范围没有可练习的题，可以换一个范围或题型。</p>
            <PracticeFilterSummary mode={mode} scope={scope} type={type} order={order} />
            <Button onClick={backToSelect}>返回重新选择</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-3 py-2 sm:px-4 sm:py-3 lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      <div className="mb-3 flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" onClick={backToSelect} className="shrink-0">
            <ChevronLeft className="size-4" />
            重新选择
          </Button>
          <div className="min-w-0">
            <div className="hidden flex-wrap items-center gap-2 sm:flex">
              <Badge variant="secondary">{MODE_MAP[mode] || mode}</Badge>
              <Badge variant="outline">{TYPE_MAP[currentQuestion.type]}</Badge>
              <Badge variant="outline" className="max-w-48 truncate">{currentQuestion.book?.name}</Badge>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={previousQuestion} disabled={!canGoPrevious}>
            <ArrowLeft className="size-4" />
            上一题
          </Button>
          {mode === 'quiz' && !submitted && (currentQuestion.type === 'MULTIPLE' || currentQuestion.type === 'SHORT') && (
            <Button size="sm" onClick={() => handleSubmit()} disabled={!canSubmit}>
              提交答案
            </Button>
          )}
          {mode === 'quiz' && !submitted && (currentQuestion.type === 'SINGLE' || currentQuestion.type === 'JUDGE') && (
            <Badge variant="secondary" className="hidden h-8 px-3 sm:inline-flex">点击选项自动判题</Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => handleAiExplanation()} disabled={aiLoading} className="lg:hidden">
            <Sparkles className="size-4" />
            AI
          </Button>
          <Button variant="outline" size="sm" onClick={nextQuestion}>
            {isLastQuestion ? '完成' : '下一题'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_460px]">
        <main className="min-h-0">
          <Card className="flex min-h-[calc(100dvh-9.5rem)] flex-col sm:min-h-[520px] lg:h-full lg:min-h-0">
            <CardHeader className="shrink-0 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 text-sm text-muted-foreground">第 {currentIndex + 1} / {questions.length} 题</div>
                  <CardTitle className="text-lg leading-relaxed sm:text-xl">
                    {currentQuestion.stem}
                  </CardTitle>
                </div>
                <Badge className="shrink-0">{TYPE_MAP[currentQuestion.type]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto pt-3 sm:space-y-4 sm:pt-4">
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
                              if (!submitted && mode !== 'study') handleSingleAnswer(opt.label);
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
                    if (!submitted && mode !== 'study') handleJudgeAnswer(value === 'true');
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
                  currentQuestion.type === 'SHORT'
                    ? 'border-blue-200 bg-blue-50 text-blue-950'
                    : result.isCorrect
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                      : 'border-red-200 bg-red-50 text-red-950'
                }`}>
                  <div className="flex items-center gap-2 font-medium">
                    {currentQuestion.type !== 'SHORT' && (result.isCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />)}
                    {currentQuestion.type === 'SHORT'
                      ? '请对照参考答案自查'
                      : result.isCorrect ? '回答正确' : '回答错误'}
                  </div>
                  {currentQuestion.type === 'SHORT' && (
                    <p className="mt-2 text-sm">参考答案：{currentQuestion.answerRaw || formatAnswer(currentQuestion.answerJson)}</p>
                  )}
                  {!result.isCorrect && currentQuestion.type !== 'SHORT' && (
                    <p className="mt-2 text-sm">正确答案：{formatAnswer(result.correctAnswer)}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <aside className="hidden min-h-0 gap-3 lg:grid lg:grid-rows-[minmax(0,1fr)_auto]">
          <Card className="lg:order-last">
            <CardHeader className="hidden">
              <CardTitle className="flex items-center justify-between">
                <span>进度</span>
                <span className="text-sm text-muted-foreground">{currentIndex + 1} / {questions.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">进度</span>
                  <span className="text-muted-foreground">{currentIndex + 1} / {questions.length}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="hidden grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground">范围</div>
                  <div className="mt-1 font-medium">{scope === 'wrong' ? '错题本' : scope === 'review' ? '待背题' : scope === 'book' ? '指定教材' : '全部题库'}</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground">排序</div>
                  <div className="mt-1 font-medium">{order === 'random' ? '随机' : '顺序'}</div>
                </div>
              </div>
              <Separator className="hidden" />

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
                  {isLastQuestion ? '完成' : '下一题'}
                  <ArrowRight className="size-4" />
                </Button>
              )}

              {mode === 'quiz' && !submitted && (currentQuestion.type === 'MULTIPLE' || currentQuestion.type === 'SHORT') && (
                <div className="flex gap-2 w-full">
                  <Button onClick={() => handleSubmit()} className="flex-1" disabled={!canSubmit}>
                    提交答案
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setQuizUncertain(true);
                      setSubmitted(true);
                      setResult({ isCorrect: false, correctAnswer: currentQuestion.answerJson });
                      api.post('/practice/submit', {
                        questionId: currentQuestion.id,
                        userAnswer: 'UNCERTAIN',
                      });
                    }}
                  >
                    <HelpCircle className="size-4 mr-1" />
                    不确定
                  </Button>
                </div>
              )}

              {mode === 'quiz' && submitted && (
                <Button onClick={nextQuestion} className="w-full">
                  {isLastQuestion ? '完成刷题' : '下一题'}
                  <ArrowRight className="size-4" />
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={previousQuestion} disabled={!canGoPrevious}>
                  <ArrowLeft className="size-4" />
                  上一题
                </Button>
                <Button variant="outline" onClick={nextQuestion}>
                  下一题
                  <ArrowRight className="size-4" />
                </Button>
              </div>

              <div className="hidden rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
                <Keyboard className="mr-1 inline size-3.5" />
                键盘方向键：左键上一题，右键下一题。
              </div>

              <Button variant="outline" onClick={() => handleAiExplanation()} disabled={aiLoading} className="w-full">
                <Sparkles className="size-4" />
                {aiLoading ? '加载中...' : '查看 AI 解析'}
              </Button>
            </CardContent>
          </Card>

          <Card className="min-h-0 border-blue-200 bg-blue-50/40 lg:order-first">
            <CardHeader className="shrink-0 border-b border-blue-100 pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 text-blue-500" />
                  AI 解析
                </span>
                <Button variant="outline" size="sm" onClick={() => handleAiExplanation()} disabled={aiLoading}>
                  {aiLoading ? '加载中' : '查看'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 overflow-y-auto p-4 text-sm">
              {!aiExplanation && !showSupporterPrompt && (
                <div className="rounded-lg border border-blue-100 bg-white/70 p-4 text-sm leading-relaxed text-muted-foreground">
                  <Brain className="mr-1 inline size-4" />
                  答错会进入错题本；背题时点“没记住”会进入待背题。需要解析时点击上方“查看 AI 解析”。
                </div>
              )}
              {aiExplanation && (
                <div className="space-y-4">
                  {aiExplanation.knowledgePoint && (
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1">考察知识点</h4>
                      <p className="text-muted-foreground">{aiExplanation.knowledgePoint}</p>
                    </div>
                  )}
                  {aiExplanation.correctReason && (
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1">正确答案分析</h4>
                      <div className="prose prose-sm max-w-none text-muted-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-4">
                        <ReactMarkdown>{aiExplanation.correctReason}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {aiExplanation.wrongReason && (
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1">错误选项辨析</h4>
                      <div className="prose prose-sm max-w-none text-muted-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-4">
                        <ReactMarkdown>{aiExplanation.wrongReason}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {aiExplanation.memoryTip && (
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1">记忆方法</h4>
                      <p className="text-muted-foreground">{aiExplanation.memoryTip}</p>
                    </div>
                  )}
                  {aiExplanation.similarJudge && (
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1">类似题判断</h4>
                      <p className="text-muted-foreground">{aiExplanation.similarJudge}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    本解析由 AI 生成，仅供学习参考，可能存在不准确之处，请以教材、课堂内容和教师要求为准。
                  </p>
                </div>
              )}
              {showSupporterPrompt && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-medium text-amber-800 mb-2">支持项目，解锁 AI 解析功能</h3>
                  <p className="text-sm text-amber-700 mb-3">
                    试用次数已用完。基础刷题、背题、查看正确答案功能永久免费，支持者可继续查看 AI 解析。
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowSupporterPrompt(false)}>我知道了</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {(aiExplanation || showSupporterPrompt) && (
        <Card className="mt-3 border-blue-200 bg-blue-50/40 lg:hidden">
          <CardContent className="space-y-3 p-4 text-sm">
            {aiExplanation && (
              <>
                {aiExplanation.knowledgePoint && (
                  <div>
                    <h4 className="font-medium text-blue-800">考察知识点</h4>
                    <p className="mt-1 text-muted-foreground">{aiExplanation.knowledgePoint}</p>
                  </div>
                )}
                {aiExplanation.correctReason && (
                  <div>
                    <h4 className="font-medium text-blue-800">正确答案分析</h4>
                    <div className="prose prose-sm max-w-none text-muted-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-4">
                      <ReactMarkdown>{aiExplanation.correctReason}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {aiExplanation.memoryTip && (
                  <div>
                    <h4 className="font-medium text-blue-800">记忆方法</h4>
                    <p className="mt-1 text-muted-foreground">{aiExplanation.memoryTip}</p>
                  </div>
                )}
              </>
            )}
            {showSupporterPrompt && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                试用次数已用完。基础刷题、背题、查看正确答案功能永久免费，支持者可继续查看 AI 解析。
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={trialDialog.open} onOpenChange={(open) => setTrialDialog((current) => ({ ...current, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI 解析试用</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>AI 解析属于付费支持功能，可先试用 {trialDialog.remaining} 次。试用会消耗次数，次数用完后需要支持项目后继续使用。</p>
            <p>基础刷题、背题和查看正确答案功能永久免费。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialDialog((current) => ({ ...current, open: false }))}>
              暂不使用
            </Button>
            <Button
              onClick={() => {
                setTrialDialog((current) => ({ ...current, open: false }));
                handleAiExplanation(true);
              }}
            >
              开始试用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PracticeFilterSummary({
  mode,
  scope,
  type,
  order,
}: {
  mode: string;
  scope: string;
  type: string;
  order: string;
}) {
  return (
    <div className="mx-auto grid max-w-sm grid-cols-2 gap-2 rounded-lg bg-muted p-3 text-left text-sm">
      <span className="text-muted-foreground">范围</span>
      <span className="font-medium">{SCOPE_MAP[scope] || scope}</span>
      <span className="text-muted-foreground">模式</span>
      <span className="font-medium">{MODE_MAP[mode] || mode}</span>
      <span className="text-muted-foreground">题型</span>
      <span className="font-medium">{type ? TYPE_MAP[type] || type : '全部题型'}</span>
      <span className="text-muted-foreground">排序</span>
      <span className="font-medium">{order === 'random' ? '随机排序' : '顺序排列'}</span>
    </div>
  );
}

function normalizeTypeParam(value: string | null) {
  if (!value || value === '_all' || value === 'all') return '';
  return TYPE_MAP[value] ? value : '';
}

export default function PracticePageWrapper() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-center">加载中...</div>}>
      <PracticePage />
    </Suspense>
  );
}
