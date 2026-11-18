# 로그 레벨별 저장

설정 파일: `backend/src/main/resources/logback-spring.xml`

## 켜는 법
콘솔 출력은 항상 그대로입니다. 파일 저장은 `file-log` 프로필을 켰을 때만 합니다(홈서버용).

```bash
SPRING_PROFILES_ACTIVE=file-log java -jar app.jar
# 다른 프로필과 함께: SPRING_PROFILES_ACTIVE=rag,file-log
```

## 파일
| 파일 | 내용 | 보관 |
|---|---|---|
| `error.log` | ERROR만 | 90일 |
| `warn.log` | WARN만 | 30일 |
| `info.log` | INFO만 | 30일 |
| `debug.log` | DEBUG만(패키지 레벨을 DEBUG로 낮췄을 때만 채워짐) | 7일 |
| `app.log` | 전체 | 30일 |

- 날짜가 바뀌거나 파일이 50~100MB를 넘으면 `archive/`에 gzip으로 옮깁니다. 파일별 전체 용량 상한(1~3GB)을 넘으면 오래된 것부터 지웁니다.
- info · debug · 전체 파일은 비동기로 써서 요청 처리를 붙잡지 않습니다. 전체 파일(app.log)은 큐가 차도 로그를 버리지 않습니다.
- 시간은 한국 시간으로 적습니다.

## 환경변수
| 변수 | 기본값 | 설명 |
|---|---|---|
| `LOGGING_FILE_PATH` | `logs` | 로그 폴더 |
| `LOG_MAX_HISTORY` | `30` | 보관 일수 |
| `LOG_ERROR_MAX_HISTORY` | `90` | 에러 로그 보관 일수 |
| `LOGGING_LEVEL_COM_CSSTUDY` | `INFO` | `DEBUG`로 바꾸면 debug.log가 채워짐 |

## 자주 쓰는 명령
```bash
tail -f logs/error.log                 # 에러만 실시간으로
zgrep "Exception" logs/archive/error.* # 지난 에러 찾기
```

Docker로 띄울 때는 로그 폴더를 볼륨으로 연결하세요(`-v /srv/devcookie/logs:/app/logs`).
