package com.agritrace.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class MockSmsSender implements SmsSender {
    @Override
    public void sendSms(String phoneNumber, String message) {
        log.info("MOCK SMS to {}: {}", phoneNumber, message);
    }
}
