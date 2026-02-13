import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// StrictMode 제거: Supabase 싱글톤 클라이언트의 내부 AbortController가
// StrictMode의 mount/unmount/mount 사이클에서 오염되어
// 모든 요청이 AbortError로 실패하는 문제 해결
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />,
)
