// 중간 위험도 PR을 Claude가 리뷰한다(.github/workflows/pr-risk.yml에서 실행).
//   node ai-review.mjs <diff 파일> <결과 JSON 파일>
// 결과: { verdict: "pass" | "block", summary, findings[] }
// API 키가 없거나, 변경이 너무 크거나, 응답을 해석하지 못하면 "block"으로 두고 사람 승인으로 넘긴다(통과로 넘기지 않는다).
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";

const [diffPath, outPath] = process.argv.slice(2);
const diff = fs.readFileSync(diffPath, "utf8");
const MAX_DIFF_CHARS = 400_000;

const write = (result) => {
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`AI 리뷰 결과: ${result.verdict} - ${result.summary}`);
};

if (!process.env.ANTHROPIC_API_KEY) {
  write({ verdict: "block", summary: "ANTHROPIC_API_KEY 시크릿이 없어 AI 리뷰를 하지 못했어요. 사람 승인이 필요해요.", findings: [] });
  process.exit(0);
}
// 잘라서 보내면 일부만 보고 통과시킬 수 있으므로, 너무 크면 사람에게 넘긴다
if (diff.length > MAX_DIFF_CHARS) {
  write({ verdict: "block", summary: `변경이 너무 커서(${diff.length.toLocaleString()}자) AI가 한 번에 다 볼 수 없어요. 사람 승인이 필요해요.`, findings: [] });
  process.exit(0);
}

const SYSTEM = `당신은 나의쿠키(React 19 + Spring Boot 3.5 + PostgreSQL 학습 사이트) 저장소의 코드 리뷰어입니다.
이 PR은 자동 분류에서 "중간 위험도"(일반 백엔드, 화면 코드)로 판정됐고, 당신이 통과시키면 사람 확인 없이 dev 브랜치(스테이징)에 자동 병합됩니다.

"blocking"은 병합하면 실제로 문제가 생기는 것만 고르세요:
- 버그(잘못된 조건, null 처리 누락, 경쟁 상태, 깨지는 화면 흐름)
- 보안 문제(인증 우회, 입력 검증 누락, 비밀값 노출, XSS, SQL 주입)
- 데이터 손실이나 되돌리기 어려운 변경
- 빌드나 테스트가 잡지 못하는 명백한 동작 오류
스타일, 이름 짓기, 취향, "이렇게 하면 더 좋다"는 "suggestion"으로만 남기세요. 확실하지 않은 의심은 blocking으로 올리지 마세요.
지적은 diff에 보이는 변경에 대해서만 하고, 파일 경로와 새 코드 기준 줄 번호를 적으세요. 모든 글은 한국어로 짧게 쓰세요.`;

const schema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "PR이 하는 일과 리뷰 결론을 한두 문장으로" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["blocking", "suggestion"] },
          file: { type: "string" },
          line: { type: "integer" },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["severity", "file", "line", "title", "detail"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "findings"],
  additionalProperties: false,
};

const client = new Anthropic();
try {
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    // 정책상 거절되면 서버가 다른 모델로 이어서 처리한다
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: { type: "json_schema", schema } },
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `PR 제목: ${process.env.PR_TITLE || ""}\n\nPR 설명:\n${process.env.PR_BODY || "(없음)"}\n\n<diff>\n${diff}\n</diff>`,
    }],
  });

  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
    write({ verdict: "block", summary: `AI 리뷰가 끝까지 답하지 못했어요(${response.stop_reason}). 사람 승인이 필요해요.`, findings: [] });
  } else {
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const parsed = JSON.parse(text);
    const blocking = parsed.findings.some((f) => f.severity === "blocking");
    write({ verdict: blocking ? "block" : "pass", summary: parsed.summary, findings: parsed.findings });
  }
} catch (error) {
  if (error instanceof SyntaxError) {
    write({ verdict: "block", summary: "AI 리뷰 응답을 해석하지 못했어요. 사람 승인이 필요해요.", findings: [] });
  } else if (error instanceof Anthropic.APIError) {
    write({ verdict: "block", summary: `AI 리뷰 요청이 실패했어요(HTTP ${error.status ?? "?"}). 사람 승인이 필요해요.`, findings: [] });
  } else {
    throw error;
  }
}
