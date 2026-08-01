import { AppShell } from '@/components/mistake-atlas/app-shell';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/site-settings';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [user, site, subjects, reviewCount, repeatedCount] = await Promise.all([
    requireUser(),
    getSiteSettings(),
    prisma.subject.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.question.count({ where: { status: 'ACTIVE', nextReviewAt: { lte: new Date() } } }),
    prisma.question.count({ where: { status: 'ACTIVE', wrongCount: { gte: 3 } } }),
  ]);
  return (
    <AppShell
      site={{ name: site.siteName, subtitle: site.siteSubtitle, brandColor: site.brandColor }}
      user={{ username: user.username, displayName: user.displayName, mustChangePassword: user.mustChangePassword }}
      subjects={subjects.map(({ id, slug, name, shortName, enabled, color }) => ({ id, slug, name, shortName, enabled, color }))}
      counts={{ review: reviewCount, repeated: repeatedCount }}
    >
      {children}
    </AppShell>
  );
}
