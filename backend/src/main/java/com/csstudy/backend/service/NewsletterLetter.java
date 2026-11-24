package com.csstudy.backend.service;

import com.csstudy.backend.news.NewsArticle;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// 구독 메일 본문. 웹 필수지식 문답 하나를 중심으로 같은 분야 문답, 꼬리질문, 체크리스트, 참고 자료를 엮어 긴 학습 편지를 만든다.
// 문답 원본: frontend/src/data/webEssentials.js → scripts/export-web-essentials.mjs → newsletter/web-essentials.json
@Component
public class NewsletterLetter {

    public record Reference(String title, String url) {}
    public record Item(String id, String topic, String title, String question, String answer, List<Reference> references) {}
    public record Letter(String subject, String text, String html) {}

    private static final Pattern BOLD = Pattern.compile("\\*\\*(.+?)\\*\\*");
    private static final Pattern CODE = Pattern.compile("`([^`]+)`");
    private final List<Item> items;

    public NewsletterLetter(ObjectMapper json) throws IOException {
        try (InputStream in = new ClassPathResource("newsletter/web-essentials.json").getInputStream()) {
            this.items = List.copyOf(json.readValue(in, new TypeReference<List<Item>>() {}));
        }
        if (items.isEmpty()) throw new IllegalStateException("newsletter/web-essentials.json이 비어 있습니다");
    }

    public int size() {
        return items.size();
    }

    public Letter build(int index, String baseUrl, String unsubscribeUrl) {
        Item main = items.get(Math.floorMod(index, items.size()));
        List<Item> topic = new ArrayList<>();
        int start = items.indexOf(main);
        for (int i = 1; i < items.size(); i++) {
            Item next = items.get((start + i) % items.size());
            if (next.topic().equals(main.topic())) topic.add(next);
        }
        List<Item> related = topic.subList(0, Math.min(3, topic.size()));
        List<Item> followUps = topic.subList(related.size(), topic.size());
        String studyUrl = baseUrl + "/web-essentials#" + main.id();

        Doc doc = new Doc();
        doc.title("나의쿠키 웹 필수지식 #" + (Math.floorMod(index, items.size()) + 1) + " | " + main.topic());
        doc.line("오늘 함께 볼 주제는 **" + main.title() + "**입니다.");
        doc.line("출근길이나 등굣길에 5분만 읽고, 마지막에 문제를 풀며 내 말로 정리해 보세요.");
        doc.button("문제 풀러 가기", studyUrl);

        doc.heading("1. 오늘의 질문");
        doc.line("**Q. " + main.question() + "**");

        doc.heading("2. 답을 보기 전에 1분만 생각해 보기");
        doc.bullet("이 질문의 핵심 개념을 한 문장으로 말하면 무엇일까요?");
        doc.bullet("실제 서비스에서 이 개념이 쓰이는 장면을 하나 떠올려 보세요.");
        doc.bullet("이 방식을 고르면 무엇을 얻고 무엇을 포기하나요?");
        doc.bullet("면접관이 \"왜요?\"라고 한 번 더 묻는다면 어떻게 답할까요?");

        doc.heading("3. 모범답안");
        doc.answer(main.answer());

        Set<String> keywords = new LinkedHashSet<>();
        Matcher bold = BOLD.matcher(main.answer());
        while (bold.find()) keywords.add(bold.group(1));
        doc.heading("4. 오늘의 핵심 정리");
        for (String keyword : keywords) doc.bullet(keyword);
        doc.bullet("\"" + main.title() + "\"을 30초 안에 설명할 수 있다면 오늘 공부는 성공입니다.");

        if (!related.isEmpty()) {
            doc.heading("5. 같은 분야에서 함께 보면 좋은 문답 (" + main.topic() + ")");
            int n = 1;
            for (Item item : related) {
                doc.subheading("5-" + n++ + ". " + item.title());
                doc.line("**Q. " + item.question() + "**");
                doc.answer(item.answer());
            }
        }

        doc.heading("6. 면접 꼬리질문 연습");
        for (Item item : followUps) doc.bullet(item.question());
        doc.bullet(main.title() + "을 실제 프로젝트에 적용했다면, 어떤 문제를 풀려고 했나요?");
        doc.bullet("같은 문제를 다른 방법으로 푼다면 무엇이 달라지나요?");
        doc.bullet("이 설계가 실패하거나 장애가 나는 상황은 언제일까요? 어떻게 알아챌 수 있나요?");

        doc.heading("7. 면접에서 30초로 답하는 틀");
        doc.bullet("정의: " + main.title() + "이 무엇인지 한 문장으로 말합니다.");
        doc.bullet("이유: 왜 필요한지, 없으면 어떤 문제가 생기는지 말합니다.");
        doc.bullet("예시: 직접 해 본 프로젝트나 익숙한 서비스의 장면을 하나 듭니다.");
        doc.bullet("한계: 이 방식의 비용이나 주의할 점을 덧붙이면 답이 단단해집니다.");

        doc.heading("8. 오늘의 셀프 체크");
        doc.bullet("[ ] 모범답안을 보지 않고 핵심 문장을 말할 수 있다.");
        doc.bullet("[ ] 비슷한 개념과 무엇이 다른지 설명할 수 있다.");
        doc.bullet("[ ] 실제로 쓰이는 예시를 하나 이상 들 수 있다.");
        doc.bullet("[ ] 꼬리질문 중 하나에 내 말로 답해 보았다.");

        List<Reference> refs = new ArrayList<>(main.references());
        for (Item item : related) for (Reference r : item.references()) if (!refs.contains(r)) refs.add(r);
        if (!refs.isEmpty()) {
            doc.heading("9. 더 깊이 읽을 자료");
            for (Reference r : refs) doc.link(r.title(), r.url());
        }

        doc.heading("오늘의 마무리");
        doc.line("읽기만 하면 금방 잊어버려요. 지금 바로 문제를 풀고 내 답을 적어 보세요.");
        doc.button("문제 풀러 가기", studyUrl);
        doc.link("오늘의 CS 5문제도 풀기", baseUrl + "/");
        doc.footer("이 메일은 나의쿠키에서 학습 메일 구독을 신청하고 확인 링크를 누른 분께 보냅니다.",
                "수신 거부", unsubscribeUrl);

        return new Letter("[나의쿠키] " + main.title() + " | 웹 필수지식", doc.text.toString(), doc.html());
    }

