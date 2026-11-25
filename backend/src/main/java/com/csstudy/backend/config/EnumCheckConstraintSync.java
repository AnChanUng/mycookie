package com.csstudy.backend.config;

import jakarta.persistence.Column;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.metamodel.EntityType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.lang.reflect.Field;
import java.sql.Connection;
import java.util.*;
import java.util.regex.Pattern;

// Hibernate는 @Enumerated(STRING) 칸에 "허용 값 목록" CHECK 제약을 만든다. 그런데 ddl-auto: update는
// 나중에 enum 값을 더해도 이 목록을 고치지 않아서, 새 값(예: 포인트 내역의 QUEST)을 저장할 때마다 제약 위반(409)이 난다.
// 서버가 뜰 때 PostgreSQL에서만 enum 칸의 CHECK 제약을 지금 enum 값과 비교해, 빠진 값이 있으면 새 목록으로 다시 만든다.
// 실패해도 서버 시작은 막지 않고 경고만 남긴다. 온프레미스 DB로 옮겨 Flyway를 쓰게 되면 그쪽 마이그레이션으로 옮긴다.
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class EnumCheckConstraintSync implements ApplicationRunner {

    private static final Pattern IDENT = Pattern.compile("[a-z_][a-z0-9_]*");

    private final DataSource dataSource;
    private final EntityManagerFactory entityManagerFactory;

    record EnumColumn(String table, String column, List<String> values) {}

    @Override
    public void run(ApplicationArguments args) {
        try {
            if (!isPostgres()) return;
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            for (EnumColumn column : enumColumns()) sync(jdbc, column);
        } catch (Exception e) {
            log.warn("enum CHECK 제약 점검을 건너뜀: {}", e.getMessage());
        }
    }

    private boolean isPostgres() throws Exception {
        try (Connection c = dataSource.getConnection()) {
            return "PostgreSQL".equalsIgnoreCase(c.getMetaData().getDatabaseProductName());
        }
    }

    private void sync(JdbcTemplate jdbc, EnumColumn col) {
        if (!IDENT.matcher(col.table()).matches() || !IDENT.matcher(col.column()).matches()) return;
        List<Map<String, Object>> checks = jdbc.queryForList(
                "select c.conname as name, pg_get_constraintdef(c.oid) as def from pg_constraint c "
                        + "where c.conrelid = to_regclass(?) and c.contype = 'c'", col.table());
        for (Map<String, Object> check : checks) {
            String name = String.valueOf(check.get("name"));
            String def = String.valueOf(check.get("def"));
            if (!isEnumCheckFor(def, col.column(), col.values()) || !missingValues(def, col.values())) continue;
            String quotedName = '"' + name.replace("\"", "\"\"") + '"';
            String list = String.join(", ", col.values().stream().map(v -> "'" + v.replace("'", "''") + "'").toList());
            jdbc.execute("alter table " + col.table() + " drop constraint " + quotedName);
            jdbc.execute("alter table " + col.table() + " add constraint " + quotedName + " check (" + col.column() + " in (" + list + "))");
            log.info("enum CHECK 제약 갱신: {}.{} → {}", col.table(), col.column(), col.values());
        }
    }

    /** 이 칸을 대상으로 enum 값 목록을 검사하는 CHECK인지(칸 이름과 enum 값 하나 이상이 들어 있다). */
    static boolean isEnumCheckFor(String def, String column, Collection<String> values) {
        if (def == null || !Pattern.compile("\\b" + Pattern.quote(column) + "\\b").matcher(def).find()) return false;
        return values.stream().anyMatch(v -> def.contains("'" + v + "'"));
    }

    /** 지금 enum 값 중 CHECK 목록에 빠진 것이 있는지. */
    static boolean missingValues(String def, Collection<String> values) {
        return values.stream().anyMatch(v -> !def.contains("'" + v + "'"));
    }

    private List<EnumColumn> enumColumns() {
        List<EnumColumn> out = new ArrayList<>();
        for (EntityType<?> entity : entityManagerFactory.getMetamodel().getEntities()) {
            Class<?> type = entity.getJavaType();
            Table table = type.getAnnotation(Table.class);
            String tableName = table != null && !table.name().isBlank() ? table.name().toLowerCase(Locale.ROOT) : snake(type.getSimpleName());
            for (Class<?> c = type; c != null && c != Object.class; c = c.getSuperclass()) {
                for (Field field : c.getDeclaredFields()) {
                    Enumerated enumerated = field.getAnnotation(Enumerated.class);
                    if (enumerated == null || enumerated.value() != EnumType.STRING || !field.getType().isEnum()) continue;
                    Column column = field.getAnnotation(Column.class);
                    String columnName = column != null && !column.name().isBlank() ? column.name().toLowerCase(Locale.ROOT) : snake(field.getName());
                    List<String> values = Arrays.stream(field.getType().getEnumConstants()).map(e -> ((Enum<?>) e).name()).toList();
                    out.add(new EnumColumn(tableName, columnName, values));
                }
            }
        }
        return out;
    }

    // Spring Boot 기본 이름 규칙(CamelCaseToUnderscoresNamingStrategy)과 같게: pointHistory → point_history
    static String snake(String name) {
        return name.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }
}
