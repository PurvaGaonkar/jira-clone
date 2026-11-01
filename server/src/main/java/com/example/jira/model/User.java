
package com.example.jira.model;

import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "users")
public class User {

    @Id
    private ObjectId id;

    private String name;
    private String email;
    private String password;
    private String role;
    private String group;
    private String avatar;
    private String phone;

    private String sessionToken;

    private String pendingEmail;
    private String emailVerificationToken;
    private Instant emailVerificationExpiry;

    private String avatarContentType;
    private long avatarSize;

    private boolean active = true;

    // Email notification preference
    private boolean emailNotificationsEnabled = true;

    private Instant createdAt = Instant.now();

    public String getId() {
        return id != null ? id.toHexString() : null;
    }

    public ObjectId getObjectId() {
        return id;
    }

    public void setId(ObjectId id) {
        this.id = id;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getGroup() { return group; }
    public void setGroup(String group) { this.group = group; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public String getPendingEmail() { return pendingEmail; }
    public void setPendingEmail(String pendingEmail) {
        this.pendingEmail = pendingEmail;
    }

    public String getEmailVerificationToken() {
        return emailVerificationToken;
    }

    public void setEmailVerificationToken(String token) {
        this.emailVerificationToken = token;
    }

    public Instant getEmailVerificationExpiry() {
        return emailVerificationExpiry;
    }

    public void setEmailVerificationExpiry(Instant expiry) {
        this.emailVerificationExpiry = expiry;
    }

    public String getAvatarContentType() {
        return avatarContentType;
    }

    public void setAvatarContentType(String avatarContentType) {
        this.avatarContentType = avatarContentType;
    }

    public long getAvatarSize() {
        return avatarSize;
    }

    public void setAvatarSize(long avatarSize) {
        this.avatarSize = avatarSize;
    }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public boolean isEmailNotificationsEnabled() {
        return emailNotificationsEnabled;
    }

    public void setEmailNotificationsEnabled(boolean enabled) {
        this.emailNotificationsEnabled = enabled;
    }

    public Instant getCreatedAt() { return createdAt; }
}

