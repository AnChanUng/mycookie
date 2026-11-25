package com.csstudy.backend.controller;

import com.csstudy.backend.entity.Donation;
import com.csstudy.backend.repository.DonationRepository;
import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.security.ClientAddress;
import com.csstudy.backend.security.DailyIpLimit;
import com.csstudy.backend.service.AdminAuth;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

/**
 * 사이트의 "자료 기부"로 올라온 파일을 받아 DB에 보관한다.
 * 올리는 사람도 서버도 GitHub 토큰이 필요 없고, 저장소 커밋은 이 자료로 문제를 만들 때 함께 한다.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DonationController {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    // 분류값 → 저장소에서 자료가 들어갈 폴더. 프런트의 KINDS와 같은 값을 쓴다
    private static final Map<String, String> DIRS = Map.of(
            "public", "공기업 필기",
            "major", "전공필기");

    // 공개 엔드포인트라 받을 수 있는 확장자를 자료로 쓸 만한 것으로 제한한다
    private static final Set<String> EXTS = Set.of(
            "pdf", "hwp", "hwpx", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "txt", "md", "csv", "png", "jpg", "jpeg", "gif", "webp", "zip");

    // 파일을 DB에 담으므로 무료 플랜 용량을 생각해 넉넉하지 않게 잡는다
    private static final long MAX_BYTES = 10L * 1024 * 1024;
    private static final int PER_VISITOR_PER_DAY = 10;
    // 방문자 ID는 요청마다 바꿔 보낼 수 있어서, 같은 곳(IP)에서 하루에 올릴 수 있는 수도 따로 막는다. 서버 메모리에만 둔다
    static final int PER_IP_PER_DAY = 10;
    private final DailyIpLimit perIp = new DailyIpLimit(PER_IP_PER_DAY);

    private final DonationRepository donationRepository;
    private final AdminAuth adminAuth;
    private final ClientAddress addresses;

    /** 누구나 부르는 기부 엔드포인트 */
    @PostMapping(value = "/donations", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> donate(@RequestPart("file") MultipartFile file,
                                      @RequestParam(value = "kind", required = false) String kind,
                                      @RequestParam(value = "label", required = false) String label,
                                      @RequestParam(value = "note", required = false) String note,
                                      @RequestHeader(value = "X-Visitor-Id", required = false) String visitorId,
                                      HttpServletRequest request) {

        if (file == null || file.isEmpty()) bad("올릴 파일이 없습니다.");
        if (file.getSize() > MAX_BYTES) bad("파일이 너무 큽니다. 10MB 이하만 올릴 수 있습니다.");

        String k = (kind == null || kind.isBlank()) ? "public" : kind;
        String dir = DIRS.get(k);
        if (dir == null) bad("자료 분류가 올바르지 않습니다.");

        String name = safeName(file.getOriginalFilename());
        if (!EXTS.contains(ext(name))) {
            bad("올릴 수 없는 형식입니다. PDF·HWP·문서·이미지·압축 파일만 받습니다.");
        }

        String title = trim(label, 120);
        if (title.isBlank()) bad("자료 이름을 적어 주세요.");

        String visitor = (visitorId == null || visitorId.isBlank()) ? "anon" : trim(visitorId, 40);
        LocalDate day = LocalDate.now(KST);
        if (donationRepository.countByVisitorIdAndDay(visitor, day) >= PER_VISITOR_PER_DAY
                || !perIp.tryAcquire(addresses.resolve(request), day)) {
            throw new CookieException(CookieErrorCode.DONATION_DAILY_LIMIT);
        }

        Donation saved = donationRepository.save(Donation.builder()
                .visitorId(visitor)
                .kind(k)
                .label(title)
                .note(trim(note, 200))
                .filename(name)
                .contentType(trim(file.getContentType(), 120))
                .size(file.getSize())
                .data(bytes(file))
                .handled(false)
                .day(day)
                .createdAt(Instant.now())
                .build());

        log.info("자료 기부 접수: #{} {} / {} ({} bytes)", saved.getId(), title, name, saved.getSize());
        return Map.of("ok", true, "id", saved.getId(), "path", dir + "/" + name);
    }

    /** 기부 장부. 파일 본문은 빼고 목록만 준다. 올린 사람이 적은 메모가 들어 있어 관리자만 본다 */
    @GetMapping("/donations")
    public List<Map<String, Object>> list(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : donationRepository.summaries()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r[0]);
            m.put("at", String.valueOf(r[1]));
            m.put("kind", r[2]);
            m.put("label", r[3]);
            m.put("note", r[4]);
            m.put("filename", r[5]);
            m.put("size", r[6]);
            m.put("handled", r[7]);
            out.add(m);
        }
        return out;
    }

    /** 올라온 파일 내려받기. 이 자료로 문제를 만들 때 쓴다 */
    @GetMapping("/donations/{id}/file")
    public ResponseEntity<byte[]> download(@PathVariable Long id,
                                           @RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        Donation d = donationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "그런 자료가 없습니다."));

        String encoded = java.net.URLEncoder.encode(d.getFilename(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE,
                        d.getContentType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : d.getContentType())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
                .body(d.getData());
    }

    /** 문제은행에 반영한 뒤 처리 표시를 남긴다 */
    @PutMapping("/donations/{id}/handled")
    public Map<String, Object> markHandled(@PathVariable Long id,
                                           @RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        Donation d = donationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "그런 자료가 없습니다."));
        d.setHandled(true);
        donationRepository.save(d);
        return Map.of("ok", true, "id", id);
    }

    /** 쓸모없는 자료나 장난으로 올라온 것을 지운다 */
    @DeleteMapping("/donations/{id}")
    public Map<String, Object> delete(@PathVariable Long id,
                                      @RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        if (!donationRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "그런 자료가 없습니다.");
        }
        donationRepository.deleteById(id);
        log.info("자료 기부 삭제: #{}", id);
        return Map.of("ok", true, "id", id);
    }

    // ===== 잡다한 검사 =====

    private byte[] bytes(MultipartFile f) {
        try {
            return f.getBytes();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일을 읽지 못했습니다.");
        }
    }

    private static String safeName(String raw) {
        String n = raw == null ? "donation" : raw.trim();
        n = n.replaceAll("[\\\\/:*?\"<>|]", "_").replaceAll("\\s+", " ");
        if (n.startsWith(".")) n = "_" + n;
        return n.length() > 160 ? n.substring(n.length() - 160) : n;
    }

    private static String ext(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static String trim(String s, int max) {
        if (s == null) return "";
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }

    private static void bad(String message) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
