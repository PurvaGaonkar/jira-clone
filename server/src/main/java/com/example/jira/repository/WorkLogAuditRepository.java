
package com.example.jira.repository;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.jira.model.WorkLogAudit;

public interface WorkLogAuditRepository
        extends MongoRepository<WorkLogAudit, ObjectId> {

    List<WorkLogAudit> findByWorkLogId(String workLogId);

    List<WorkLogAudit> findByIssueId(String issueId);
}

