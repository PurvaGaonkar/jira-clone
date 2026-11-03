
package com.example.jira.config;

import com.example.jira.model.Project;
import com.example.jira.model.User;
import com.example.jira.repository.Projectrepository;
import com.example.jira.service.AuthService;

import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger logger =
            LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

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
                MessageHeaderAccessor.getAccessor(
                        message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        // Authenticate WebSocket connection
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            String header =
                    accessor.getFirstNativeHeader("Authorization");

            if (header == null || !header.startsWith("Bearer ")) {
                logger.warn(
                        "WebSocket CONNECT rejected: missing or invalid Authorization header");
                throw new IllegalArgumentException(
                        "Authentication required");
            }

            try {
                User user = authService.authenticate(header.substring(7));

                if (user == null || user.getId() == null) {
                    logger.warn("WebSocket CONNECT rejected: invalid user");
                    throw new IllegalArgumentException(
                            "Invalid authentication");
                }

                accessor.setUser(() -> user.getId());

                logger.info(
                        "WebSocket authenticated successfully. User ID: {}",
                        user.getId());

            } catch (Exception e) {
                logger.error("WebSocket authentication failed: {}",
                        e.getMessage());
                throw new IllegalArgumentException(
                        "WebSocket authentication failed", e);
            }
        }

        // Authorize project issue subscriptions
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {

            String destination = accessor.getDestination();

            if (destination == null ||
                    !destination.startsWith("/topic/projects/")) {
                return message;
            }

            if (accessor.getUser() == null) {
                logger.warn(
                        "Subscription rejected: user is not authenticated");
                throw new IllegalArgumentException(
                        "Authentication required");
            }

            String remainder =
                    destination.substring("/topic/projects/".length());

            String[] parts = remainder.split("/");
            String projectId = parts[0];

            if (!ObjectId.isValid(projectId)) {
                logger.error(
                        "Invalid project ID in subscription: {}",
                        projectId);
                throw new IllegalArgumentException(
                        "Invalid project ID");
            }

            Project project = projectRepository.findById(
                    new ObjectId(projectId)
            ).orElseThrow(() -> {
                logger.error("Project not found: {}", projectId);
                return new IllegalArgumentException(
                        "Project not found");
            });

            String userId = accessor.getUser().getName();

            boolean isOwner =
                    userId.equals(project.getOwnerId());

            boolean isMember =
                    project.getMemberIds() != null &&
                    project.getMemberIds().contains(userId);

            // Diagnostic logs
            logger.info("WebSocket subscription check:");
            logger.info("User ID: {}", userId);
            logger.info("Project ID: {}", projectId);
            logger.info("Project owner ID: {}", project.getOwnerId());
            logger.info("Project member IDs: {}",
                    project.getMemberIds());

            if (!isOwner && !isMember) {
                logger.warn(
                        "Subscription denied. User {} is not a member of project {}",
                        userId, projectId);

                throw new IllegalArgumentException(
                        "You are not a member of this project");
            }

            logger.info(
                    "WebSocket subscription authorized for project {}",
                    projectId);
        }

        return message;
    }
}
