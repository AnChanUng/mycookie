package com.csstudy.backend.news;

import java.util.List;

// 기업 소식을 가져올 피드 목록. 모두 공개 RSS/Atom이고, 주소가 바뀌어 읽지 못하면 그 곳만 건너뛴다.
// 소스를 늘릴 때는 여기에 한 줄 더하면 된다(key는 저장된 글과 이어지므로 바꾸지 않는다).
// kind는 기술 블로그(TECH)와 회사 뉴스룸(NEWSROOM)을 나눈다. 기술 블로그 화면(/tech-blogs)은 TECH만 보여 준다
public final class NewsSources {

    private NewsSources() {}

    public enum Kind { TECH, NEWSROOM }

    public record Source(String key, String company, String name, String feedUrl, Kind kind) {}

    private static Source tech(String key, String company, String name, String feedUrl) {
        return new Source(key, company, name, feedUrl, Kind.TECH);
    }

    private static Source newsroom(String key, String company, String name, String feedUrl) {
        return new Source(key, company, name, feedUrl, Kind.NEWSROOM);
    }

    // 네이버는 D2 블로그의 피드 주소가 열리지 않아 계열 개발 블로그(Medium) 세 곳을 쓴다
    public static final List<Source> ALL = List.of(
            tech("naverpay", "네이버", "NAVER Pay 개발 블로그", "https://medium.com/feed/naverfinancial"),
            tech("naverplace", "네이버", "네이버 플레이스 개발 블로그", "https://medium.com/feed/naver-place-dev"),
            tech("navercloud", "네이버", "NAVER Cloud 블로그", "https://medium.com/feed/naver-cloud-platform"),
            tech("kakao", "카카오", "카카오 기술 블로그", "https://tech.kakao.com/feed"),
            tech("kakaopay", "카카오페이", "카카오페이 기술 블로그", "https://tech.kakaopay.com/rss"),
            tech("kakaobank", "카카오뱅크", "카카오뱅크 기술 블로그", "https://tech.kakaobank.com/index.xml"),
            tech("line", "LINE", "LY Corporation 기술 블로그", "https://techblog.lycorp.co.jp/ko/feed/index.xml"),
            tech("coupang", "쿠팡", "쿠팡 엔지니어링", "https://medium.com/feed/coupang-engineering"),
            tech("woowahan", "배민", "우아한형제들 기술 블로그", "https://techblog.woowahan.com/feed"),
            tech("musinsa", "무신사", "무신사 기술 블로그", "https://medium.com/feed/musinsa-tech"),
            tech("toss", "토스", "토스 기술 블로그", "https://toss.tech/rss.xml"),
            tech("daangn", "당근", "당근 기술 블로그", "https://medium.com/feed/daangn"),
            tech("oliveyoung", "올리브영", "올리브영 테크블로그", "https://oliveyoung.tech/rss.xml"),
            tech("yogiyo", "요기요", "요기요 기술 블로그", "https://techblog.yogiyo.co.kr/feed"),
            tech("gccompany", "여기어때", "여기어때 기술 블로그", "https://techblog.gccompany.co.kr/feed"),
            tech("gmarket", "G마켓", "G마켓 기술 블로그", "https://dev.gmarket.com/rss"),
            tech("lotteon", "롯데ON", "롯데ON 기술 블로그", "https://techblog.lotteon.com/feed"),
            tech("inflab", "인프랩", "인프랩 기술 블로그", "https://tech.inflab.com/rss.xml"),
            tech("nhncloud", "NHN", "NHN Cloud Meetup", "https://meetup.nhncloud.com/rss"),
            tech("hyperconnect", "하이퍼커넥트", "하이퍼커넥트 기술 블로그", "https://hyperconnect.github.io/feed.xml"),
            tech("watcha", "왓챠", "왓챠 기술 블로그", "https://medium.com/feed/watcha"),
            newsroom("samsung", "삼성전자", "삼성전자 뉴스룸", "https://news.samsung.com/kr/feed"),
            newsroom("sktelecom", "SK텔레콤", "SK텔레콤 뉴스룸", "https://news.sktelecom.com/feed"),
            newsroom("skhynix", "SK하이닉스", "SK하이닉스 뉴스룸", "https://news.skhynix.co.kr/feed")
    );

    public static List<String> companies() {
        return ALL.stream().map(Source::company).distinct().toList();
    }

    public static List<String> companies(Kind kind) {
        return ALL.stream().filter(s -> s.kind() == kind).map(Source::company).distinct().toList();
    }

    public static List<String> keys(Kind kind) {
        return ALL.stream().filter(s -> s.kind() == kind).map(Source::key).toList();
    }
}
