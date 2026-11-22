package com.csstudy.backend.news;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

// RSS 2.0과 Atom 피드에서 제목, 링크, 짧은 요약, 발행 시각만 뽑는다. 본문은 가져오지 않고 태그는 모두 걷어 낸다.
// 외부에서 받은 문서라 XXE를 막고, http(s)가 아닌 링크는 버린다.
public final class NewsFeedParser {

    private NewsFeedParser() {}

    public record Item(String title, String url, String summary, Instant publishedAt) {}

    static final int MAX_ITEMS = 30;
    static final int TITLE_MAX = 300;
    static final int SUMMARY_MAX = 200;
    static final int URL_MAX = 1000;

    // 요일이 날짜와 맞지 않는 피드도 있어서(RFC 1123 파서는 거부한다) 요일을 떼고 읽는다
    private static final DateTimeFormatter RFC_OFFSET = DateTimeFormatter.ofPattern("d MMM yyyy HH:mm:ss Z", Locale.ENGLISH);
    private static final DateTimeFormatter RFC_ZONE = DateTimeFormatter.ofPattern("d MMM yyyy HH:mm:ss zzz", Locale.ENGLISH);

    public static List<Item> parse(byte[] xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setExpandEntityReferences(false);
        Document doc = factory.newDocumentBuilder().parse(new ByteArrayInputStream(stripControlBytes(xml)));

        List<Element> entries = new ArrayList<>();
        NodeList rss = doc.getElementsByTagName("item");
        for (int i = 0; i < rss.getLength(); i++) entries.add((Element) rss.item(i));
        NodeList atom = doc.getElementsByTagName("entry");
        for (int i = 0; i < atom.getLength(); i++) entries.add((Element) atom.item(i));

        List<Item> items = new ArrayList<>();
        for (Element e : entries) {
            if (items.size() >= MAX_ITEMS) break;
            String title = clean(text(e, "title"), TITLE_MAX);
            String url = normalizeUrl(link(e));
            if (title.isEmpty() || url == null) continue;
            String summary = clean(firstText(e, "description", "summary", "content:encoded", "content"), SUMMARY_MAX);
            items.add(new Item(title, url, summary.isEmpty() ? null : summary,
                    date(firstText(e, "pubDate", "published", "dc:date", "updated"))));
        }
        return List.copyOf(items);
    }

    // XML 1.0이 허용하지 않는 제어 문자(0x00~0x08, 0x0B, 0x0C, 0x0E~0x1F)가 섞인 피드가 있어(쿠팡 등) 읽기 전에 뺀다.
    // UTF-8에서는 이 값이 한글 같은 여러 바이트 문자 안에 나오지 않아 바이트 단위로 걸러도 안전하다
    static byte[] stripControlBytes(byte[] xml) {
        byte[] out = new byte[xml.length];
        int n = 0;
        for (byte b : xml) {
            int v = b & 0xFF;
            if (v < 0x20 && v != 0x09 && v != 0x0A && v != 0x0D) continue;
            out[n++] = b;
        }
        return n == xml.length ? xml : java.util.Arrays.copyOf(out, n);
    }

    // RSS는 <link>글자</link>, Atom은 <link href="..." rel="alternate"/>
    private static String link(Element entry) {
        String fallback = null;
        for (Node n = entry.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (!(n instanceof Element c) || !"link".equals(c.getTagName())) continue;
            String href = c.getAttribute("href");
            if (!href.isEmpty()) {
                String rel = c.getAttribute("rel");
                if (rel.isEmpty() || "alternate".equals(rel)) return href.trim();
                if (fallback == null) fallback = href.trim();
            } else if (!c.getTextContent().isBlank()) {
                return c.getTextContent().trim();
            }
        }
        return fallback == null ? "" : fallback;
    }

    // 중첩된 <source><title> 같은 것을 읽지 않도록 바로 아래 자식만 본다
    private static String text(Element parent, String tag) {
        for (Node n = parent.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n instanceof Element c && tag.equals(c.getTagName())) return c.getTextContent().trim();
        }
        return "";
    }

    private static String firstText(Element parent, String... tags) {
        for (String tag : tags) {
            String value = text(parent, tag);
            if (!value.isEmpty()) return value;
        }
        return "";
    }

    static Instant date(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String value = raw.trim();
        String noWeekday = value.replaceFirst("^[A-Za-z]{3,9},\\s*", "");
        try { return ZonedDateTime.parse(noWeekday, RFC_OFFSET).toInstant(); } catch (Exception ignored) { }
        try { return ZonedDateTime.parse(noWeekday, RFC_ZONE).toInstant(); } catch (Exception ignored) { }
        try { return OffsetDateTime.parse(value).toInstant(); } catch (Exception ignored) { }
        try { return Instant.parse(value); } catch (Exception ignored) { }
        return null;
    }

    // 태그와 개행을 걷어 낸 한 줄 글. 길면 자른다
    static String clean(String raw, int max) {
        if (raw == null) return "";
        String text = raw.replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
                .replaceAll("(?s)<[^>]*>", " ")
                .replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">")
                .replace("&quot;", "\"").replace("&#39;", "'").replace("&amp;", "&")
                .replaceAll("[\\p{Cntrl}&&[^\\s]]", "")
                .replaceAll("\\s+", " ").trim();
        if (text.codePointCount(0, text.length()) <= max) return text;
        return text.substring(0, text.offsetByCodePoints(0, max - 1)).trim() + "…";
    }

    // http(s)만 허용하고, 추적용 쿼리(utm_*, fbclid, gclid)와 #조각을 뺀 주소를 돌려준다. 쓸 수 없으면 null
    static String normalizeUrl(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            URI uri = new URI(raw.trim());
            String scheme = uri.getScheme();
            if (scheme == null || !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http")) || uri.getHost() == null) return null;
            String query = uri.getRawQuery();
            String kept = query == null ? null : java.util.Arrays.stream(query.split("&"))
                    .filter(p -> !p.isEmpty() && !p.toLowerCase(Locale.ROOT).startsWith("utm_")
                            && !p.toLowerCase(Locale.ROOT).startsWith("source=rss")
                            && !p.toLowerCase(Locale.ROOT).startsWith("fbclid") && !p.toLowerCase(Locale.ROOT).startsWith("gclid"))
                    .collect(Collectors.joining("&"));
            String path = uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath();
            // 이미 퍼센트 인코딩된 문자열을 그대로 이어 붙인다(URI 생성자에 나눠 넘기면 %가 다시 인코딩된다)
            String joined = scheme.toLowerCase(Locale.ROOT) + "://" + uri.getRawAuthority().toLowerCase(Locale.ROOT) + path
                    + (kept == null || kept.isEmpty() ? "" : "?" + kept);
            String out = new URI(joined).toASCIIString();
            return out.length() > URL_MAX ? null : out;
        } catch (Exception e) {
            return null;
        }
    }

    static String hash(String url) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(url.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
