package com.csstudy.backend.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="cs_channel_settings") @Getter @Setter @NoArgsConstructor
public class CsChannelSettings {
 @Id private Long id = 1L;
 private boolean enabled;
 private int contentIndex;
 @Column(length=1000) private String joinUrl = "";
 @Version private Long version;
}
