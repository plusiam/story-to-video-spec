-- ============================================
-- AI 사용량 관리 스키마
-- ============================================

-- 사용자 테이블에 API 키 필드 추가
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS gemini_api_key_encrypted TEXT;

-- AI 사용량 추적 테이블
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE DEFAULT CURRENT_DATE NOT NULL,
  request_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 하루에 사용자당 하나의 레코드
  UNIQUE(user_id, usage_date)
);

-- 비주얼 DNA 저장 테이블 (작품별)
CREATE TABLE IF NOT EXISTS public.visual_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- 캐릭터 정보 (JSON 배열)
  characters JSONB DEFAULT '[]'::jsonb,

  -- 아트 스타일
  art_style TEXT DEFAULT 'ghibli',
  color_tone TEXT DEFAULT 'warm',
  lighting TEXT DEFAULT 'daylight',

  -- 배경 환경
  environment_location TEXT,
  environment_era TEXT,
  environment_mood TEXT,

  -- 커스텀 스타일 프롬프트
  custom_style_prompt TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date
  ON public.ai_usage(user_id, usage_date);

CREATE INDEX IF NOT EXISTS idx_visual_dna_work_id
  ON public.visual_dna(work_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_dna ENABLE ROW LEVEL SECURITY;

-- AI 사용량 정책
-- 본인 사용량 조회
CREATE POLICY "Users can view own ai usage"
  ON public.ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 사용량 삽입 (시스템에서 처리)
CREATE POLICY "Users can insert own ai usage"
  ON public.ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 사용량 업데이트
CREATE POLICY "Users can update own ai usage"
  ON public.ai_usage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 비주얼 DNA 정책
-- 본인 작품의 비주얼 DNA 조회
CREATE POLICY "Users can view own visual dna"
  ON public.visual_dna FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.works
      WHERE works.id = visual_dna.work_id
      AND works.user_id = auth.uid()
    )
  );

-- 본인 작품의 비주얼 DNA 생성
CREATE POLICY "Users can create own visual dna"
  ON public.visual_dna FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.works
      WHERE works.id = visual_dna.work_id
      AND works.user_id = auth.uid()
    )
  );

-- 본인 작품의 비주얼 DNA 수정
CREATE POLICY "Users can update own visual dna"
  ON public.visual_dna FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.works
      WHERE works.id = visual_dna.work_id
      AND works.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.works
      WHERE works.id = visual_dna.work_id
      AND works.user_id = auth.uid()
    )
  );

-- 본인 작품의 비주얼 DNA 삭제
CREATE POLICY "Users can delete own visual dna"
  ON public.visual_dna FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.works
      WHERE works.id = visual_dna.work_id
      AND works.user_id = auth.uid()
    )
  );

-- ============================================
-- Functions
-- ============================================

-- AI 사용량 증가 함수
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS TABLE(current_count INTEGER, daily_limit INTEGER, can_use BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_limit INTEGER := 5;  -- 일일 무료 제한
  v_is_admin BOOLEAN;
  v_has_api_key BOOLEAN;
BEGIN
  -- 관리자 확인
  SELECT role = 'admin', gemini_api_key_encrypted IS NOT NULL
  INTO v_is_admin, v_has_api_key
  FROM public.users WHERE id = p_user_id;

  -- 관리자나 API 키가 있는 사용자는 무제한
  IF v_is_admin OR v_has_api_key THEN
    RETURN QUERY SELECT 0, 999999, TRUE;
    RETURN;
  END IF;

  -- 오늘 사용량 조회 또는 생성
  INSERT INTO public.ai_usage (user_id, usage_date, request_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    request_count = ai_usage.request_count + 1,
    updated_at = NOW()
  RETURNING request_count INTO v_count;

  RETURN QUERY SELECT v_count, v_limit, v_count <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 오늘 남은 사용량 조회 함수
CREATE OR REPLACE FUNCTION get_ai_usage_status(p_user_id UUID)
RETURNS TABLE(used_count INTEGER, daily_limit INTEGER, remaining INTEGER, is_unlimited BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_limit INTEGER := 5;
  v_is_admin BOOLEAN;
  v_has_api_key BOOLEAN;
BEGIN
  -- 관리자 또는 API 키 확인
  SELECT role = 'admin', gemini_api_key_encrypted IS NOT NULL
  INTO v_is_admin, v_has_api_key
  FROM public.users WHERE id = p_user_id;

  IF v_is_admin OR v_has_api_key THEN
    RETURN QUERY SELECT 0, 999999, 999999, TRUE;
    RETURN;
  END IF;

  -- 오늘 사용량 조회
  SELECT COALESCE(request_count, 0) INTO v_count
  FROM public.ai_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  IF v_count IS NULL THEN
    v_count := 0;
  END IF;

  RETURN QUERY SELECT v_count, v_limit, GREATEST(v_limit - v_count, 0), FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 비주얼 DNA 업데이트 시 updated_at 자동 갱신
CREATE TRIGGER update_visual_dna_updated_at
  BEFORE UPDATE ON public.visual_dna
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- AI 사용량 업데이트 시 updated_at 자동 갱신
CREATE TRIGGER update_ai_usage_updated_at
  BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
