
package com.example.jira.repository;

import com.example.jira.model.Attachment;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AttachmentRepository
        extends MongoRepository<Attachment, ObjectId> {

    List<Attachment> findByIssueId(String issueId);

    List<Attachment> findByProjectId(String projectId);

    void deleteByIssueId(String issueId);
}
