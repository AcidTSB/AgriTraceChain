package com.agritrace.notification.repository;

import com.agritrace.notification.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<Alert, UUID> {
    List<Alert> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM Alert a WHERE a.userId = :userId AND a.message LIKE %:batchCode%")
    List<Alert> findAlertsByBatch(@org.springframework.data.repository.query.Param("userId") UUID userId, @org.springframework.data.repository.query.Param("batchCode") String batchCode);
}
