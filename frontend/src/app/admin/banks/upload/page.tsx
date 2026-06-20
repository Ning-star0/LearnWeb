'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface Book {
  id: number;
  name: string;
  _count?: { questions: number };
}

interface ParsedQuestion {
  orderNo: number;
  type: 'SINGLE' | 'MULTIPLE' | 'JUDGE' | 'SHORT';
  stem: string;
  answerRaw: string;
  answerJson: unknown;
  options: { label: string; content: string; orderNo: number }[];
  rawRow: number;
  errors: string[];
}

interface ParseResult {
  bookId: number;
  bookName: string;
  success: boolean;
  questions: ParsedQuestion[];
  errors: { row: number; message: string }[];
  summary: {
    total: number;
    single: number;
    multiple: number;
    judge: number;
    short: number;
  };
}

const TYPE_LABEL: Record<string, string> = {
  SINGLE: '单选',
  MULTIPLE: '多选',
  JUDGE: '判断',
  SHORT: '简答',
};

export default function BankUploadPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState('');
  const [bankName, setBankName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState('UNKNOWN');
  const [copyrightRisk, setCopyrightRisk] = useState('LOW');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    api.get('/books').then((res) => {
      if (res.code === 0) setBooks(res.data);
    });
  }, []);

  const selectedBook = useMemo(
    () => books.find((book) => String(book.id) === bookId),
    [books, bookId],
  );

  const rowErrorCount = parseResult?.errors.length || 0;
  const questionErrorCount = parseResult?.questions.filter((question) => question.errors?.length > 0).length || 0;
  const hasErrors = rowErrorCount + questionErrorCount > 0;
  const canParse = Boolean(bookId && file);
  const canImport = Boolean(parseResult && bankName.trim() && parseResult.questions.length > 0 && !hasErrors);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setParseResult(null);
    if (nextFile && !bankName) {
      setBankName(nextFile.name.replace(/\.xlsx$/i, ''));
    }
  };

  const handleParse = async () => {
    if (!bookId || !file) {
      toast.error('请选择教材并上传 .xlsx 文件');
      return;
    }

    const formData = new FormData();
    formData.append('bookId', bookId);
    formData.append('file', file);

    setParsing(true);
    const res = await api.upload('/admin/banks/parse', formData);
    setParsing(false);

    if (res.code === 0) {
      setParseResult(res.data);
      if (res.data.errors?.length) {
        toast.warning('文件已解析，但存在需要处理的错误');
      } else {
        toast.success(`解析成功，共 ${res.data.questions.length} 题`);
      }
    } else {
      toast.error(res.message || '解析失败');
    }
  };

  const handleImport = async () => {
    if (!parseResult || !canImport) return;

    setImporting(true);
    const res = await api.post('/admin/banks/import', {
      bookId: parseResult.bookId,
      name: bankName.trim(),
      sourceType,
      copyrightRisk,
      questions: parseResult.questions,
    });
    setImporting(false);

    if (res.code === 0) {
      toast.success(`导入成功：${res.data.imported} 题`);
      setParseResult(null);
      setFile(null);
      setBankName('');
    } else {
      toast.error(res.message || '导入失败');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/banks">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="size-4" />
              返回题库
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">上传题库</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            支持 .xlsx 文件。列顺序：题序、题型、题目、答案、选项A、选项B、选项C...
          </p>
        </div>
        <Button onClick={handleImport} disabled={!canImport || importing}>
          <CheckCircle2 className="size-4" />
          {importing ? '导入中...' : '确认导入'}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-4" />
                文件与题库信息
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>教材</Label>
                <Select value={bookId} onValueChange={(value) => setBookId(value || '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择教材" />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((book) => (
                      <SelectItem key={book.id} value={String(book.id)}>
                        {book.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank-name">题库名称</Label>
                <Input
                  id="bank-name"
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  placeholder="例如：马原期末复习题"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank-file">Excel 文件</Label>
                <Input id="bank-file" type="file" accept=".xlsx" onChange={handleFileChange} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>来源</Label>
                  <Select value={sourceType} onValueChange={(value) => setSourceType(value || 'UNKNOWN')}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNKNOWN">未知</SelectItem>
                      <SelectItem value="ORIGINAL">原创</SelectItem>
                      <SelectItem value="AUTHORIZED">授权</SelectItem>
                      <SelectItem value="USER_UPLOAD">用户上传</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>版权风险</Label>
                  <Select value={copyrightRisk} onValueChange={(value) => setCopyrightRisk(value || 'LOW')}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">低</SelectItem>
                      <SelectItem value="MEDIUM">中</SelectItem>
                      <SelectItem value="HIGH">高</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="md:col-span-2">
                <Button onClick={handleParse} disabled={!canParse || parsing}>
                  <Upload className="size-4" />
                  {parsing ? '解析中...' : '解析并预览'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {parseResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>解析预览</span>
                  <Badge variant={hasErrors ? 'destructive' : 'secondary'}>
                    {hasErrors ? '存在错误' : '可导入'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-5">
                  <Summary label="总题数" value={parseResult.summary.total} />
                  <Summary label="单选" value={parseResult.summary.single} />
                  <Summary label="多选" value={parseResult.summary.multiple} />
                  <Summary label="判断" value={parseResult.summary.judge} />
                  <Summary label="简答" value={parseResult.summary.short} />
                </div>

                {hasErrors && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <AlertCircle className="size-4" />
                      请先修正 Excel 中的错误后重新上传
                    </div>
                    <div className="space-y-1">
                      {parseResult.errors.slice(0, 6).map((error) => (
                        <p key={`${error.row}-${error.message}`}>第 {error.row} 行：{error.message}</p>
                      ))}
                      {parseResult.questions
                        .filter((question) => question.errors?.length)
                        .slice(0, 6)
                        .map((question) => (
                          <p key={question.rawRow}>第 {question.rawRow} 行：{question.errors.join('；')}</p>
                        ))}
                    </div>
                  </div>
                )}

                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[4rem_5rem_1fr_8rem] bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>行号</span>
                    <span>题型</span>
                    <span>题目</span>
                    <span>答案</span>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    {parseResult.questions.slice(0, 80).map((question) => (
                      <div
                        key={`${question.rawRow}-${question.orderNo}`}
                        className="grid grid-cols-[4rem_5rem_1fr_8rem] gap-2 border-t px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">{question.rawRow}</span>
                        <span>{TYPE_LABEL[question.type]}</span>
                        <span className="line-clamp-2">{question.stem}</span>
                        <span className="truncate text-muted-foreground">{question.answerRaw}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>导入状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatusRow label="教材" value={selectedBook?.name || '未选择'} />
              <StatusRow label="题库名称" value={bankName || '未填写'} />
              <StatusRow label="文件" value={file?.name || '未上传'} />
              <StatusRow label="解析结果" value={parseResult ? `${parseResult.questions.length} 题` : '未解析'} />
              <Separator />
              <Button className="w-full" onClick={handleImport} disabled={!canImport || importing}>
                {importing ? '导入中...' : '确认导入'}
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Excel 格式</p>
            <p className="mt-2">第 1 行为表头；从第 2 行开始读取。</p>
            <p className="mt-2">A列题序，B列题型，C列题目，D列答案，E列开始为选项。</p>
            <p className="mt-2">题型可写：单选、多选、判断、简答。答案可写 A/B/C，也兼容 1/2/3。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
