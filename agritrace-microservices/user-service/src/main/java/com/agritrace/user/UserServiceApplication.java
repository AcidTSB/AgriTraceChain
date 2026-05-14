package com.agritrace.user;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.agritrace")
@EnableDiscoveryClient
@EnableJpaRepositories(basePackages = {"com.agritrace.user.repository", "com.agritrace.auth.repository"})
@EntityScan(basePackages = {"com.agritrace.user.entity", "com.agritrace.auth.entity"})
public class UserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}
