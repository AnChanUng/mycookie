import { HubCard, HubHeader, HubSection } from '../components/Hub';

const BLOGS = [
  { name: '네이버', label: 'NAVER D2', url: 'https://d2.naver.com/' },
  { name: '토스', label: '토스 테크', url: 'https://toss.tech/category/engineering' },
  { name: '무신사', label: '무신사 테크 · 29CM', url: 'https://techblog.musinsa.com/' },
  { name: '카카오', label: '카카오테크', url: 'https://tech.kakao.com/' },
  { name: '우아한형제들', label: '우아한형제들 기술블로그', url: 'https://techblog.woowahan.com/' },
];

export default function TechBlogsPage() {
  return (
    <div className="fade-in">
      <HubHeader back={{ to: '/web', label: '웹 개발' }} eyebrow="웹 기본기" title="기업 기술블로그"
        desc="기업별 공식 기술블로그를 모았어요. 누르면 새 탭에서 열려요."
        stats={[{ value: BLOGS.length, label: '기업' }]} />
      <HubSection title="기술블로그">
        {BLOGS.map(({ name, label, url }) => (
          <HubCard key={url} href={url} icon={[...name][0]} title={name} desc={label} go="블로그 열기" label={`${name} 기술블로그`} />
        ))}
      </HubSection>
    </div>
  );
}
