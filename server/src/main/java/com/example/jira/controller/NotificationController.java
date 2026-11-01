
package com.example.jira.controller;

import com.example.jira.model.Notification;
import com.example.jira.model.User;
import com.example.jira.service.AuthService;
import com.example.jira.service.NotificationService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final AuthService authService;

    public NotificationController(
            NotificationService notificationService,
            AuthService authService) {
        this.notificationService = notificationService;
        this.authService = authService;
    }

    // GET ALL NOTIFICATIONS
    @GetMapping
    public List<Notification> getNotifications(
            @RequestHeader("Authorization") String header) {

        User user = authenticate(header);
        return notificationService.getNotifications(user.getId());
    }

    // GET UNREAD NOTIFICATIONS
    @GetMapping("/unread")
    public List<Notification> getUnreadNotifications(
            @RequestHeader("Authorization") String header) {

        User user = authenticate(header);
        return notificationService.getUnreadNotifications(user.getId());
    }

    // GET UNREAD COUNT
    @GetMapping("/unread/count")
    public long getUnreadCount(
            @RequestHeader("Authorization") String header) {

        User user = authenticate(header);
        return notificationService.getUnreadCount(user.getId());
    }

    // MARK ONE NOTIFICATION AS READ
    @PutMapping("/{id}/read")
    public void markAsRead(
            @PathVariable String id,
            @RequestHeader("Authorization") String header) {

        User user = authenticate(header);

        if (!org.bson.types.ObjectId.isValid(id)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid notification ID");
        }

        boolean updated =
                notificationService.markAsRead(id, user.getId());

        if (!updated) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Notification not found");
        }
    }

    // MARK ALL NOTIFICATIONS AS READ
    @PutMapping("/read-all")
    public void markAllAsRead(
            @RequestHeader("Authorization") String header) {

        User user = authenticate(header);
        notificationService.markAllAsRead(user.getId());
    }

    private User authenticate(String header) {

        if (header == null || !header.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required");
        }

        String token = header.substring(7).trim();

        return authService.authenticate(token);
    }
}
