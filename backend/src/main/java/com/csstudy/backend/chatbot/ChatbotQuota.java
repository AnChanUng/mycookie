package com.csstudy.backend.chatbot;

import java.time.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Value;

@Service
public class ChatbotQuota {
    private final JdbcTemplate db;
    private final int guest,user,total;
    private volatile boolean initialized;
    public ChatbotQuota(JdbcTemplate db,@Value("${CHATBOT_DAILY_GUEST:10}") int guest,
            @Value("${CHATBOT_DAILY_USER:50}") int user,@Value("${CHATBOT_DAILY_TOTAL:500}") int total){
        this.db=db; this.guest=guest; this.user=user; this.total=total;
    }
    public synchronized void initialize(){
        if(initialized) return;
        db.execute("create table if not exists chatbot_quota (day date, actor text, used int not null, primary key(day,actor))");
        initialized=true;
    }
    @Transactional
    public int reserve(String actor,boolean logged){
        var day=LocalDate.now(ZoneId.of("Asia/Seoul"));
        int limit=logged?user:guest;
        db.update("delete from chatbot_quota where day < ?",day);
        increment(day,"total",total);
        return limit-increment(day,actor,limit);
    }
    private int increment(LocalDate day,String key,int limit){
        if(limit>0){
            var rows=db.query("insert into chatbot_quota values (?,?,1) on conflict(day,actor) do update set used=chatbot_quota.used+1 where chatbot_quota.used < ? returning used",
                (rs,n)->rs.getInt(1),day,key,limit);
            if(!rows.isEmpty()) return rows.get(0);
        }
        throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"오늘 질문 한도를 다 썼어요.");
    }
}
