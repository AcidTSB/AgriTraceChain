package com.agritrace.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class MockEmailSender implements EmailSender {
    @Override
    public void sendEmail(String toEmail, String subject, String body) {
        log.info("MOCK EMAIL to {} - Subject: {} - Body: {}", toEmail, subject, body);
    }
}
