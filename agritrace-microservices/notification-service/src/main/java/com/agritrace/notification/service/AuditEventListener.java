package com.agritrace.notification.service;

import com.agritrace.notification.entity.Alert;
import com.agritrace.notification.entity.NotificationSetting;
import com.agritrace.notification.repository.AlertRepository;
import com.agritrace.notification.repository.NotificationSettingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditEventListener {

    private final ObjectMapper objectMapper;
    private final AlertRepository alertRepository;
    private final NotificationSettingRepository settingRepository;
    private final SmsSender smsSender;
    private final EmailSender emailSender;

    @KafkaListener(topics = "audit-ledger-topic", groupId = "notification-group")
    @Transactional
    public void listen(String message) {
        log.info("Received message from audit-ledger-topic: {}", message);
        try {
            Map<String, Object> payload = objectMapper.readValue(message, new TypeReference<Map<String, Object>>() {});
            
            String operation = (String) payload.get("operation");
            String batchCode = (String) payload.get("batchCode");
            
            boolean isCompromisedEvent = false;

            // Check operation name
            if (operation != null && operation.contains("COMPROMISED")) {
                isCompromisedEvent = true;
            }

            // Also check afterSnapshot if it contains isCompromised = true
            Object afterSnapshotObj = payload.get("afterSnapshot");
            if (afterSnapshotObj != null) {
                String afterSnapshotStr = afterSnapshotObj.toString();
                if (afterSnapshotStr.contains("\"isCompromised\":true") || afterSnapshotStr.contains("\"isCompromised\": true")) {
                    isCompromisedEvent = true;
                }
            }
            
            if (isCompromisedEvent) {
                log.warn("🚨 Fraud/Compromised batch detected: {}", batchCode);
                
                // Need to extract actorId or ownerId. 
                // Let's assume the actorId from payload might be the one we notify if it's the farmer, 
                // but actually, we should notify the owner.
                // For simplicity as requested, we get actorId from payload.
                String actorIdStr = (String) payload.get("actorId");
                if (actorIdStr == null) {
                    log.warn("No actorId found in payload, cannot notify specific user.");
                    // In a real app we might query product-service for the batch owner, but here we'll just skip if null.
                    return;
                }
                
                UUID userId = UUID.fromString(actorIdStr);
                String alertMessage = "Lô hàng " + batchCode + " bị cảnh báo gian lận dữ liệu!";

                // Fetch settings
                NotificationSetting setting = settingRepository.findById(userId)
                    .orElse(NotificationSetting.builder().userId(userId).build());

                // Save In-App alert
                if (setting.getInAppEnabled()) {
                    Alert alert = Alert.builder()
                        .userId(userId)
                        .message(alertMessage)
                        .build();
                    alertRepository.save(alert);
                }

                // Send SMS
                if (setting.getSmsEnabled()) {
                    // Mock phone number
                    smsSender.sendSms("+84999999999", alertMessage);
                }

                // Send Email
                if (setting.getEmailEnabled()) {
                    emailSender.sendEmail("user_" + userId + "@agritrace.mock", "Cảnh báo gian lận", alertMessage);
                }
                
                // Push Notification (Mock)
                if (setting.getPushEnabled()) {
                    log.info("MOCK PUSH NOTIFICATION to user {}: {}", userId, alertMessage);
                }
            }

        } catch (Exception e) {
            log.error("Error processing audit event", e);
        }
    }
}
