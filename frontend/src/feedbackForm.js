// 건의 · 제보 양식에서 버그 제보 본문을 만든다(FeedbackPage)
// 버그는 재현에 필요한 세 가지를 나눠 받는다
export const BUG_FIELDS = [
  { key: 'steps', label: '무엇을 했나요', rows: 3, placeholder: '예: 전공필기 > 신협중앙회 > 모의고사 1회에서 제출을 눌렀어요' },
  { key: 'expected', label: '기대한 결과', rows: 2, placeholder: '예: 채점 결과와 해설이 보여요' },
  { key: 'actual', label: '실제로 일어난 일', rows: 2, placeholder: '예: 0점으로 나오고 해설이 비어 있어요' },
];
export const EMPTY = { title: '', content: '', steps: '', expected: '', actual: '' };
export const failureTime = at => new Date(at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul' });
export function bugContent(form, failures = []) {
  const parts = BUG_FIELDS.map(f => `**${f.label}**\n${form[f.key].trim()}`);
  if (failures.length) parts.push('**이 기기에서 최근 실패한 요청**\n' + failures.map(f => `- ${f.method} ${f.path} → ${f.status} (${failureTime(f.at)})`).join('\n'));
  return parts.join('\n\n').slice(0, 2000);
}
