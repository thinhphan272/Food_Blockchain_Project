package com.smartchain;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmartChainApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartChainApplication.class, args);
    }
}
