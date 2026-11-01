package com.example.jira.config;

import com.example.jira.model.Project;
import com.example.jira.model.User;
import com.example.jira.repository.Projectrepository;
import com.example.jira.service.AuthService;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final AuthService authService;
    private final Projectrepository projectRepository;

    public WebSocketAuthInterceptor(
            AuthService authService,
            Projectrepository projectRepository) {
        this.authService = authService;
        this.projectRepository = projectRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");

            if (header == null || !header.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Authentication required");
            }

            User user = authService.authenticate(header.substring(7));
            accessor.setUser(() -> user.getId());
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();

            if (destination != null && destination.startsWith("/topic/projects/")) {
                if (accessor.getUser() == null) {
                    throw new IllegalArgumentException("Authentication required");
                }

                String remainder =
                    destination.substring("/topic/projects/".length());
                String projectId = remainder.split("/")[0];

                Project project = projectRepository.findById(
                    new org.bson.types.ObjectId(projectId)
                ).orElseThrow(() ->
                    new IllegalArgumentException("Project not found"));

                String userId = accessor.getUser().getName();

                boolean allowed =
                    userId.equals(project.getOwnerId()) ||
                    (project.getMemberIds() != null &&
                     project.getMemberIds().contains(userId));

                if (!allowed) {
                    throw new IllegalArgumentException(
                        "You are not a member of this project");
                }
            }
        }

        return message;
    }
}