package com.agritrace.notification.controller;

import com.agritrace.notification.entity.Alert;
import com.agritrace.notification.entity.NotificationSetting;
import com.agritrace.notification.repository.AlertRepository;
import com.agritrace.notification.repository.NotificationSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationSettingRepository settingRepository;
    private final AlertRepository alertRepository;

    @GetMapping("/settings")
    public ResponseEntity<NotificationSetting> getSettings(@RequestHeader("X-User-Id") String userId) {
        UUID uid = UUID.fromString(userId);
        NotificationSetting setting = settingRepository.findById(uid)
                .orElse(NotificationSetting.builder().userId(uid).build());
        return ResponseEntity.ok(setting);
    }

    @PutMapping("/settings")
    public ResponseEntity<NotificationSetting> updateSettings(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody NotificationSetting request) {
        
        UUID uid = UUID.fromString(userId);
        NotificationSetting setting = settingRepository.findById(uid)
                .orElse(NotificationSetting.builder().userId(uid).build());
        
        setting.setPushEnabled(request.getPushEnabled());
        setting.setSmsEnabled(request.getSmsEnabled());
        setting.setEmailEnabled(request.getEmailEnabled());
        setting.setInAppEnabled(request.getInAppEnabled());

        NotificationSetting saved = settingRepository.save(setting);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<Alert>> getUnreadAlerts(@RequestHeader("X-User-Id") String userId) {
        UUID uid = UUID.fromString(userId);
        List<Alert> alerts = alertRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(uid);
        return ResponseEntity.ok(alerts);
    }

    @PostMapping("/{alertId}/read")
    public ResponseEntity<Void> markAsRead(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID alertId) {
        
        alertRepository.findById(alertId).ifPresent(alert -> {
            if (alert.getUserId().toString().equals(userId)) {
                alert.setIsRead(true);
                alertRepository.save(alert);
            }
        });
        return ResponseEntity.ok().build();
    }
}
