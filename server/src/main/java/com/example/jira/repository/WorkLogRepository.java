
package com.example.jira.repository;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.jira.model.WorkLog;

public interface WorkLogRepository
        extends MongoRepository<WorkLog, ObjectId> {

    List<WorkLog> findByIssueId(String issueId);

}
