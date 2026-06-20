'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
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

interface UploadItem {
  id: string;
  file: File;
  bankName: string;
  result: ParseResult | null;
  error: string | null;
  imported: boolean;
  phase: 'idle' | 'parsing' | 'parsed' | 'importing' | 'imported' | 'error';
}

interface ProgressState {
  active: boolean;
  label: string;
  currentFile: string;
  done: number;
  failed: number;
  total: number;
}

const MAX_BATCH_FILES = 20;
const MAX_IMPORT_QUESTIONS = 3000;

const TYPE_LABEL: Record<string, string> = {
  SINGLE: '单选',
  MULTIPLE: '多选',
  JUDGE: '判断',
  SHORT: '简答',
};

function getDefaultBankName(fileName: string) {
  return fileName.replace(/\.xlsx$/i, '');
}

function hasParseErrors(item: UploadItem) {
  if (!item.result) return false;
  const rowErrors = item.result.errors.length;
  const questionErrors = item.result.questions.filter((question) => question.errors?.length > 0).length;
  return rowErrors + questionErrors > 0;
}

export default function BankUploadPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState('');
  const [items, setItems] = useState<UploadItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    active: false,
    label: '',
    currentFile: '',
    done: 0,
    failed: 0,
    total: 0,
  });

  useEffect(() => {
    api.get('/books').then((res) => {
      if (res.code === 0) setBooks(res.data);
    });
  }, []);

  const selectedBook = useMemo(
    () => books.find((book) => String(book.id) === bookId),
    [books, bookId],
  );

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (!item.result) return acc;
        acc.files += 1;
        acc.questions += item.result.summary.total;
        acc.errors += item.result.errors.length;
        acc.errors += item.result.questions.filter((question) => question.errors?.length > 0).length;
        return acc;
      },
      { files: 0, questions: 0, errors: 0 },
    );
  }, [items]);

  const importableItems = items.filter(
    (item) =>
      item.result &&
      !item.imported &&
      !item.error &&
      !hasParseErrors(item) &&
      item.bankName.trim() &&
      item.result.questions.length > 0,
  );

  const canParse = Boolean(bookId && items.length > 0);
  const canImport = importableItems.length > 0;
  const importQuestionTotal = importableItems.reduce(
    (total, item) => total + (item.result?.questions.length || 0),
    0,
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > MAX_BATCH_FILES) {
      toast.error(`一次最多选择 ${MAX_BATCH_FILES} 个文件，请分批上传`);
      event.target.value = '';
      return;
    }
    setItems(
      files.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}`,
        file,
        bankName: getDefaultBankName(file.name),
        result: null,
        error: null,
        imported: false,
        phase: 'idle',
      })),
    );
    setProgress({ active: false, label: '', currentFile: '', done: 0, failed: 0, total: 0 });
  };

  const updateBankName = (id: string, bankName: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, bankName } : item)),
    );
  };

  const handleParse = async () => {
    if (!bookId || items.length === 0) {
      toast.error('请选择教材并上传 .xlsx 文件');
      return;
    }

    setParsing(true);
    let successCount = 0;
    let failedCount = 0;
    setProgress({
      active: true,
      label: '解析进度',
      currentFile: '',
      done: 0,
      failed: 0,
      total: items.length,
    });

    for (const [index, item] of items.entries()) {
      setProgress((current) => ({
        ...current,
        currentFile: item.file.name,
        done: index,
        failed: failedCount,
      }));
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, phase: 'parsing', error: null } : entry,
        ),
      );

      const formData = new FormData();
      formData.append('bookId', bookId);
      formData.append('file', item.file);

      const res = await api.upload('/admin/banks/parse', formData);
      if (res.code === 0) {
        successCount++;
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, result: res.data, error: null, imported: false, phase: 'parsed' }
              : entry,
          ),
        );
      } else {
        failedCount++;
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  result: null,
                  error: res.message || '解析失败',
                  imported: false,
                  phase: 'error',
                }
              : entry,
          ),
        );
      }
      setProgress((current) => ({
        ...current,
        done: index + 1,
        failed: failedCount,
      }));
    }

    setParsing(false);
    setProgress((current) => ({ ...current, active: false, currentFile: '' }));
    if (failedCount) {
      toast.warning(`解析完成：${successCount} 个成功，${failedCount} 个失败`);
    } else {
      toast.success(`解析完成：${successCount} 个文件`);
    }
  };

  const handleImport = async () => {
    if (!canImport) return;
    if (importQuestionTotal > MAX_IMPORT_QUESTIONS) {
      toast.error(`本批次共 ${importQuestionTotal} 题，单次最多导入 ${MAX_IMPORT_QUESTIONS} 题，请拆分后导入`);
      return;
    }

    setImporting(true);
    let importedFiles = 0;
    let importedQuestions = 0;
    let skippedDuplicates = 0;
    let failedFiles = 0;
    setProgress({
      active: true,
      label: '导入进度',
      currentFile: '',
      done: 0,
      failed: 0,
      total: importableItems.length,
    });

    for (const [index, item] of importableItems.entries()) {
      if (!item.result) continue;
      setProgress((current) => ({
        ...current,
        currentFile: item.file.name,
        done: index,
        failed: failedFiles,
      }));
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, phase: 'importing', error: null } : entry,
        ),
      );

      const res = await api.post('/admin/banks/import', {
        bookId: item.result.bookId,
        name: item.bankName.trim(),
        questions: item.result.questions,
      });

      if (res.code === 0) {
        importedFiles++;
        importedQuestions += res.data.imported || 0;
        skippedDuplicates += res.data.skippedDuplicates || 0;
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, imported: true, error: null, phase: 'imported' }
              : entry,
          ),
        );
      } else {
        failedFiles++;
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, error: res.message || '导入失败', phase: 'error' }
              : entry,
          ),
        );
      }
      setProgress((current) => ({
        ...current,
        done: index + 1,
        failed: failedFiles,
      }));
    }

    setImporting(false);
    setProgress((current) => ({ ...current, active: false, currentFile: '' }));
    if (failedFiles) {
      toast.warning(`导入完成：${importedFiles} 个成功，${failedFiles} 个失败，跳过重复 ${skippedDuplicates} 题`);
    } else {
      toast.success(`导入成功：${importedFiles} 个题库，共 ${importedQuestions} 题，跳过重复 ${skippedDuplicates} 题`);
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
            仅管理员可上传。支持多选 .xlsx 批量解析和导入，系统会限制单批题量并顺序导入。
          </p>
        </div>
        <Button onClick={handleImport} disabled={!canImport || importing || parsing}>
          <CheckCircle2 className="size-4" />
          {importing ? '导入中...' : `确认导入 ${importableItems.length} 个题库`}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-4" />
                文件与导入设置
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
                <Label htmlFor="bank-file">Excel 文件</Label>
                <Input id="bank-file" type="file" accept=".xlsx" multiple onChange={handleFileChange} />
              </div>

              <div className="md:col-span-2">
                <Button onClick={handleParse} disabled={!canParse || parsing || importing}>
                  <Upload className="size-4" />
                  {parsing ? '解析中...' : `解析 ${items.length || 0} 个文件`}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>批量文件</span>
                <Badge variant={totals.errors ? 'destructive' : 'secondary'}>
                  {items.length} 个文件
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  请选择一个或多个 .xlsx 文件。
                </div>
              ) : (
                items.map((item) => (
                  <UploadFileCard
                    key={item.id}
                    item={item}
                    onBankNameChange={(value) => updateBankName(item.id, value)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>导入状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatusRow label="教材" value={selectedBook?.name || '未选择'} />
              <StatusRow label="文件数" value={`${items.length} 个`} />
              <StatusRow label="已解析" value={`${totals.files} 个`} />
              <StatusRow label="总题数" value={`${totals.questions} 题`} />
              <StatusRow label="可导入" value={`${importableItems.length} 个题库`} />
              <StatusRow label="错误" value={`${totals.errors} 个`} />
              <StatusRow label="题量上限" value={`${MAX_IMPORT_QUESTIONS} 题/次`} />
              {progress.total > 0 && (
                <ProgressPanel progress={progress} />
              )}
              <Separator />
              <Button className="w-full" onClick={handleImport} disabled={!canImport || importing || parsing}>
                {importing ? '导入中...' : '确认导入'}
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Excel 格式</p>
            <p className="mt-2">第 1 行为表头；从第 2 行开始读取。</p>
            <p className="mt-2">A列题序，B列题型，C列题目，D列答案，E列开始为选项。</p>
            <p className="mt-2">题型可写：单选、多选、判断、简答。答案可写 A/B/C，也兼容 1/2/3。</p>
            <p className="mt-2">一次最多选择 {MAX_BATCH_FILES} 个文件；单次导入最多 {MAX_IMPORT_QUESTIONS} 题。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function UploadFileCard({
  item,
  onBankNameChange,
}: {
  item: UploadItem;
  onBankNameChange: (value: string) => void;
}) {
  const hasErrors = hasParseErrors(item);
  const status = item.imported
    ? { label: '已导入', variant: 'secondary' as const }
    : item.phase === 'importing'
      ? { label: '导入中', variant: 'outline' as const }
      : item.phase === 'parsing'
        ? { label: '解析中', variant: 'outline' as const }
    : item.error || hasErrors
      ? { label: '需处理', variant: 'destructive' as const }
      : item.result
        ? { label: '可导入', variant: 'secondary' as const }
        : { label: '待解析', variant: 'outline' as const };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{item.file.name}</p>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {(item.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <div className="w-full lg:w-72">
          <Label className="text-xs">题库名称</Label>
          <Input
            className="mt-1"
            value={item.bankName}
            onChange={(event) => onBankNameChange(event.target.value)}
          />
        </div>
      </div>

      {item.error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950">
          {item.error}
        </div>
      )}

      {item.result && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-5">
            <Summary label="总题数" value={item.result.summary.total} />
            <Summary label="单选" value={item.result.summary.single} />
            <Summary label="多选" value={item.result.summary.multiple} />
            <Summary label="判断" value={item.result.summary.judge} />
            <Summary label="简答" value={item.result.summary.short} />
          </div>

          {hasErrors && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <AlertCircle className="size-4" />
                请先修正 Excel 中的错误后重新上传
              </div>
              <div className="space-y-1">
                {item.result.errors.slice(0, 6).map((error) => (
                  <p key={`${error.row}-${error.message}`}>第 {error.row} 行：{error.message}</p>
                ))}
                {item.result.questions
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
            <div className="max-h-72 overflow-y-auto">
              {item.result.questions.slice(0, 80).map((question) => (
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
        </div>
      )}
    </div>
  );
}

function ProgressPanel({ progress }: { progress: ProgressState }) {
  const completed = Math.min(progress.done, progress.total);
  const percent =
    progress.total > 0 ? Math.round((completed / progress.total) * 100) : 0;

  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{progress.label}</span>
        <span className="text-muted-foreground">{percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p>
          已完成 {completed}/{progress.total}
          {progress.failed ? `，失败 ${progress.failed}` : ''}
        </p>
        {progress.currentFile && <p className="truncate">当前：{progress.currentFile}</p>}
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
