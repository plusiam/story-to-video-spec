# 🤖 AI 프롬프트 템플릿 가이드

스토리 크리에이터에서 생성된 데이터를 다양한 AI 도구와 연동하기 위한 프롬프트 템플릿입니다.

---

## 📚 목차

1. [이미지 생성 (Midjourney/DALL-E/Stable Diffusion)](#1-이미지-생성)
2. [스토리 확장 (ChatGPT/Claude)](#2-스토리-확장)
3. [애니메이션 스크립트](#3-애니메이션-스크립트)
4. [유튜브 대본](#4-유튜브-대본)
5. [TTS 나레이션](#5-tts-나레이션)

---

## 1. 이미지 생성

### Midjourney 프롬프트 템플릿

```
{scene_description}, children's book illustration,
{character_description},
{setting_description},
{art_style} style,
soft lighting, warm colors,
storybook aesthetic,
--ar 4:3 --v 6
```

#### 스타일 프리셋

| 스타일 | 프롬프트 추가 |
|--------|--------------|
| 수채화 | `watercolor painting, soft edges, gentle brushstrokes` |
| 파스텔 | `pastel colors, soft muted tones, dreamy atmosphere` |
| 애니메이션 | `studio ghibli inspired, anime style, detailed backgrounds` |
| 플랫 | `flat illustration, minimalist design, bold colors` |
| 레트로 | `vintage children's book, 1950s illustration style` |

#### 예시

```
A small timid rabbit named Duri standing at the edge of a magical forest,
looking worried but curious,
tall colorful trees with glowing leaves,
soft pastel watercolor style,
children's book illustration,
warm gentle lighting,
--ar 4:3 --v 6
```

### DALL-E 3 프롬프트 템플릿

```
Create a children's book illustration of: {scene_description}

Style: {art_style}
Characters: {character_description}
Setting: {setting_description}
Mood: {mood}

The image should be suitable for ages {target_age} with a {genre} tone.
Use soft, inviting colors and ensure the composition is clear and engaging.
```

### Stable Diffusion 프롬프트

**Positive Prompt:**
```
{scene_description},
(masterpiece, best quality:1.2),
children's book illustration,
{character_description},
{setting_description},
{art_style},
soft lighting,
vibrant yet gentle colors
```

**Negative Prompt:**
```
(worst quality, low quality:1.4),
blurry,
dark,
scary,
violent,
realistic photo,
3d render,
text, watermark
```

---

## 2. 스토리 확장

### 기본 확장 프롬프트

```
당신은 어린이 스토리 작가입니다. 다음 스토리 뼈대를 바탕으로
{output_format}에 적합한 완성된 스토리로 확장해주세요.

## 기본 정보
- 제목: {title}
- 주제: {theme}
- 장르: {genre}
- 대상 연령: {target_age}
- 배경: {setting_place}, {setting_time}

## 등장인물
{characters}

## 스토리 뼈대 ({structure_name})
{stages}

## 요청사항
1. 각 단계를 3개의 세부 장면으로 확장해주세요
2. 대사를 포함해주세요
3. 감정 표현을 풍부하게 해주세요
4. {target_age}세 아이가 이해할 수 있는 언어를 사용해주세요
5. 교훈적인 메시지가 자연스럽게 드러나도록 해주세요

## 출력 형식
JSON 형식으로 다음 구조를 따라주세요:
{
  "stages": [
    {
      "id": "기",
      "scenes": [
        {
          "sceneNumber": 1,
          "narration": "나레이션 텍스트",
          "dialogue": [
            {"character": "캐릭터명", "text": "대사", "emotion": "감정"}
          ],
          "imageDescription": "이미지 설명"
        }
      ]
    }
  ]
}
```

### 캐릭터 심화 프롬프트

```
다음 캐릭터의 상세 프로필을 작성해주세요:

이름: {name}
기본 설명: {description}
역할: {role}

다음 항목을 포함해주세요:
1. 외모 상세 (AI 이미지 생성에 사용 가능하도록)
2. 성격 특성 3가지
3. 말투/언어 스타일
4. 좋아하는 것/싫어하는 것
5. 성장 포인트 (스토리에서 어떻게 변화하는지)
6. 대표 대사 3개
```

### 대화 생성 프롬프트

```
다음 장면에 적합한 대화를 작성해주세요:

장면 설명: {scene_description}
등장인물: {characters_in_scene}
감정 톤: {emotion}
대상 연령: {target_age}

요청사항:
- 각 캐릭터의 성격이 드러나는 대사
- 자연스러운 대화 흐름
- 3-5개의 대화 턴
- 행동 지문 포함
```

---

## 3. 애니메이션 스크립트

### 애니메이션 콘티 프롬프트

```
다음 스토리를 {duration}분 분량의 애니메이션 콘티로 변환해주세요.

## 스토리 정보
{story_summary}

## 출력 형식
각 장면에 대해 다음 정보를 포함해주세요:

| 장면 | 시간 | 카메라 | 액션 | 대사 | 효과음/BGM |
|------|------|--------|------|------|-----------|
| 1 | 0:00-0:15 | 와이드샷 | 설명 | "대사" | BGM: 평화로운 |

## 카메라 앵글 옵션
- 와이드샷: 전경 보여주기
- 미디엄샷: 인물 중심
- 클로즈업: 표정/감정 강조
- 버드아이: 전체 상황 조망
- 로우앵글: 캐릭터 강조

## 요청사항
1. 시각적 전환이 자연스럽게
2. 감정의 흐름을 고려한 페이싱
3. 무성 애니메이션도 이해 가능하도록
```

---

## 4. 유튜브 대본

### 유튜브 스토리 영상 대본

```
다음 스토리를 유튜브 키즈 채널용 영상 대본으로 작성해주세요.

## 스토리 정보
- 제목: {title}
- 대상: {target_age}세
- 예상 길이: {duration}분

## 스토리 내용
{story_content}

## 출력 형식

### 인트로 (15초)
- 인사말
- 오늘의 이야기 소개
- 시청자 참여 유도 (좋아요/구독)

### 본문
각 장면별로:
- [나레이션] 텍스트
- [화면 설명] 필요한 비주얼
- [효과음] 필요한 소리
- [BGM] 분위기

### 아웃트로 (15초)
- 교훈 정리
- 질문 던지기 (댓글 유도)
- 다음 영상 예고

## 스타일 가이드
- 친근하고 따뜻한 톤
- 짧은 문장 사용
- 의성어/의태어 활용
- 반복 표현으로 기억력 강화
```

---

## 5. TTS 나레이션

### TTS 스크립트 변환

```
다음 스토리를 TTS 나레이션용 스크립트로 변환해주세요.

## 원본 스토리
{story_content}

## 변환 요청사항
1. 자연스러운 쉼표와 마침표 배치
2. 감정 표현을 위한 SSML 태그 추가 (선택)
3. 캐릭터별 목소리 톤 표시
4. 예상 읽기 시간 표시

## 출력 형식
```
[나레이터, 차분하게]
옛날 옛적에... (2초 쉼)

[두리, 겁먹은 목소리]
"어... 어떡하지?"

[나레이터, 긴장감 있게]
그때, 숲에서 이상한 소리가 들려왔어요.
```

### SSML 태그 예시 (Google TTS/Amazon Polly)

```xml
<speak>
  <prosody rate="slow" pitch="-2st">
    옛날 옛적에
  </prosody>
  <break time="500ms"/>
  <emphasis level="strong">
    마법의 숲
  </emphasis>
  에 작은 토끼가 살았어요.
</speak>
```

---

## 📋 JSON → 프롬프트 변환 코드

### JavaScript 예시

```javascript
function generateImagePrompts(storyData) {
  const prompts = [];
  const { metadata, setting, characters, story } = storyData;

  // 기본 스타일 설정
  const baseStyle = getStylePrompt(metadata.genre);

  story.stages.forEach(stage => {
    stage.scenes.forEach((scene, index) => {
      const prompt = `
        ${scene.content},
        ${baseStyle},
        ${setting.place ? `in ${setting.place}` : ''},
        children's book illustration,
        --ar 4:3
      `.trim().replace(/\s+/g, ' ');

      prompts.push({
        stage: stage.name,
        sceneNumber: index + 1,
        prompt: prompt
      });
    });
  });

  return prompts;
}

function getStylePrompt(genre) {
  const styles = {
    'fantasy': 'whimsical watercolor, magical lighting, soft colors',
    'adventure': 'dynamic illustration, vibrant colors, exciting composition',
    'slice-of-life': 'warm cozy illustration, gentle pastels, homey atmosphere',
    'comedy': 'playful cartoon style, bright colors, expressive characters',
    'mystery': 'atmospheric illustration, muted tones, intriguing shadows',
    'educational': 'clear simple illustration, friendly design, informative'
  };
  return styles[genre] || styles['fantasy'];
}
```

---

## 🔗 연동 가이드

### Midjourney Bot 연동

1. Discord 서버에 Midjourney Bot 추가
2. `/imagine` 명령어로 프롬프트 전송
3. 생성된 이미지 다운로드

### OpenAI API 연동

```python
import openai
import json

def expand_story(story_data):
    prompt = f"""
    스토리 확장 요청:
    {json.dumps(story_data, ensure_ascii=False, indent=2)}

    위 스토리를 각 단계별 3개 장면으로 확장해주세요.
    """

    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "당신은 어린이 스토리 작가입니다."},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content
```

### Claude API 연동

```python
import anthropic

def expand_story_claude(story_data):
    client = anthropic.Anthropic()

    message = client.messages.create(
        model="claude-3-opus-20240229",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": f"다음 스토리를 확장해주세요:\n\n{json.dumps(story_data, ensure_ascii=False)}"
            }
        ]
    )

    return message.content
```

---

## 📝 팁

1. **일관성 유지**: 같은 스토리의 모든 이미지에 동일한 스타일 프롬프트 사용
2. **캐릭터 일관성**: 캐릭터 설명을 시드로 저장하고 재사용
3. **반복 테스트**: 여러 변형을 생성하고 가장 적합한 것 선택
4. **피드백 루프**: AI 출력을 검토하고 프롬프트 개선

---

**만든이**: 스토리 크리에이터 팀
**버전**: 2.0
