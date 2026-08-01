export type QuestionStatus = '学习中' | '已掌握' | '待复习' | '反复错误';

export interface MistakeQuestion {
  id: string;
  title: string;
  chapter: string;
  knowledge: string;
  errorType: string;
  status: QuestionStatus;
  streak: number;
  attempts: number;
  nextReview: string;
  priority: '普通' | '较高' | '紧急';
}

export const questions: MistakeQuestion[] = [
  {
    id: 'MA-0024',
    title: '指数函数极限中的变量代换',
    chapter: '函数、极限与连续 / 函数极限',
    knowledge: '变量代换 · 等价无穷小',
    errorType: '方法没有想到',
    status: '待复习',
    streak: 1,
    attempts: 3,
    nextReview: '今天 19:30',
    priority: '紧急',
  },
  {
    id: 'MA-0018',
    title: '分段函数在间断点处的连续性',
    chapter: '函数、极限与连续 / 连续性',
    knowledge: '左右极限 · 连续定义',
    errorType: '条件遗漏',
    status: '反复错误',
    streak: 0,
    attempts: 5,
    nextReview: '已逾期 2 天',
    priority: '紧急',
  },
  {
    id: 'MA-0031',
    title: '定积分换元后的上下限处理',
    chapter: '一元函数积分学 / 定积分',
    knowledge: '换元积分法',
    errorType: '符号错误',
    status: '学习中',
    streak: 2,
    attempts: 2,
    nextReview: '8 月 3 日',
    priority: '较高',
  },
  {
    id: 'MA-0012',
    title: '含参积分的分区间讨论',
    chapter: '一元函数积分学 / 反常积分',
    knowledge: '参数讨论 · 收敛判别',
    errorType: '分类讨论不完整',
    status: '已掌握',
    streak: 3,
    attempts: 4,
    nextReview: '8 月 18 日',
    priority: '普通',
  },
  {
    id: 'MA-0027',
    title: '多元复合函数的二阶偏导',
    chapter: '多元函数微分学 / 复合函数',
    knowledge: '链式法则 · 二阶偏导',
    errorType: '步骤跳跃',
    status: '学习中',
    streak: 1,
    attempts: 2,
    nextReview: '8 月 4 日',
    priority: '较高',
  },
];

export const weeklyBars = [34, 52, 28, 68, 46, 82, 59];
export const forecast = [6, 4, 8, 3, 5, 2, 7];

export const textbooks = [
  { name: '张宇 1000 题', chapters: 12, questions: 19, progress: 42 },
  { name: '高等数学同济第七版', chapters: 11, questions: 8, progress: 63 },
  { name: '张宇高数 30 讲', chapters: 8, questions: 5, progress: 38 },
  { name: '自定义资料', chapters: 3, questions: 2, progress: 50 },
];

export const errorTypes = [
  { name: '方法没有想到', count: 9, trend: '需关注' },
  { name: '计算失误', count: 7, trend: '改善中' },
  { name: '条件遗漏', count: 6, trend: '需关注' },
  { name: '概念理解不清', count: 5, trend: '稳定' },
  { name: '符号错误', count: 4, trend: '改善中' },
];
