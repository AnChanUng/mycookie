package com.csstudy.backend.news;

import java.util.List;

// 기업 소식을 가져올 피드 목록. 모두 공개 RSS/Atom이고, 주소가 바뀌어 읽지 못하면 그 곳만 건너뛴다.
// 소스를 늘릴 때는 여기에 한 줄 더하면 된다(key는 저장된 글과 이어지므로 바꾸지 않는다)
public final class NewsSources {

    private NewsSources() {}

    public record Source(String key, String company, String name, String feedUrl) {}

    // 네이버는 D2 블로그의 피드 주소가 열리지 않아 계열 개발 블로그(Medium) 세 곳을 쓴다
    public static final List<Source> ALL = List.of(
            new Source("naverpay", "네이버", "NAVER Pay 개발 블로그", "https://medium.com/feed/naverfinancial"),
            new Source("naverplace", "네이버", "네이버 플레이스 개발 블로그", "https://medium.com/feed/naver-place-dev"),
            new Source("navercloud", "네이버", "NAVER Cloud 블로그", "https://medium.com/feed/naver-cloud-platform"),
            new Source("kakao", "카카오", "카카오 기술 블로그", "https://tech.kakao.com/feed"),
            new Source("line", "LINE", "LY Corporation 기술 블로그", "https://techblog.lycorp.co.jp/ko/feed/index.xml"),
            new Source("coupang", "쿠팡", "쿠팡 엔지니어링", "https://medium.com/feed/coupang-engineering"),
            new Source("woowahan", "배민", "우아한형제들 기술 블로그", "https://techblog.woowahan.com/feed"),
            new Source("musinsa", "무신사", "무신사 기술 블로그", "https://medium.com/feed/musinsa-tech"),
            new Source("toss", "토스", "토스 기술 블로그", "https://toss.tech/rss.xml"),
            new Source("daangn", "당근", "당근 기술 블로그", "https://medium.com/feed/daangn"),
            new Source("samsung", "삼성전자", "삼성전자 뉴스룸", "https://news.samsung.com/kr/feed"),
            new Source("sktelecom", "SK텔레콤", "SK텔레콤 뉴스룸", "https://news.sktelecom.com/feed"),
            new Source("skhynix", "SK하이닉스", "SK하이닉스 뉴스룸", "https://news.skhynix.co.kr/feed")
    );

    public static List<String> companies() {
        return ALL.stream().map(Source::company).distinct().toList();
    }
}
