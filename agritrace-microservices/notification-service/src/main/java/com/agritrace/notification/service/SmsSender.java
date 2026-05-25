package com.agritrace.notification.service;

public interface SmsSender {
    void sendSms(String phoneNumber, String message);
}
