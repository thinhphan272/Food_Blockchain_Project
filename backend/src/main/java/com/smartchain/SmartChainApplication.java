package com.smartchain;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SmartChainApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartChainApplication.class, args);
        System.out.println("=================================================");
        System.out.println(" SmartChain Backend Khoi Dong Thanh Cong!        ");
        System.out.println(" Cong API: http://localhost:8080                 ");
        System.out.println(" WebSocket: ws://localhost:8080/ws-smartchain    ");
        System.out.println("=================================================");
    }
}
