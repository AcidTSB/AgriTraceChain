package com.agritrace.notification.repository;

import com.agritrace.notification.entity.NotificationSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NotificationSettingRepository extends JpaRepository<NotificationSetting, UUID> {
}
