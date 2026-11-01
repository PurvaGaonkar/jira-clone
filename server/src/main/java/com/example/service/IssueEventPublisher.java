
package com.example.jira.service;

import java.util.Map;
import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.jira.model.Issue;

@Service
public class IssueEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public IssueEventPublisher(
            SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publish(Issue issue, String action) {
        Map<String, Object> event = Map.of(
            "eventId", UUID.randomUUID().toString(),
            "action", action,
            "issue", issue,
            "timestamp", System.currentTimeMillis()
        );

        messagingTemplate.convertAndSend(
            "/topic/projects/" + issue.getProjectId() + "/issues",
            (Object) event
        );
    }
}