    private static final String[] MARKS = {"①", "②", "③", "④"};

    private static final java.time.ZoneId SEOUL = java.time.ZoneId.of("Asia/Seoul");
    private static final java.time.format.DateTimeFormatter DATE = java.time.format.DateTimeFormatter.ofPattern("yyyy.MM.dd");

    /**
     * 오늘의 학습 세트 메일: 오늘의 문제 → (오늘의 CS, 있을 때만) → 문제와 이어지는 기술블로그 → 맨 아래 정답과 해설 → 더 공부하기.
     * 기술블로그는 세트에 정해 둔 글을 쓰고, 없으면 발송할 때 고른 수집 글(crawled)을 쓴다. 둘 다 없으면 그 칸을 건너뛴다.
     */
    public Letter buildDaily(NewsletterDailySets.DailySet set, NewsArticle crawled, String baseUrl, String unsubscribeUrl) {
        NewsletterDailySets.Question q = set.question();
        NewsletterDailySets.Cs cs = set.cs();
        int section = 1;
        Doc doc = new Doc();
        doc.title("나의쿠키 오늘의 학습 #" + set.day() + " | " + set.theme());
        doc.line("오늘의 주제는 **" + set.theme() + "**입니다. 문제를 먼저 풀고, 실제 기업 사례를 읽은 뒤 정답을 확인해 보세요.");

        doc.heading(section++ + ". 오늘의 문제 · " + q.title());
        if (q.context() != null && !q.context().isBlank()) doc.line(q.context());
        if (q.code() != null && !q.code().isBlank()) doc.code(q.code());
        doc.line("**Q. " + q.prompt() + "**");
        for (int i = 0; i < q.options().size(); i++) doc.line(MARKS[i] + " " + q.options().get(i));
        doc.note("먼저 답을 골라 보세요. 정답과 해설은 메일 맨 아래에 있어요.");

        if (cs != null) {
            doc.heading(section++ + ". 오늘의 CS · " + cs.title());
            for (String paragraph : cs.body()) doc.line(paragraph);
            doc.subheading("핵심 정리");
            for (String point : cs.points()) doc.bullet(point);
            if (cs.followUp() != null) {
                doc.subheading("면접 꼬리질문");
                doc.line("**Q. " + cs.followUp().question() + "**");
                doc.line(cs.followUp().answer());
            }
        }

        NewsletterDailySets.Blog blog = set.blog();
        if (blog != null) {
            doc.heading(section + ". 이 문제와 이어지는 기술블로그 · " + blog.company());
            doc.link(blog.title() + (blog.published() == null || blog.published().isBlank() ? "" : " (" + blog.published() + ")"), blog.url());
            if (blog.note() != null && !blog.note().isBlank()) doc.line(blog.note());
            doc.note("전체 내용은 원문에서 읽어 주세요.");
        } else if (crawled != null) {
            doc.heading(section + ". 오늘의 기술블로그 · " + crawled.getCompany());
            doc.link(crawled.getTitle() + " (" + DATE.format(crawled.getPublishedAt().atZone(SEOUL)) + ")", crawled.getUrl());
            String summary = crawled.getSummary() == null ? "" : crawled.getSummary().strip();
            if (!summary.isEmpty()) doc.line(summary.length() > 160 ? summary.substring(0, 159).strip() + "…" : summary);
            doc.note(crawled.getSourceName() + "에 올라온 글입니다. 전체 내용은 원문에서 읽어 주세요.");
        }

        doc.heading("정답과 해설");
        doc.line("**정답 " + MARKS[q.answer()] + "** " + q.options().get(q.answer()));
        for (String paragraph : q.explanation()) doc.line(paragraph);

        // 연습 문제가 있는 세트는 그날 주제의 문제 5개를 푸는 화면으로, 없으면 첫 화면으로 보낸다
        boolean hasPractice = set.practice() != null && !set.practice().isEmpty();
        doc.button(hasPractice ? "나의쿠키에서 오늘 주제 5문제 더 풀기" : "나의쿠키에서 더 공부하기", hasPractice ? baseUrl + "/daily/" + set.day() : baseUrl + "/");
        doc.footer("이 메일은 나의쿠키에서 학습 메일 구독을 신청하고 확인 링크를 누른 분께 보냅니다.",
                "수신 거부", unsubscribeUrl);
        return new Letter("[나의쿠키] 오늘의 학습 #" + set.day() + " | " + set.theme(), doc.text.toString(), doc.html());
    }

