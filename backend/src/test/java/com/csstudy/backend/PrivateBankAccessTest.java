package com.csstudy.backend;

import com.csstudy.backend.entity.AccountRole.Role;
import com.csstudy.backend.service.RoleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 비공개 문제집은 찬웅(OWNER)과 서버 환경변수(PRIVATE_BANK_NICKNAMES)에 적은 계정에게만 열린다. 닉네임은 저장소에 두지 않는다
@SpringBootTest(properties = "app.private-bank.nicknames= 문제집손님 ,  다른손님")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PrivateBankAccessTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RoleService roles;

    private String register(String nickname) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", nickname, "password", "test-password"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    private void expect(String token, boolean allowed) throws Exception {
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.privateBank").value(allowed));
    }

    @Test
    void onlyListedAccountsAndTheOwnerCanOpenPrivateBanks() throws Exception {
        expect(register("문제집손님"), true);
        expect(register("다른손님"), true);
        expect(register("평범한손님"), false);

        String owner = register("주인후보");
        expect(owner, false);
        roles.grant("주인후보", Role.OWNER);
        expect(owner, true);
    }
}
