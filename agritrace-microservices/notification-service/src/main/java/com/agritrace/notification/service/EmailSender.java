package com.agritrace.notification.service;

public interface EmailSender {
    void sendEmail(String toEmail, String subject, String body);
}
