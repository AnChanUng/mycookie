package com.csstudy.backend;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.logging.LogLevel;
import org.springframework.boot.logging.LoggingInitializationContext;
import org.springframework.boot.logging.LoggingSystem;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.util.FileSystemUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// file-log 프로필을 켜면 레벨별 파일에 해당 레벨만, app.log에는 전부 쌓이는지 확인한다.
// 스프링 부트는 같은 JVM에서 한 번 만든 로그 설정을 다시 읽지 않으므로, 여기서 직접 다시 초기화하고 끝나면 되돌린다
class LevelLogFilesTest {

    static final Path DIR = Path.of("build/test-logs/level-files");
    final Logger log = LoggerFactory.getLogger(LevelLogFilesTest.class);
    final LoggingSystem logging = LoggingSystem.get(getClass().getClassLoader());

    @BeforeEach
    void setUp() throws IOException {
        FileSystemUtils.deleteRecursively(DIR);
        StandardEnvironment env = new StandardEnvironment();
        env.setActiveProfiles("file-log");
        env.getPropertySources().addFirst(new MapPropertySource("test", Map.of("logging.file.path", DIR.toString())));
        reinitialize(env);
        logging.setLogLevel(LevelLogFilesTest.class.getName(), LogLevel.DEBUG);
    }

    @AfterEach
    void restore() {
        reinitialize(new StandardEnvironment());
    }

    private void reinitialize(StandardEnvironment env) {
        logging.cleanUp();
        logging.beforeInitialize();
        logging.initialize(new LoggingInitializationContext(env), null, null);
    }

    @Test
    void eachLevelGoesToItsOwnFile() throws Exception {
        String id = UUID.randomUUID().toString();
        log.error("error-{}", id);
        log.warn("warn-{}", id);
        log.info("info-{}", id);
        log.debug("debug-{}", id);

        // info · debug · 전체 파일은 비동기로 쓰므로 잠시 기다린다
        waitFor(DIR.resolve("app.log"), "debug-" + id);
        waitFor(DIR.resolve("info.log"), "info-" + id);
        waitFor(DIR.resolve("debug.log"), "debug-" + id);

        assertOnly("error.log", "error-", id);
        assertOnly("warn.log", "warn-", id);
        assertOnly("info.log", "info-", id);
        assertOnly("debug.log", "debug-", id);
        assertThat(read(DIR.resolve("app.log")))
                .contains("error-" + id, "warn-" + id, "info-" + id, "debug-" + id);
    }

    private void assertOnly(String file, String expected, String id) throws IOException {
        String body = read(DIR.resolve(file));
        assertThat(body).as(file).contains(expected + id);
        for (String level : new String[]{"error-", "warn-", "info-", "debug-"}) {
            if (!level.equals(expected)) assertThat(body).as(file).doesNotContain(level + id);
        }
    }

    private static void waitFor(Path file, String text) throws Exception {
        for (int i = 0; i < 50; i++) {
            if (read(file).contains(text)) return;
            Thread.sleep(100);
        }
    }

    private static String read(Path file) throws IOException {
        return Files.exists(file) ? Files.readString(file, StandardCharsets.UTF_8) : "";
    }
}
