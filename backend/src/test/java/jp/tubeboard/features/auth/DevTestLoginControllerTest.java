package jp.tubeboard.features.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import jakarta.servlet.http.Cookie;
import jp.tubeboard.config.IntegrationTest;

/** 開発用のテストログイン。指定したときだけ使え、それ以外では存在しないこと。 */
class DevTestLoginControllerTest {

    private static final String BODY = "{\"key\":\"scenario\",\"name\":\"シナリオ太郎\"}";

    @Nested
    @IntegrationTest
    @AutoConfigureMockMvc
    @ActiveProfiles("dev")
    @TestPropertySource(properties = {
            "app.dev.test-login=true",
            "app.dev.seed-dummy=false",
            "spring.security.oauth2.client.registration.google.client-id=test",
            "spring.security.oauth2.client.registration.google.client-secret=test" })
    class Enabled {

        @Autowired
        private MockMvc mockMvc;

        @Test
        void テスト用のユーザーでログインでき以降の操作に使える() throws Exception {
            MvcResult result = mockMvc.perform(post("/api/dev/test-login")
                    .contentType(MediaType.APPLICATION_JSON).content(BODY))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.sub").value("e2e-scenario"))
                    .andReturn();
            Cookie cookie = result.getResponse().getCookie("auth_token");
            assertThat(cookie).isNotNull();
            assertThat(cookie.isHttpOnly()).isTrue();

            mockMvc.perform(get("/api/auth/me").cookie(cookie))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("シナリオ太郎"));
        }
    }

    @Nested
    @IntegrationTest
    @AutoConfigureMockMvc
    class DisabledByDefault {

        @Autowired
        private MockMvc mockMvc;

        @Test
        void 指定しなければログインできない() throws Exception {
            MvcResult result = mockMvc.perform(post("/api/dev/test-login")
                    .contentType(MediaType.APPLICATION_JSON).content(BODY))
                    .andReturn();
            assertThat(result.getResponse().getStatus()).isGreaterThanOrEqualTo(400);
            assertThat(result.getResponse().getCookie("auth_token")).isNull();
        }
    }
}
