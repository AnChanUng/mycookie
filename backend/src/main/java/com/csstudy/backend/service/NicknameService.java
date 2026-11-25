package com.csstudy.backend.service;
import com.csstudy.backend.entity.*;
import com.csstudy.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.Locale;

@Service @RequiredArgsConstructor
public class NicknameService {
    private final NicknameClaimRepository claims;
    private final UserRepository users;
    private final VisitorProfileRepository profiles;
    private final VisitorSolvedRepository solved;
    private final ApplicationEventPublisher events;
    private final CohortService cohort;
    private final TierAwardService tierAwards;
    public record Changed(Long userId) {}
    public static UserTier testTier(String name) {
        return switch (key(name)) {
            case "admin1" -> UserTier.BRONZE;
            case "admin2" -> UserTier.SILVER;
            case "admin3" -> UserTier.GOLD;
            case "admin4" -> UserTier.DIAMOND;
            case "admin5" -> UserTier.RUBY;
            default -> null;
        };
    }
    public static String key(String name) { return java.text.Normalizer.normalize(name,java.text.Normalizer.Form.NFKC).replaceAll("\\s+"," ").trim().toLowerCase(Locale.ROOT); }
    // 관리용 이름(admin…, 관리자, 운영자)은 일반 가입, 닉네임 변경, 방문자 이름으로 쓸 수 없다(관리자 계정은 홈서버에서만 만든다)
    public static boolean isReserved(String name) {
        String k = key(name == null ? "" : name).replace(" ", "");
        return k.startsWith("admin") || k.startsWith("관리자") || k.startsWith("운영자");
    }
    public static void rejectReserved(String name) {
        if (isReserved(name)) throw new com.csstudy.backend.exception.CookieException(com.csstudy.backend.exception.CookieErrorCode.NICKNAME_RESERVED);
    }
    public static String validate(String name) {
        String clean=name==null?"":name.replaceAll("[\\p{Cntrl}<>]","").replaceAll("\\s+"," ").trim();
        if(clean.isBlank() || clean.length()>20) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"닉네임은 1~20자로 입력해 주세요.");
        return clean;
    }
    @Transactional
    public User register(String name,String password,UserTier base,String visitorId) {
        String clean=validate(name);
        rejectReserved(clean);
        User user=users.saveAndFlush(User.builder().nickname(clean).password(password).baseTier(base).build());
        claim(clean,"u:"+user.getId(),visitorId);
        cohort.attachVisitorAccount(visitorId,user.getId());
        tierAwards.attachVisitorAccount(visitorId,user.getId());
        return user;
    }
    /** 관리자 계정 전용(RoleService). 예약된 이름도 쓸 수 있다 */
    @Transactional
    public User registerReserved(String name,String password) {
        String clean=validate(name);
        User user=users.saveAndFlush(User.builder().nickname(clean).password(password).baseTier(UserTier.BRONZE).build());
        claim(clean,"u:"+user.getId(),null);
        return user;
    }
    @Transactional
    public User rename(User existing,String name,String visitorId) {
        User user=users.findForUpdate(existing.getId()).orElseThrow();
        String clean=validate(name),owner="u:"+user.getId(),old=user.getNickname();
        if (testTier(old) != null && !clean.equals(old)) throw new com.csstudy.backend.exception.CookieException(
                com.csstudy.backend.exception.CookieErrorCode.INVALID_REQUEST, "등급별 테스트 계정의 닉네임은 변경할 수 없습니다.");
        if(!key(clean).equals(key(old))) rejectReserved(clean);
        claim(clean,owner,visitorId);
        user.setNickname(clean);users.saveAndFlush(user);
        release(old,clean,owner);
        // Update this account's linked visitor aliases, retaining their progress and eligibility.
        var ids=new java.util.HashSet<String>();
        solved.findByUserId(user.getId()).forEach(v->ids.add(v.getVisitorId()));
        if(visitorId!=null)ids.add(visitorId);
        profiles.findByVisitorIdIn(ids).forEach(p->{p.setNickname(clean);profiles.save(p);});
        events.publishEvent(new Changed(user.getId()));
        return user;
    }
    @Transactional
    public void visitor(String visitorId,String name,Long userId) {
        rejectReserved(name);
        String owner=userId==null?"v:"+visitorId:"u:"+userId;
        String old=profiles.findByVisitorId(visitorId).map(VisitorProfile::getNickname).orElse(null);
        // 로그인한 기기가 이미 가입 · 변경 검사를 통과한 자기 계정 닉네임을 기록하는 것은 막지 않는다.
        // 로그인 전 다른 기기가 같은 이름을 먼저 잡아 두었어도 그 이름의 주인을 계정으로 옮긴다
        // (채팅 입장 /lounge/presence 409, 이슈 #299 · 순위 중복 #297). 가입 · 닉네임 변경은 이 길을 타지 않는다
        if(userId!=null && ownAccountName(owner,key(name))) { takeForAccount(key(name),owner); release(old,name,owner); return; }
        claim(name,owner,visitorId);release(old,name,owner);
    }
    private void takeForAccount(String key,String owner) {
        var existing=claims.findById(key);
        if(existing.isEmpty()) claims.insertClaim(key,owner);
        else if(!existing.get().getOwner().equals(owner)) { existing.get().setOwner(owner); claims.saveAndFlush(existing.get()); }
    }
    private void claim(String name,String owner,String visitorId) {
        String key=key(name);
        var existing=claims.findById(key);
        if(existing.isPresent() && existing.get().getOwner().equals(owner)) return;
        for(User u:users.findAll()) {
            if(key(u.getNickname()).equals(key) && !owner.equals("u:"+u.getId())) conflict();
        }
        for(VisitorProfile p:profiles.findAll()) {
            if(!key(p.getNickname()).equals(key) || p.getVisitorId().equals(visitorId)) continue;
            boolean sameAccount=owner.startsWith("u:") && solved.findByVisitorId(p.getVisitorId()).map(v->owner.equals("u:"+v.getUserId())).orElse(false);
            if(!sameAccount) conflict();
        }
        if(existing.isPresent() && !existing.get().getOwner().equals(owner)
                && !(owner.startsWith("u:") && existing.get().getOwner().equals("v:"+visitorId))) conflict();
        if(existing.isEmpty()) claims.insertClaim(key,owner);
        else if(!existing.get().getOwner().equals(owner)) {
            existing.get().setOwner(owner);claims.saveAndFlush(existing.get());
        }
    }
    private void release(String old,String name,String owner) {
        if(old==null||key(old).equals(key(name)))return;
        claims.findById(key(old)).filter(c->c.getOwner().equals(owner)).ifPresent(claims::delete);
    }
    private boolean ownAccountName(String owner,String key) {
        try {
            return users.findById(Long.valueOf(owner.substring(2))).map(u->key(u.getNickname()).equals(key)).orElse(false);
        } catch(NumberFormatException e) { return false; }
    }
    private void conflict(){throw new com.csstudy.backend.exception.CookieException(com.csstudy.backend.exception.CookieErrorCode.NICKNAME_DUPLICATED);}
}
