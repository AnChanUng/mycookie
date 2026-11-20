package com.csstudy.backend.repository;
import com.csstudy.backend.entity.CsChannelDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CsChannelDeliveryRepository extends JpaRepository<CsChannelDelivery,String> {
 List<CsChannelDelivery> findTop30ByOrderByUpdatedAtDesc();
}
