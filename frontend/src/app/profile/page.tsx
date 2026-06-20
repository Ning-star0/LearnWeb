'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  BarChart3, BookOpen, Brain, CheckCircle2, Clock3, Edit3,
  GraduationCap, History, LogOut, Mail, Play, Shield,
  Sparkles, Target, TrendingUp, User, XCircle,
} from 'lucide-react';

interface BookProgress {
  id: number;
  name: string;
  total: number;
  done: number;
  progress: number;
}

interface MemberInfo {
  isMember: boolean;
  remaining: number;
  trialUsed: number;
  trialRemaining: number;
  subscribed: boolean;
}

interface UserStats {
  totalAnswers: number;
  correctAnswers: number;
  wrongCount: number;
  reviewCount: number;
  studyActions: number;
  accuracy: number;
  membership: MemberInfo;
  books: BookProgress[];
}

export default function ProfilePage() {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState(user?.username || '');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/users/me/stats').then((res) => {
      if (res.code === 0) setStats(res.data);
    });
  }, [user]);

  const handleUpdate = async () => {
    setUpdating(true);
    await api.patch('/users/me', { username });
    toast.success('已保存');
    setUpdating(false);
  };

  if (!user) return null;

  const roleLabel = user.role === 'SUPER_ADMIN' ? '超级管理员' : user.role === 'ADMIN' ? '管理员' : '普通用户';
  const statusLabel = user.status === 'ACTIVE' ? '已激活' : user.status === 'PENDING_VERIFY' ? '待验证' : user.status;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
      {/* 顶部信息卡片 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-2xl font-bold shrink-0">
              {user.username[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{user.username}</h1>
                <Badge variant={user.role === 'SUPER_ADMIN' ? 'destructive' : 'secondary'}>{roleLabel}</Badge>
                <Badge variant={user.status === 'ACTIVE' ? 'default' : 'outline'}>{statusLabel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Mail className="size-3" />{user.email}
              </p>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Link href="/admin"><Button variant="outline" size="sm"><Shield className="size-4 mr-1" />管理后台</Button></Link>
              )}
              <Link href="/payment"><Button variant="outline" size="sm"><Sparkles className="size-4 mr-1" />AI 订阅</Button></Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 会员状态 + 复习进度 */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          <Card className={stats.membership.isMember ? 'border-green-300 bg-green-50/50' : 'border-amber-300 bg-amber-50/50'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className={`size-5 ${stats.membership.isMember ? 'text-green-600' : stats.membership.trialRemaining > 0 ? 'text-amber-600' : 'text-red-500'}`} />
                  <span className="font-medium">
                    {stats.membership.isMember && stats.membership.subscribed
                      ? 'AI 会员已激活'
                      : stats.membership.trialRemaining > 0
                        ? `试用中（剩余 ${stats.membership.trialRemaining}/10 次）`
                        : '未订阅'}
                  </span>
                </div>
                {stats.membership.isMember && stats.membership.subscribed ? (
                  <Badge className="bg-green-600">剩余 {stats.membership.remaining} 天</Badge>
                ) : stats.membership.trialRemaining > 0 ? (
                  <Badge variant="outline">{stats.membership.trialUsed} 次已用</Badge>
                ) : (
                  <Link href="/payment"><Button size="sm" variant="outline">去订阅</Button></Link>
                )}
              </div>
              {stats.membership.subscribed && stats.membership.remaining > 0 && (
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (stats.membership.remaining / 30) * 100)}%` }} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium flex items-center gap-2"><TrendingUp className="size-4 text-blue-500" />复习进度</span>
                <span className="text-sm text-muted-foreground">{stats.correctAnswers}/{stats.totalAnswers} 题正确</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.accuracy}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>正确率 {stats.accuracy}%</span>
                <span>已复习 {stats.totalAnswers} 题</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview"><BarChart3 className="size-4 mr-1" />学习概览</TabsTrigger>
          <TabsTrigger value="books"><BookOpen className="size-4 mr-1" />教材进度</TabsTrigger>
          <TabsTrigger value="settings"><User className="size-4 mr-1" />账号设置</TabsTrigger>
        </TabsList>

        {/* 学习概览 */}
        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="mx-auto size-6 text-green-500 mb-1" />
                    <p className="text-2xl font-bold">{stats.totalAnswers}</p>
                    <p className="text-xs text-muted-foreground">总答题</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Target className="mx-auto size-6 text-blue-500 mb-1" />
                    <p className="text-2xl font-bold">{stats.accuracy}%</p>
                    <p className="text-xs text-muted-foreground">正确率</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <XCircle className="mx-auto size-6 text-red-500 mb-1" />
                    <p className="text-2xl font-bold">{stats.wrongCount}</p>
                    <p className="text-xs text-muted-foreground">待复习错题</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock3 className="mx-auto size-6 text-amber-500 mb-1" />
                    <p className="text-2xl font-bold">{stats.reviewCount}</p>
                    <p className="text-xs text-muted-foreground">待背题</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/practice/select?scope=all&mode=quiz">
                  <Card className="hover:shadow cursor-pointer transition">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Play className="size-8 text-blue-500" />
                      <div><p className="font-medium">开始答题</p><p className="text-xs text-muted-foreground">随机抽取，自动判题</p></div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/practice/select?scope=wrong&mode=quiz">
                  <Card className="hover:shadow cursor-pointer transition">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Target className="size-8 text-red-500" />
                      <div><p className="font-medium">刷错题</p><p className="text-xs text-muted-foreground">{stats.wrongCount} 题待复习</p></div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/history">
                  <Card className="hover:shadow cursor-pointer transition">
                    <CardContent className="p-4 flex items-center gap-3">
                      <History className="size-8 text-green-500" />
                      <div><p className="font-medium">做对的题</p><p className="text-xs text-muted-foreground">回顾已掌握内容</p></div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/questions">
                  <Card className="hover:shadow cursor-pointer transition">
                    <CardContent className="p-4 flex items-center gap-3">
                      <BookOpen className="size-8 text-purple-500" />
                      <div><p className="font-medium">浏览题库</p><p className="text-xs text-muted-foreground">按教材和题型筛选</p></div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </>
          )}
        </TabsContent>

        {/* 教材进度 */}
        <TabsContent value="books" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <GraduationCap className="size-5" />
              教材学习进度
            </h2>
            <Link href="/books"><Button variant="outline" size="sm">全部教材</Button></Link>
          </div>

          {stats?.books.map((book) => (
            <Card key={book.id} className="hover:shadow-sm transition">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{book.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {book.done}/{book.total} 题已掌握
                    </p>
                  </div>
                  <Badge variant={book.progress >= 80 ? 'default' : book.progress > 0 ? 'secondary' : 'outline'}>
                    {book.progress}%
                  </Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${book.progress}%` }}
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <Link href={`/practice/select?scope=book&bookId=${book.id}&mode=quiz`}>
                    <Button size="sm" variant="outline"><Play className="size-3 mr-1" />刷这本</Button>
                  </Link>
                  <Link href={`/questions?bookId=${book.id}`}>
                    <Button size="sm" variant="ghost"><BookOpen className="size-3 mr-1" />浏览题目</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}

          {stats?.books.length === 0 && (
            <p className="text-center text-muted-foreground py-8">暂无教材数据</p>
          )}
        </TabsContent>

        {/* 账号设置 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="size-5" />基本信息</CardTitle>
              <CardDescription>修改你的用户名</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>邮箱</Label>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <p className="text-sm text-muted-foreground">{roleLabel}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="flex gap-2">
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                  <Button onClick={handleUpdate} disabled={updating}><Edit3 className="size-4 mr-1" />保存</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-2">
            <Link href="/payment">
              <Button variant="outline" className="w-full justify-start">
                <Sparkles className="size-4 mr-2" />AI 解析订阅管理
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start text-red-500" onClick={logout}>
              <LogOut className="size-4 mr-2" />退出登录
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
