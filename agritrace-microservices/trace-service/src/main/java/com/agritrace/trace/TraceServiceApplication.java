package com.agritrace.trace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@EnableDiscoveryClient
@ComponentScan(basePackages = {"com.agritrace.trace", "com.agritrace.common"})
public class TraceServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(TraceServiceApplication.class, args);
    }
}
