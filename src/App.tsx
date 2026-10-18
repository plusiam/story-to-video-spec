import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BriefPage } from '@/pages/BriefPage';
import { ExportPage } from '@/pages/ExportPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectRedirect, StepPage } from '@/pages/StepPage';

/**
 * 주소 체계 (단계마다 고유 주소 — 에이전트 친화 원칙 3번)
 *   /projects                 프로젝트 목록
 *   /p/:id                    지금 해야 할 단계로 이동
 *   /p/:id/step/0 ~ 7         단계별 작업 화면
 *   /p/:id/brief              브라우저 AI용 작업 브리핑
 *   /p/:id/export             최종 점검과 내려받기
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/p/:id" element={<ProjectRedirect />} />
        <Route path="/p/:id/step/:n" element={<StepPage />} />
        <Route path="/p/:id/brief" element={<BriefPage />} />
        <Route path="/p/:id/export" element={<ExportPage />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
