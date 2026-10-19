import { AiAssist } from '@/components/AiAssist';
import { parseSettingsInput } from '@/lib/batchInput';
import { appendLog } from '@/lib/project';
import type { ProjectApi } from '@/hooks/useProject';
import { tid } from '@/lib/testid';
import type { Project, SourceType } from '@/types/project';

/**
 * 0단계 프로젝트 설정 — 출처와 길이를 정해 저작권·분량 기준을 먼저 세운다.
 * 모든 입력칸은 보이는 한글 라벨과 연결되어 있다(원칙 2번).
 */
export function Step0Settings({ project, api }: { project: Project; api: ProjectApi }) {
  const p = project;
  const minutes = Math.round((p.target.durationSec / 60) * 10) / 10;
  const locked = Boolean(p.progress[0]);

  const sourceOptions: { value: SourceType; label: string; hint: string }[] = [
    { value: 'folktale', label: '전래 민담', hint: '줄거리만 빌리고 문장은 새로 씁니다' },
    { value: 'original', label: '순수 창작', hint: '줄거리부터 직접 만듭니다' },
  ];

  return (
    <fieldset disabled={locked} className="max-w-prose space-y-6">
      <legend className="sr-only">프로젝트 설정</legend>

      {!locked && <AiAssist
        prefix="s0"
        title="Aside·외부 AI와 정한 설정 한 번에 넣기"
        note="확인란과 단계 완료는 대신 처리하지 않습니다. 설정을 바꾸면 출처 확인을 다시 받습니다."
        request={'대화에서 합의한 설정을 다음 JSON으로 정리하세요. 확인·승인 값은 넣지 마세요.\n' + JSON.stringify({ title: p.title, sourceType: p.source.type ?? 'folktale', sourceNote: p.source.note, durationMin: minutes, series: p.target.series }, null, 2)}
        pasteLabel="설정 JSON을 붙여 넣으세요"
        applyLabel="설정에 반영"
        onApply={(text) => {
          const r = parseSettingsInput(text);
          if (!r.value) return r.errors;
          const v = r.value;
          api.update((cur) => appendLog({ ...cur, title: v.title, source: { type: v.sourceType, note: v.sourceNote, noCommercialBookConfirmed: false }, target: { ...cur.target, durationSec: Math.round(v.durationMin * 60), series: v.series ?? cur.target.series } }, '설정 JSON을 반영했습니다 (사람 확인은 미완료)', 'GUIDE-S0 v1.2'));
          return null;
        }}
      />}
      <p className="field-hint">작업 폴더는 선택 사항입니다. 연결하지 않아도 작업할 수 있으며 내보내기에서 JSON 백업을 보관하세요.</p>
      <div>
        <label htmlFor="s0-title" className="field-label">
          영상 제목
        </label>
        <input
          id="s0-title"
          className="input font-serif text-lg"
          value={p.title === '제목 없는 옛이야기' ? '' : p.title}
          placeholder="예: 은혜 갚은 까치"
          onChange={(e) => api.update((cur) => ({ ...cur, title: e.target.value || '제목 없는 옛이야기' }))}
          data-testid={tid(0, 'title')}
        />
      </div>

      <div role="radiogroup" aria-labelledby="s0-source-type-label" data-testid={tid(0, 'source-type')}>
        <p id="s0-source-type-label" className="field-label">
          원작 유형
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {sourceOptions.map((o) => {
            const checked = p.source.type === o.value;
            return (
              <label
                key={o.value}
                className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2.5 ${
                  checked ? 'border-jjok bg-jjok-tint' : 'border-paper-line bg-white hover:border-ink-faint'
                }`}
              >
                <input
                  type="radio"
                  name="s0-source-type"
                  value={o.value}
                  checked={checked}
                  onChange={() => api.update((cur) => ({ ...cur, source: { ...cur.source, type: o.value } }))}
                  className="mt-1 accent-[#26407A]"
                  data-testid={tid(0, 'source-type', undefined, o.value)}
                />
                <span>
                  <span className="block font-semibold">{o.label}</span>
                  <span className="block text-[13px] text-ink-soft">{o.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="s0-source-note" className="field-label">
          출처 메모
        </label>
        <textarea
          id="s0-source-note"
          rows={3}
          className="input"
          value={p.source.note}
          placeholder="예: 경상도 지역 전래 민담. 어릴 때 할머니께 들은 줄거리이며, 한국구비문학대계 줄거리 요약을 참고함"
          onChange={(e) => api.update((cur) => ({ ...cur, source: { ...cur.source, note: e.target.value } }))}
          aria-describedby="s0-source-note-hint"
          data-testid={tid(0, 'source-note')}
        />
        <p id="s0-source-note-hint" className="field-hint">
          줄거리를 어디서 알게 되었는지 적습니다. 유튜브 설명문의 출처 표기에 그대로 쓰입니다. ({p.source.note.trim().length}자 / 최소 10자)
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-md border border-paper-line bg-white px-3 py-2.5">
        <input
          type="checkbox"
          checked={p.source.noCommercialBookConfirmed}
          onChange={(e) =>
            api.update((cur) => ({ ...cur, source: { ...cur.source, noCommercialBookConfirmed: e.target.checked } }))
          }
          className="mt-1 accent-[#26407A]"
          data-testid={tid(0, 'no-commercial-book')}
        />
        <span>
          <span className="block font-semibold">시판 그림책의 문장과 그림을 쓰지 않습니다</span>
          <span className="block text-[13px] text-ink-soft">
            줄거리는 빌릴 수 있지만, 출판된 책의 문장·그림·번역문은 저작권 보호를 받습니다.
          </span>
        </span>
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="s0-duration-min" className="field-label">
            목표 길이 (분)
          </label>
          <input
            id="s0-duration-min"
            type="number"
            min={3}
            max={15}
            step={0.5}
            className="input tabular-nums"
            value={minutes}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) api.update((cur) => ({ ...cur, target: { ...cur.target, durationSec: Math.round(v * 60) } }));
            }}
            aria-describedby="s0-duration-hint"
            data-testid={tid(0, 'duration-min')}
          />
          <p id="s0-duration-hint" className="field-hint">
            기본 6분. 원고는 약 {Math.round(minutes * 250).toLocaleString('ko-KR')}자가 됩니다(1분당 250자 기준).
          </p>
        </div>
        <div>
          <label htmlFor="s0-series" className="field-label">
            시리즈 이름 <span className="font-normal text-ink-faint">(선택)</span>
          </label>
          <input
            id="s0-series"
            className="input"
            value={p.target.series}
            placeholder="예: 할머니가 들려주던 옛이야기"
            onChange={(e) => api.update((cur) => ({ ...cur, target: { ...cur.target, series: e.target.value } }))}
            data-testid={tid(0, 'series')}
          />
        </div>
      </div>

      <p className="text-[13px] text-ink-soft">화면 비율은 16:9로 고정입니다.</p>
    </fieldset>
  );
}
