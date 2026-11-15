package com.smartchain.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Cấu hình Bảo mật Spring Security 6 + JWT Stateless RBAC cho 8 Actor.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"status\":\"ERROR\",\"error\":\"UNAUTHORIZED\",\"message\":\"Yêu cầu đăng nhập và đính kèm JWT Bearer Token hợp lệ!\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"status\":\"ERROR\",\"error\":\"FORBIDDEN_RBAC\",\"message\":\"Vai trò (Role) của bạn không có quyền thực hiện thao tác này!\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // 1. Public Endpoints: Auth, System Health, WebSocket, Consumer QR Traceability
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/google", "/api/v1/auth/roles", "/api/v1/auth/users").permitAll()
                .requestMatchers("/api/v1/system/**", "/ws-smartchain/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/trace/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/profiles/**", "/api/v1/batches/**", "/api/v1/telemetry/**", "/api/v1/qc/**", "/api/v1/shelf/**", "/api/v1/nosql/**", "/api/v1/blockchain/**").permitAll()
                // Cho phép trạm mô phỏng Wokwi / IoT Edge gửi kịch bản & lệnh
                .requestMatchers("/api/v1/iot/**").permitAll()

                // 2. RBAC Protected Write Endpoints
                .requestMatchers(HttpMethod.POST, "/api/v1/profiles/**").hasAnyRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/profiles/**").hasAnyRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/profiles/**").hasAnyRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/auth/users/**").hasAnyRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/batches/**").hasAnyRole("ADMIN", "PRODUCER")
                .requestMatchers(HttpMethod.POST, "/api/v1/qc/approve/**").hasAnyRole("ADMIN", "QC_INSPECTOR", "INBOUND_GATE")
                .requestMatchers(HttpMethod.POST, "/api/v1/shelf/stock/**").hasAnyRole("ADMIN", "SHELF_OPERATOR", "INBOUND_GATE")
                .requestMatchers(HttpMethod.POST, "/api/v1/pos/checkout").hasAnyRole("ADMIN", "CASHIER")
                .requestMatchers(HttpMethod.POST, "/api/v1/recall", "/api/v1/admin/recall").hasAnyRole("ADMIN", "QC_INSPECTOR")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}

