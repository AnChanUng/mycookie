# Java SE 17 공식 문서 기반 출제 자료

Java 핵심 문법 문제집의 기준 버전은 Java SE 17이다. 아래는 Oracle이 공개한 공식 명세의 관련 절과 출제할 때 확인할 내용을 한국어로 정리한 자료다.

| 확인할 내용 | 공식 원문 |
| --- | --- |
| 어떤 코드가 컴파일되는지, 어떤 식이 먼저 평가되는지 | [Java Language Specification, Java SE 17 Edition](https://docs.oracle.com/javase/specs/jls/se17/html/index.html) |
| 클래스와 메서드가 보장하는 반환값, 예외, 변경 가능 여부 | [Java SE 17 & JDK 17 API Specification](https://docs.oracle.com/en/java/javase/17/docs/api/index.html) |
| 클래스 파일, 프레임, 피연산자 스택 등 JVM의 실행 구조 | [Java Virtual Machine Specification, Java SE 17 Edition](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html) |

## 주제별 출제 근거

| 주제 | 문항에서 구별할 점 | 해당 절 또는 API |
| --- | --- | --- |
| 정수 나눗셈 | `double x = 7 / 2;`는 오른쪽에서 먼저 정수 나눗셈을 수행한다. 소수 부분을 버린 결과가 대입 시점에 `3.0`이 된다. | [JLS §15.17.2 Division Operator](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.17.2) |
| 오버로딩과 재정의 | 오버로드는 호출부의 컴파일 시점 타입으로 결정한다. 재정의된 인스턴스 메서드 호출에서는 실제 객체 타입이 실행할 구현을 결정한다. | [JLS §15.12.2 메서드 선택](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12.2), [§15.12.4.4 실행할 메서드 탐색](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12.4.4) |
| 컬렉션 | `List<Integer>`에서 `remove(1)`은 위치 1의 원소를 삭제한다. 값 1을 삭제하려면 `remove(Integer.valueOf(1))`로 다른 오버로드를 선택한다. | [List.remove(int)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html#remove(int)), [List.remove(Object)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html#remove(java.lang.Object)) |
| 제네릭 | `List<? extends Number>`에서 읽은 값은 Number에 대입할 수 있다. 실제 원소 타입이 정해지지 않아 임의의 Integer 값을 추가하는 코드는 컴파일되지 않는다. | [JLS §4.5.1 타입 인수와 와일드카드](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.5.1) |
| 예외와 자원 정리 | try-with-resources는 정상적으로 열린 자원을 역순으로 닫는다. 본문과 자원 정리에서 모두 예외가 발생한 경우에는 주 예외와 억제된 예외를 구분해 묻는다. | [JLS §14.20.3 try-with-resources](https://docs.oracle.com/javase/specs/jls/se17/html/jls-14.html#jls-14.20.3) |
| JVM | 메서드를 호출할 때 생성되는 프레임은 지역 변수와 피연산자 스택 등을 갖는다. 문제의 정답은 명세가 보장하는 실행 구조를 기준으로 정한다. | [JVMS §2.6 Frames](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html#jvms-2.6) |

## 출처를 붙인 문항 예시

**질문**　Java 17에서 다음 두 줄을 실행하면 어떤 값이 출력되는가?

```java
int count = 5;
System.out.println((double) (count / 2));
```

**정답**　`2.0`

**해설**　괄호 안에서는 두 피연산자가 모두 int이므로 먼저 정수 몫 2를 구한다. 그 뒤 double로 변환한다. 캐스트 위치를 바꾸어 `(double) count / 2`로 쓰면 나누기 전에 피연산자가 double로 변환되어 결과는 2.5다. [Java SE 17 JLS §15.17.2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.17.2)
