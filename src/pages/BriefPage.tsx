import { Link, useParams } from 'react-router-dom';
import { CopyButton } from '@/components/CopyButton';
import { NextActionBar } from '@/components/NextActionBar';
import { AppHeader } from '@/components/StudioLayout';
import { FolderStatus } from '@/components/FolderStatus';
import { GUIDES, guideLabel } from '@/guides';
import { useFolder } from '@/hooks/useFolder';
import { useProject } from '@/hooks/useProject';
import { WORK_RULES, buildBriefMarkdown } from '@/lib/brief';
import { STATUS_LABEL, blockReason, stepStatus } from '@/lib/steps';
import { appTid } from '@/lib/testid';
import { STEP_NUMBERS } from '@/types/project';
import { LoadingOrError } from './LoadingOrError';

/**
 * /p/:id/brief — 브라우저 AI용 작업 브리핑 (원칙 6번)
 * 작업을 시작할 때 이 페이지 하나만 읽으면 전체 지침, 진행 상태, 다음 할 일을 알 수 있다.
 */
export function BriefPage() {
  const { id } = useParams();
  const api = useProject(id);
  const { state: folder } = useFolder();
  const p = api.project;
  if (!p) return <LoadingOrError error={api.loadError} />;

  return (
    <div className="min-h-screen">
      <AppHeader project={p} saveState={api.saveState} />
      <NextActionBar project={p} viewing={null} />
      <main className="mx-auto max-w-[860px] px-4 py-8 lg:px-6" data-testid={appTid('brief')}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-ink-soft">작업 브리핑 · 프로젝트 ID {p.id}</p>
            <h1 className="text-[28px] leading-tight">{p.title}</h1>
          </div>
          <CopyButton text={buildBriefMarkdown(p, window.location.origin, { folder })} label="브리핑 전체 복사" testid={appTid('brief-copy')} className="btn-primary" />
        </div>

        <section aria-labelledby="folder-heading" className="mb-8 rounded-lg border border-paper-line bg-paper p-4">
          <h2 id="folder-heading" className="mb-2 font-sans text-sm font-bold">
            작업 폴더
          </h2>
          <FolderStatus />
        </section>

        <section aria-labelledby="status-heading" className="mb-8">
          <h2 id="status-heading" className="mb-2 text-xl">
            진행 상태
          </h2>
          <table className="w-full border-collapse text-sm" data-testid={appTid('brief-status')}>
            <thead>
              <tr className="border-b border-paper-line text-left text-ink-soft">
                <th className="py-2 pr-3 font-semibold">단계</th>
                <th className="py-2 pr-3 font-semibold">상태</th>
                <th className="py-2 font-semibold">사유·주소</th>
              </tr>
            </thead>
            <tbody>
              {STEP_NUMBERS.map((n) => {
                const st = stepStatus(n, p);
                return (
                  <tr key={n} className="border-b border-paper-line/70" data-testid={appTid(`brief-step-${n}`)} data-status={st}>
                    <td className="py-2 pr-3">
                      {n} {GUIDES[n].title}
                    </td>
                    <td className="py-2 pr-3 font-semibold">{STATUS_LABEL[st]}</td>
                    <td className="py-2 text-ink-soft">
                      {st === 'blocked' ? blockReason(n, p) : <Link className="text-jjok hover:underline" to={`/p/${p.id}/step/${n}`} data-testid={appTid(`brief-step-link-${n}`)}>/p/{p.id}/step/{n}</Link>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="rules-heading" className="mb-8">
          <h2 id="rules-heading" className="mb-2 text-xl">
            작업 규칙
          </h2>
          <ol className="list-decimal space-y-1 pl-5" data-testid={appTid('brief-rules')}>
            {WORK_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="guides-heading">
          <h2 id="guides-heading" className="mb-2 text-xl">
            단계별 지침
          </h2>
          <div className="space-y-5">
            {STEP_NUMBERS.map((n) => {
              const g = GUIDES[n];
              return (
                <article key={n} className="rounded-lg border border-paper-line bg-paper p-4 text-sm" data-testid={appTid(`brief-guide-${n}`)}>
                  <h3 className="text-lg">
                    {n}단계 {g.title}{' '}
                    <span className="font-sans text-xs font-semibold text-ink-faint">
                      {guideLabel(g)}
                      {g.implemented ? '' : ' · 화면 준비 중'}
                    </span>
                  </h3>
                  <dl className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-[88px_1fr]">
                    <dt className="font-semibold text-ink-soft">목적</dt>
                    <dd>{g.purpose}</dd>
                    <dt className="font-semibold text-ink-soft">입력</dt>
                    <dd>{g.inputs.join(' / ')}</dd>
                    <dt className="font-semibold text-ink-soft">해야 할 일</dt>
                    <dd>
                      <ol className="list-decimal pl-5">
                        {g.actions.map((a) => (
                          <li key={a.text}>
                            {a.text}
                            {a.testid && <code className="ml-1 text-[12px] text-ink-soft">{a.testid}</code>}
                          </li>
                        ))}
                      </ol>
                    </dd>
                    <dt className="font-semibold text-ink-soft">품질 기준</dt>
                    <dd>
                      자동: {g.quality.auto.join(' / ')}
                      <br />
                      눈으로: {g.quality.visual.join(' / ')}
                    </dd>
                    <dt className="font-semibold text-ink-soft">하지 말 것</dt>
                    <dd>{g.avoid.join(' / ')}</dd>
                    <dt className="font-semibold text-ink-soft">완료 신호</dt>
                    <dd>{g.doneSignal}</dd>
                  </dl>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
