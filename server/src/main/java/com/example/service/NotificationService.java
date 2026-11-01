
package com.example.jira.service;

import com.example.jira.model.Issue;
import com.example.jira.model.Notification;
import com.example.jira.model.User;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.NotificationRepository;
import com.example.jira.repository.UserRepository;

import org.bson.types.ObjectId;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@EnableScheduling
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final IssueRepository issueRepository;
    private final JavaMailSender mailSender;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            IssueRepository issueRepository,
            JavaMailSender mailSender) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.issueRepository = issueRepository;
        this.mailSender = mailSender;
    }

    // CREATE IN-APP NOTIFICATION AND SEND EMAIL IF ENABLED
    public void notifyIssueEvent(
            String recipientUserId,
            String projectId,
            String issueId,
            String sprintId,
            String eventType,
            String eventKey,
            String title,
            String message) {

        if (recipientUserId == null
                || !ObjectId.isValid(recipientUserId)
                || eventKey == null
                || eventKey.isBlank()) {
            return;
        }

        if (notificationRepository.findByEventKey(eventKey).isPresent()) {
            return;
        }

        Notification notification = new Notification();
        notification.setRecipientUserId(recipientUserId);
        notification.setProjectId(projectId);
        notification.setIssueId(issueId);
        notification.setSprintId(sprintId);
        notification.setEventType(eventType);
        notification.setEventKey(eventKey);
        notification.setTitle(title);
        notification.setMessage(message);

        try {
            notificationRepository.save(notification);
        } catch (DuplicateKeyException ignored) {
            return;
        }

        Optional<User> optionalUser =
                userRepository.findById(new ObjectId(recipientUserId));

        if (optionalUser.isEmpty()) {
            return;
        }

        User user = optionalUser.get();

        if (!user.isEmailNotificationsEnabled()
                || user.getEmail() == null
                || user.getEmail().isBlank()) {
            return;
        }

        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(user.getEmail());
            mail.setSubject(title);
            mail.setText(message);

            mailSender.send(mail);

        } catch (Exception exception) {
            System.err.println(
                    "Notification email failed: "
                            + exception.getMessage());
        }
    }

    // CHECK FOR TASKS DUE IN APPROXIMATELY 24 HOURS
    @Scheduled(fixedRate = 60000)
    public void sendDeadlineReminders() {

        Instant now = Instant.now();

        Instant start = now.plus(23, ChronoUnit.HOURS)
                .plus(59, ChronoUnit.MINUTES);

        Instant end = now.plus(24, ChronoUnit.HOURS)
                .plus(1, ChronoUnit.MINUTES);

        List<Issue> upcomingIssues =
                issueRepository.findByDueDateBetween(start, end);

        for (Issue issue : upcomingIssues) {

            // Do not remind users about completed tasks.
            if ("DONE".equalsIgnoreCase(issue.getStatus())) {
                continue;
            }

            Set<String> recipients = new HashSet<>();

            if (issue.getAssigneeId() != null) {
                recipients.add(issue.getAssigneeId());
            }

            if (issue.getReporterId() != null) {
                recipients.add(issue.getReporterId());
            }

            for (String recipientId : recipients) {

                String eventKey = issue.getId()
                        + ":DEADLINE_24H:"
                        + issue.getDueDate().toEpochMilli()
                        + ":" + recipientId;

                notifyIssueEvent(
                        recipientId,
                        issue.getProjectId(),
                        issue.getId(),
                        issue.getSprintId(),
                        "TASK_DEADLINE_REMINDER",
                        eventKey,
                        "Task deadline approaching",
                        "Task '" + issue.getTitle()
                                + "' is due in approximately 24 hours."
                );
            }
        }
    }

    // GET ALL NOTIFICATIONS
    public List<Notification> getNotifications(String userId) {
        return notificationRepository
                .findByRecipientUserIdOrderByCreatedAtDesc(userId);
    }

    // GET UNREAD NOTIFICATIONS
    public List<Notification> getUnreadNotifications(String userId) {
        return notificationRepository
                .findByRecipientUserIdAndReadOrderByCreatedAtDesc(
                        userId, false);
    }

    // GET UNREAD COUNT
    public long getUnreadCount(String userId) {
        return notificationRepository
                .countByRecipientUserIdAndRead(userId, false);
    }

    // MARK ONE NOTIFICATION AS READ
    public boolean markAsRead(String notificationId, String userId) {

        if (!ObjectId.isValid(notificationId)) {
            return false;
        }

        return notificationRepository.findById(
                new ObjectId(notificationId))
                .filter(n -> userId.equals(n.getRecipientUserId()))
                .map(n -> {
                    n.setRead(true);
                    notificationRepository.save(n);
                    return true;
                })
                .orElse(false);
    }

    // MARK ALL NOTIFICATIONS AS READ
    public boolean markAllAsRead(String userId) {

        List<Notification> notifications =
                getUnreadNotifications(userId);

        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);

        return true;
    }
}
