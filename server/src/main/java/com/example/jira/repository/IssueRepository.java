
package com.example.jira.repository;

import com.example.jira.model.Issue;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface IssueRepository extends MongoRepository<Issue, ObjectId> {

    List<Issue> findByProjectId(String projectId);

    // Find all subtasks belonging to a parent issue
    List<Issue> findByParentIssueId(String parentIssueId);

    // Find tasks that depend on a particular issue
    List<Issue> findByDependsOnIssueIdsContaining(String issueId);

    // Find tasks with deadlines in a given time range
    List<Issue> findByDueDateBetween(Instant start, Instant end);
}