    // 글자 본문과 HTML 본문을 함께 만든다
    private static final class Doc {
        final StringBuilder text = new StringBuilder();
        final StringBuilder html = new StringBuilder();

        void title(String value) {
            text.append(plain(value)).append("\n\n");
            html.append("<h1 style=\"font-size:20px;margin:0 0 16px;color:#1f2a44\">").append(inline(value)).append("</h1>");
        }

        void heading(String value) {
            text.append("\n[").append(plain(value)).append("]\n");
            html.append("<h2 style=\"font-size:17px;margin:28px 0 10px;color:#1f2a44;border-left:4px solid #6366f1;padding-left:8px\">")
                    .append(inline(value)).append("</h2>");
        }

        void subheading(String value) {
            text.append("\n").append(plain(value)).append("\n");
            html.append("<h3 style=\"font-size:15px;margin:18px 0 6px;color:#334155\">").append(inline(value)).append("</h3>");
        }

        void line(String value) {
            text.append(plain(value)).append("\n");
            html.append("<p style=\"margin:6px 0\">").append(inline(value)).append("</p>");
        }

        void note(String value) {
            text.append("(").append(plain(value)).append(")\n");
            html.append("<p style=\"margin:10px 0;padding:10px 12px;background:#f1f5f9;border-radius:8px;font-size:13px;color:#475569\">")
                    .append(inline(value)).append("</p>");
        }

