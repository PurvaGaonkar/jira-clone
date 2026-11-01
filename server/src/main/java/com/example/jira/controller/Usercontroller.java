
package com.example.jira.controller;

import java.io.IOException;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.example.jira.model.User;
import com.example.jira.repository.UserRepository;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/users")
public class Usercontroller {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.backend-url:http://localhost:8080}")
    private String backendUrl;

    // ================= SIGNUP =================

    @PostMapping("/signup")
    public Map<String, Object> signup(@RequestBody User user) {

        if (user.getEmail() == null || user.getEmail().isBlank()
                || userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Email already exists or is invalid");
        }

        if (user.getPassword() == null || !isStrongPassword(user.getPassword())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Password does not meet security requirements");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole("USER");
        user.setActive(true);
        user.setSessionToken(UUID.randomUUID().toString());

        return authResponse(userRepository.save(user));
    }

    // ================= LOGIN =================

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody User request) {

        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!user.isActive()) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "This account has been deactivated");
        }

        if (!passwordEncoder.matches(
                request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        user.setSessionToken(UUID.randomUUID().toString());
        userRepository.save(user);

        return authResponse(user);
    }

    // ================= LOGOUT =================

    @PostMapping("/logout")
    public void logout(@RequestHeader("Authorization") String header) {

        User user = authenticate(header);
        user.setSessionToken(null);
        userRepository.save(user);
    }

    // ================= GET USER =================

    @GetMapping("/{id}")
    public Map<String, Object> getUserById(@PathVariable String id) {

        if (!ObjectId.isValid(id)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Invalid user id");
        }

        User user = userRepository.findById(new ObjectId(id))
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "User not found"));

        return publicResponse(user);
    }

    // ================= EDIT PROFILE =================

    @PutMapping("/{id}")
    public Map<String, Object> editProfile(
            @PathVariable String id,
            @RequestHeader("Authorization") String header,
            @RequestBody User updatedUser) {

        User authenticatedUser = authenticate(header);

        if (!ObjectId.isValid(id)
                || !authenticatedUser.getId().toString().equals(id)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "You can only edit your own profile");
        }

        User user = userRepository.findById(new ObjectId(id))
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "User not found"));

        user.setName(updatedUser.getName());
        user.setGroup(updatedUser.getGroup());
        user.setPhone(updatedUser.getPhone());

        return publicResponse(userRepository.save(user));
    }

    // ================= PROFILE IMAGE UPLOAD =================

    @PostMapping(
        value = "/profile/avatar",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public Map<String, Object> uploadAvatar(
            @RequestHeader("Authorization") String header,
            @RequestParam("file") MultipartFile file) {

        User user = authenticate(header);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Please select an image");
        }

        if (file.getSize() > 2 * 1024 * 1024) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Image size must not exceed 2 MB");
        }

        try {
            byte[] bytes = file.getBytes();
            String contentType = detectImageType(bytes);

            if (contentType == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only PNG, JPG/JPEG and WebP images are supported");
            }

            String base64 = Base64.getEncoder().encodeToString(bytes);

            user.setAvatar("data:" + contentType + ";base64," + base64);
            user.setAvatarContentType(contentType);
            user.setAvatarSize(file.getSize());

            userRepository.save(user);

            return publicResponse(user);

        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Unable to process image");
        }
    }

    private String detectImageType(byte[] bytes) {

        // PNG
        if (bytes.length >= 8
                && bytes[0] == (byte) 0x89
                && bytes[1] == 0x50
                && bytes[2] == 0x4E
                && bytes[3] == 0x47
                && bytes[4] == 0x0D
                && bytes[5] == 0x0A
                && bytes[6] == 0x1A
                && bytes[7] == 0x0A) {
            return "image/png";
        }

        // JPEG
        if (bytes.length >= 3
                && bytes[0] == (byte) 0xFF
                && bytes[1] == (byte) 0xD8
                && bytes[2] == (byte) 0xFF) {
            return "image/jpeg";
        }

        // WebP
        if (bytes.length >= 12
                && bytes[0] == 'R'
                && bytes[1] == 'I'
                && bytes[2] == 'F'
                && bytes[3] == 'F'
                && bytes[8] == 'W'
                && bytes[9] == 'E'
                && bytes[10] == 'B'
                && bytes[11] == 'P') {
            return "image/webp";
        }

        return null;
    }

    // ================= CHANGE PASSWORD =================

    @PostMapping("/password/change")
    public Map<String, String> changePassword(
            @RequestHeader("Authorization") String header,
            @RequestBody Map<String, String> request) {

        User user = authenticate(header);

        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        if (currentPassword == null || newPassword == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Both passwords are required");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        if (!isStrongPassword(newPassword)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Password must be at least 8 characters and contain uppercase, lowercase, number and special character");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setSessionToken(null);
        userRepository.save(user);

        return Map.of(
            "message", "Password updated successfully. Please log in again."
        );
    }

    // ================= ACCOUNT DEACTIVATION =================

    @PostMapping("/deactivate")
    public Map<String, String> deactivateAccount(
            @RequestHeader("Authorization") String header,
            @RequestBody Map<String, String> request) {

        User user = authenticate(header);
        String password = request.get("password");

        if (password == null
                || !passwordEncoder.matches(password, user.getPassword())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Incorrect password");
        }

        user.setActive(false);
        user.setSessionToken(null);

        userRepository.save(user);

        return Map.of(
            "message", "Account deactivated successfully");
    }

    // ================= PASSWORD VALIDATION =================

    private boolean isStrongPassword(String password) {

        return password != null
            && password.length() >= 8
            && password.matches(".*[A-Z].*")
            && password.matches(".*[a-z].*")
            && password.matches(".*[0-9].*")
            && password.matches(".*[^A-Za-z0-9].*");
    }

    // ================= EMAIL CHANGE REQUEST =================

    @PostMapping("/email-change/request")
    public Map<String, String> requestEmailChange(
            @RequestHeader("Authorization") String header,
            @RequestBody Map<String, String> request) {

        User user = authenticate(header);
        String newEmail = request.get("email");

        if (newEmail == null || !newEmail.matches(
                "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Enter a valid email address");
        }

        if (newEmail.equalsIgnoreCase(user.getEmail())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "This is already your email");
        }

        if (userRepository.findByEmail(newEmail).isPresent()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Email is already in use");
        }

        String token = UUID.randomUUID().toString();

        user.setPendingEmail(newEmail);
        user.setEmailVerificationToken(token);
        user.setEmailVerificationExpiry(
            Instant.now().plusSeconds(15 * 60));

        userRepository.save(user);

        String verificationLink =
            backendUrl + "/api/users/verify-email?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(newEmail);
        message.setSubject("Confirm your Jira account email change");
        message.setText(
            "You requested to change your Jira account email.\n\n"
            + "Click the link below within 15 minutes to confirm:\n"
            + verificationLink
            + "\n\nIf you did not request this change, ignore this email."
        );

        mailSender.send(message);

        return Map.of(
            "message", "Verification email sent. Check your new email address."
        );
    }

    // ================= VERIFY EMAIL =================

    @GetMapping("/verify-email")
    public Map<String, String> verifyEmail(
            @RequestParam String token) {

        User user = userRepository.findByEmailVerificationToken(token)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Invalid or expired verification link"));

        if (user.getEmailVerificationExpiry() == null
                || user.getEmailVerificationExpiry().isBefore(Instant.now())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Verification link has expired");
        }

        if (user.getPendingEmail() == null
                || userRepository.findByEmail(user.getPendingEmail()).isPresent()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "This email address is no longer available");
        }

        user.setEmail(user.getPendingEmail());
        user.setPendingEmail(null);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiry(null);

        userRepository.save(user);

        return Map.of("message", "Email address updated successfully");
    }

    // ================= AUTHENTICATION =================

    private User authenticate(String header) {

        if (header == null || !header.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        String token = header.substring(7);

        User user = userRepository.findBySessionToken(token)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Invalid session"));

        if (!user.isActive()) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "Account is deactivated");
        }

        return user;
    }

    // ================= RESPONSE METHODS =================

    private Map<String, Object> publicResponse(User user) {

        Map<String, Object> result = new HashMap<>();

        result.put("id", user.getId());
        result.put("name", user.getName() == null ? "" : user.getName());
        result.put("email", user.getEmail() == null ? "" : user.getEmail());
        result.put("role", user.getRole() == null ? "USER" : user.getRole());
        result.put("group", user.getGroup() == null ? "" : user.getGroup());
        result.put("avatar", user.getAvatar() == null ? "" : user.getAvatar());
        result.put("phone", user.getPhone() == null ? "" : user.getPhone());
        result.put("active", user.isActive());

        return result;
    }

    private Map<String, Object> authResponse(User user) {

        Map<String, Object> result = new HashMap<>(publicResponse(user));
        result.put("sessionToken", user.getSessionToken());

        return result;
    }
}
