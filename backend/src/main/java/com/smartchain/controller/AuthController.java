package com.smartchain.controller;

import com.smartchain.entity.Role;
import com.smartchain.entity.User;
import com.smartchain.repository.mysql.RoleRepository;
import com.smartchain.repository.mysql.UserRepository;
import com.smartchain.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository,
                          RoleRepository roleRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String username = payload.getOrDefault("username", "").trim();
        String password = payload.getOrDefault("password", "").trim();

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                    "status", "ERROR",
                    "error", "USER_NOT_FOUND",
                    "message", "Tài khoản không tồn tại trên hệ thống!"
            ));
        }

        User user = userOpt.get();
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            return ResponseEntity.status(403).body(Map.of(
                    "status", "ERROR",
                    "error", "ACCOUNT_DISABLED",
                    "message", "Tài khoản đã bị tạm khóa hoặc vô hiệu hóa bởi Quản trị viên!"
            ));
        }

        // Xác thực mật khẩu qua BCryptPasswordEncoder
        boolean passwordValid = passwordEncoder.matches(password, user.getPasswordHash());
        if (!passwordValid) {
            return ResponseEntity.status(401).body(Map.of(
                    "status", "ERROR",
                    "error", "INVALID_CREDENTIALS",
                    "message", "Mật khẩu không chính xác!"
            ));
        }

        String roleName = user.getRole() != null ? user.getRole().getRoleName() : "CONSUMER";
        String token = jwtService.generateToken(user.getUsername(), roleName, user.getFullName());

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("token", token);
        response.put("userId", user.getUserId());
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName());
        response.put("department", user.getDepartment());
        response.put("phone", user.getPhone() != null ? user.getPhone() : "");
        response.put("identityCard", user.getIdentityCard() != null ? user.getIdentityCard() : "");
        response.put("assignedEntity", user.getAssignedEntity() != null ? user.getAssignedEntity() : "");
        response.put("notes", user.getNotes() != null ? user.getNotes() : "");
        response.put("role", roleName);
        response.put("roleDescription", user.getRole() != null ? user.getRole().getDescription() : "");
        response.put("createdAt", user.getCreatedAt());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        String username = payload.getOrDefault("username", "").trim();
        String password = payload.getOrDefault("password", "123").trim();
        String fullName = payload.getOrDefault("fullName", username).trim();
        String department = payload.getOrDefault("department", "Operations").trim();
        String roleName = payload.getOrDefault("role", "CONSUMER").trim().toUpperCase();

        if (username.isEmpty() || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "message", "Tên đăng nhập và mật khẩu không được để trống!"
            ));
        }

        // Quy tắc phân quyền doanh nghiệp:
        // Cổng công khai chỉ cho phép đăng ký tài khoản Khách hàng (CONSUMER).
        // Mọi tài khoản doanh nghiệp (PRODUCER, LOGISTICS_DRIVER, QC_INSPECTOR, SHELF_OPERATOR, CASHIER, ADMIN)
        // bắt buộc phải do Quản trị viên (ADMIN) đã đăng nhập tạo.
        if (!"CONSUMER".equalsIgnoreCase(roleName)) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAdminCaller = auth != null && auth.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority()));
            if (!isAdminCaller) {
                return ResponseEntity.status(403).body(Map.of(
                        "status", "ERROR",
                        "error", "ENTERPRISE_ROLE_RESTRICTED",
                        "message", "Chỉ được phép tự đăng ký tài khoản Khách hàng (CONSUMER). Tài khoản Doanh nghiệp phải do Quản trị viên (ADMIN) cấp phát!"
                ));
            }
        }

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(409).body(Map.of(
                    "status", "ERROR",
                    "error", "USERNAME_ALREADY_EXISTS",
                    "message", "Tài khoản '" + username + "' đã tồn tại trên hệ thống, vui lòng chọn tên đăng nhập khác!"
            ));
        }

        Role role = roleRepository.findByRoleName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, "Vai trò " + roleName)));

        User newUser = new User(
                username,
                passwordEncoder.encode(password),
                fullName,
                department,
                role
        );
        newUser.setPhone(payload.getOrDefault("phone", "").trim());
        newUser.setIdentityCard(payload.getOrDefault("identityCard", "").trim());
        newUser.setAssignedEntity(payload.getOrDefault("assignedEntity", "").trim());
        newUser.setNotes(payload.getOrDefault("notes", "").trim());
        newUser.setIsActive(true);
        newUser.setCreatedAt(Instant.now());
        User saved = userRepository.save(newUser);

        String token = jwtService.generateToken(saved.getUsername(), role.getRoleName(), saved.getFullName());

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Đăng ký tài khoản mới thành công trên MySQL (users & roles)!");
        response.put("token", token);
        response.put("userId", saved.getUserId());
        response.put("username", saved.getUsername());
        response.put("fullName", saved.getFullName());
        response.put("department", saved.getDepartment());
        response.put("phone", saved.getPhone());
        response.put("identityCard", saved.getIdentityCard());
        response.put("assignedEntity", saved.getAssignedEntity());
        response.put("notes", saved.getNotes());
        response.put("role", role.getRoleName());
        return ResponseEntity.status(201).body(response);
    }

    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<?> updateUserStatus(@PathVariable String userId, @RequestBody Map<String, Object> payload) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        Boolean isActive = payload.containsKey("isActive")
                ? Boolean.valueOf(String.valueOf(payload.get("isActive")))
                : !Boolean.TRUE.equals(user.getIsActive());
        user.setIsActive(isActive);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "userId", user.getUserId(),
                "username", user.getUsername(),
                "isActive", user.getIsActive(),
                "message", isActive ? "Đã kích hoạt lại tài khoản" : "Đã khóa tài khoản"
        ));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload) {
        String username = payload.getOrDefault("username", "").trim();
        String oldPassword = payload.getOrDefault("oldPassword", "").trim();
        String newPassword = payload.getOrDefault("newPassword", "").trim();

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("status", "ERROR", "message", "Không tìm thấy người dùng!"));
        }
        User user = userOpt.get();
        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("status", "ERROR", "message", "Mật khẩu hiện tại không đúng!"));
        }
        if (newPassword.length() < 3) {
            return ResponseEntity.badRequest().body(Map.of("status", "ERROR", "message", "Mật khẩu mới phải từ 3 ký tự trở lên!"));
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Đổi mật khẩu BCrypt thành công!"));
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable String userId, @RequestBody Map<String, String> payload) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        if (payload.containsKey("fullName") && !payload.get("fullName").trim().isEmpty()) {
            user.setFullName(payload.get("fullName").trim());
        }
        if (payload.containsKey("department")) {
            user.setDepartment(payload.get("department").trim());
        }
        if (payload.containsKey("phone")) {
            user.setPhone(payload.get("phone").trim());
        }
        if (payload.containsKey("identityCard")) {
            user.setIdentityCard(payload.get("identityCard").trim());
        }
        if (payload.containsKey("assignedEntity")) {
            user.setAssignedEntity(payload.get("assignedEntity").trim());
        }
        if (payload.containsKey("notes")) {
            user.setNotes(payload.get("notes").trim());
        }
        if (payload.containsKey("password") && !payload.get("password").trim().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(payload.get("password").trim()));
        }
        if (payload.containsKey("role") && !payload.get("role").trim().isEmpty()) {
            String roleName = payload.get("role").trim().toUpperCase();
            Role role = roleRepository.findByRoleName(roleName)
                    .orElseGet(() -> roleRepository.save(new Role(roleName, "Vai trò " + roleName)));
            user.setRole(role);
        }
        if (payload.containsKey("isActive")) {
            user.setIsActive(Boolean.valueOf(payload.get("isActive")));
        }
        userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Cập nhật hồ sơ tài khoản thành công!",
                "userId", user.getUserId()
        ));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        if ("admin".equalsIgnoreCase(user.getUsername())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "message", "Không thể xóa tài khoản Quản trị viên tối cao (admin)!"
            ));
        }
        userRepository.delete(user);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Đã xóa tài khoản " + user.getUsername() + " thành công!"
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<Map<String, Object>> list = userRepository.findAll().stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("userId", u.getUserId());
            m.put("username", u.getUsername());
            m.put("fullName", u.getFullName());
            m.put("department", u.getDepartment());
            m.put("phone", u.getPhone() != null ? u.getPhone() : "");
            m.put("identityCard", u.getIdentityCard() != null ? u.getIdentityCard() : "");
            m.put("assignedEntity", u.getAssignedEntity() != null ? u.getAssignedEntity() : "");
            m.put("notes", u.getNotes() != null ? u.getNotes() : "");
            m.put("role", u.getRole() != null ? u.getRole().getRoleName() : "CONSUMER");
            m.put("roleDescription", u.getRole() != null ? u.getRole().getDescription() : "");
            m.put("isActive", u.getIsActive());
            m.put("createdAt", u.getCreatedAt());
            return m;
        }).toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/roles")
    public ResponseEntity<List<Role>> getAllRoles() {
        return ResponseEntity.ok(roleRepository.findAll());
    }
}