        void code(String value) {
            html.append("<pre style=\"margin:10px 0;padding:12px 14px;background:#0f172a;color:#e2e8f0;border-radius:8px;font-size:12.5px;line-height:1.55;overflow-x:auto;white-space:pre\">");
            for (String row : value.split("\n")) {
                text.append("    ").append(row).append("\n");
                html.append(escape(row)).append("\n");
            }
            html.append("</pre>");
        }

        void bullet(String value) {
            text.append("- ").append(plain(value)).append("\n");
            html.append("<p style=\"margin:4px 0 4px 12px\">• ").append(inline(value)).append("</p>");
        }

        void link(String label, String url) {
            text.append("- ").append(label).append(": ").append(url).append("\n");
            html.append("<p style=\"margin:4px 0 4px 12px\">• <a href=\"").append(attr(url)).append("\" style=\"color:#4f46e5\">")
                    .append(escape(label)).append("</a></p>");
        }

        void button(String label, String url) {
            text.append("\n▶ ").append(label).append(": ").append(url).append("\n");
            html.append("<p style=\"margin:20px 0\"><a href=\"").append(attr(url))
                    .append("\" style=\"display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px\">")
                    .append(escape(label)).append(" →</a></p>");
        }

        void footer(String note, String label, String url) {
            text.append("\n").append(note).append("\n").append(label).append(": ").append(url).append("\n");
            html.append("<hr style=\"border:none;border-top:1px solid #e2e8f0;margin:28px 0 12px\"><p style=\"font-size:12px;color:#64748b\">")
                    .append(escape(note)).append(" <a href=\"").append(attr(url)).append("\" style=\"color:#64748b\">")
                    .append(escape(label)).append("</a></p>");
        }

        // 문단은 문장 단위로, 목록 · 표 · 코드 줄은 한 줄씩 옮긴다
        void answer(String markdown) {
            boolean code = false;
            for (String paragraph : markdown.split("\\n\\s*\\n")) {
                String[] rows = paragraph.split("\\n");
                boolean structured = code || paragraph.startsWith("```") || rows.length > 1;
                if (!structured) {
                    for (String sentence : paragraph.trim().split("(?<=[.!?])\\s+")) {
                        if (!sentence.isBlank()) line(sentence);
                    }
                    continue;
                }
                for (String row : rows) {
                    if (row.startsWith("```")) { code = !code; continue; }
                    if (row.isBlank() || row.matches("^\\|?\\s*:?-{3,}.*")) continue;
                    if (code) { text.append("    ").append(row).append("\n"); html.append("<pre style=\"margin:0;background:#f1f5f9;padding:2px 8px;font-size:13px\">").append(escape(row)).append("</pre>"); }
                    else if (row.matches("^\\s*([-*]|\\d+\\.)\\s+.*")) bullet(row.replaceFirst("^\\s*([-*]|\\d+\\.)\\s+", ""));
                    else line(row);
                }
            }
        }

        String html() {
            return "<!doctype html><html><body style=\"margin:0;background:#f8fafc\"><div style=\"max-width:640px;margin:0 auto;padding:24px 20px;"
                    + "font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:15px;line-height:1.7;color:#1e293b;background:#ffffff\">"
                    + html + "</div></body></html>";
        }

        private static String plain(String value) {
            return CODE.matcher(BOLD.matcher(value).replaceAll("$1")).replaceAll("$1");
        }

        private static String inline(String value) {
            String escaped = escape(value);
            escaped = BOLD.matcher(escaped).replaceAll("<strong>$1</strong>");
            return CODE.matcher(escaped).replaceAll("<code style=\"background:#f1f5f9;padding:1px 4px;border-radius:4px\">$1</code>");
        }

        private static String escape(String value) {
            return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
        }

        private static String attr(String url) {
            return escape(url.startsWith("https://") || url.startsWith("http://") ? url : "#");
        }
    }
}
