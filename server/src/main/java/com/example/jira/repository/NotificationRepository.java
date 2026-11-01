
package com.example.jira.repository;

import com.example.jira.model.Notification;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository
        extends MongoRepository<Notification, ObjectId> {

    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(
            String recipientUserId);

    List<Notification> findByRecipientUserIdAndReadOrderByCreatedAtDesc(
            String recipientUserId, boolean read);

    Optional<Notification> findByEventKey(String eventKey);

    long countByRecipientUserIdAndRead(
            String recipientUserId, boolean read);
}
