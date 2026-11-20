// 웹 필수지식 레벨. 문답 데이터(webEssentials.js)는 백엔드로도 내보내므로 레벨은 여기 따로 둔다.
// 새 문답을 추가하면 여기에도 레벨을 넣는다(check:notes가 빠진 것을 잡는다)
export const LEVELS = [
  { level: 1, name: '기초', desc: '웹 개발을 시작할 때 먼저 알아야 할 것' },
  { level: 2, name: '실무', desc: '서비스를 만들고 운영하며 마주치는 것' },
  { level: 3, name: '심화', desc: '규모가 커질 때의 설계와 선택' },
];

export const WEB_LEVEL = {
  // Lv.1 기초
  'web-backend-role': 1, 'web-learning': 1, 'web-tool-choice': 1, 'web-framework-basics': 1,
  'web-http-methods': 1, 'web-rest': 1, 'web-request-path': 1,
  'web-database-basics': 1, 'web-joins': 1,
  'web-cookie-session': 1, 'web-session-jwt': 1, 'web-sql-injection': 1,
  'web-testing-terms': 1, 'web-data-structures': 1, 'web-dto-vo': 1,
  'web-builds': 1, 'web-review-ci': 1, 'web-cloud-models': 1,
  'web-spring-di': 1, 'web-spring-ioc': 1,
  // Lv.2 실무
  'web-operations': 2, 'web-growth': 2,
  'web-http-versions': 2, 'web-rendering': 2, 'web-api-contract': 2, 'web-pagination': 2, 'web-graphql': 2,
  'web-query-tuning': 2, 'web-cache-local-global': 2,
  'web-thread-safety': 2, 'web-parallelism': 2,
  'web-xss': 2, 'web-csrf': 2, 'web-dependencies': 2,
  'web-api-testing': 2, 'web-db-testing': 2, 'web-regression': 2,
  'web-boundaries': 2, 'web-deployment': 2, 'web-schema-migration': 2, 'web-observability': 2,
  'web-spring-aop': 2, 'web-spring-proxy': 2, 'web-spring-transaction': 2,
  // Lv.3 심화
  'web-stored-procedure': 3, 'web-cache-invalidation': 3, 'web-replication': 3, 'web-sharding': 3, 'web-files-search': 3,
  'web-thread-pool': 3, 'web-reactive-virtual': 3, 'web-immutable-cache': 3,
  'web-microservices': 3, 'web-remote-failures': 3,
  'web-jvm-gc': 3, 'web-performance': 3, 'web-serverless': 3,
};

export const levelOf = id => WEB_LEVEL[id] || 2;
