package com.csstudy.backend.repository;
import com.csstudy.backend.entity.CsChannelSettings;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface CsChannelSettingsRepository extends JpaRepository<CsChannelSettings,Long> {
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CsChannelSettings c where c.id=1")
 Optional<CsChannelSettings> locked();
}
