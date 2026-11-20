package com.csstudy.backend.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="cs_channel_deliveries") @Getter @Setter @NoArgsConstructor
public class CsChannelDelivery {
 @Id @Column(length=80) private String id;
 private int contentIndex;
 @Column(length=16) private String status;
 private int attempts;
 @Column(length=200) private String error;
 private Instant updatedAt;
}
