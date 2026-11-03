
package com.example.jira.controller;

import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import com.example.jira.service.IssueEventPublisher;
import com.example.jira.service.NotificationService;
import com.example.jira.service.AttachmentService;

import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private final IssueRepository issueRepository;
    private final IssueEventPublisher eventPublisher;
    private final NotificationService notificationService;
    private final AttachmentService attachmentService;

    public IssueController(
            IssueRepository issueRepository,
            IssueEventPublisher eventPublisher,
            NotificationService notificationService,
            AttachmentService attachmentService) {
        this.issueRepository = issueRepository;
        this.eventPublisher = eventPublisher;
        this.notificationService = notificationService;
        this.attachmentService = attachmentService;
    }

    // CREATE NORMAL ISSUE
    @PostMapping
    public Issue createIssue(@RequestBody Issue issue) {

        if (issue.getParentIssueId() != null ||
                "SUBTASK".equalsIgnoreCase(issue.getType())) {
            throw new RuntimeException(
                "Subtasks must be created under a parent task"
            );
        }

        issue.setDependsOnIssueIds(
            issue.getDependsOnIssueIds() == null
                ? new ArrayList<>()
                : issue.getDependsOnIssueIds()
        );

        issue.setUpdatedAt(Instant.now());

        Issue saved = issueRepository.save(issue);
        eventPublisher.publish(saved, "CREATED");

        notifyAssignment(saved);

        return saved;
    }

    // CREATE SUBTASK
    @PostMapping("/{parentId}/subtasks")
    public Issue createSubtask(
            @PathVariable String parentId,
            @RequestBody Issue subtask) {

        Issue parent = getIssue(parentId);

        if ("SUBTASK".equalsIgnoreCase(parent.getType())) {
            throw new RuntimeException(
                "A subtask cannot have its own subtasks"
            );
        }

        subtask.setId(null);
        subtask.setParentIssueId(parent.getId());
        subtask.setProjectId(parent.getProjectId());
        subtask.setSprintId(parent.getSprintId());
        subtask.setType("SUBTASK");
        subtask.setDependsOnIssueIds(new ArrayList<>());
        subtask.setUpdatedAt(Instant.now());

        Issue saved = issueRepository.save(subtask);
        eventPublisher.publish(saved, "CREATED");

        notifyAssignment(saved);

        return saved;
    }

    // GET ISSUES BY PROJECT
    @GetMapping("/project/{projectId}")
    public List<Issue> getIssuesByProject(
            @PathVariable String projectId) {
        return issueRepository.findByProjectId(projectId);
    }

    // GET ISSUE BY ID
    @GetMapping("/{id}")
    public Issue getIssueById(@PathVariable String id) {
        return getIssue(id);
    }

    // GET SUBTASKS OF A PARENT
    @GetMapping("/{parentId}/subtasks")
    public List<Issue> getSubtasks(
            @PathVariable String parentId) {

        getIssue(parentId);
        return issueRepository.findByParentIssueId(parentId);
    }

    // UPDATE ISSUE
    @PutMapping("/{id}")
    public Issue updateIssue(
            @PathVariable String id,
            @RequestBody Issue updated) {

        Issue issue = getIssue(id);

        String oldStatus = issue.getStatus();
        String oldAssigneeId = issue.getAssigneeId();

        String newStatus = updated.getStatus();
        String newAssigneeId = updated.getAssigneeId();

        // PREVENT COMPLETING PARENT WITH INCOMPLETE SUBTASKS
        if ("DONE".equalsIgnoreCase(newStatus)
                && !"DONE".equalsIgnoreCase(issue.getStatus())) {

            List<Issue> subtasks =
                    issueRepository.findByParentIssueId(id);

            boolean incompleteSubtasks = subtasks.stream()
                    .anyMatch(subtask ->
                        !"DONE".equalsIgnoreCase(subtask.getStatus()));

            if (incompleteSubtasks) {
                throw new RuntimeException(
                    "Complete all subtasks before completing the parent task"
                );
            }
        }

        // PREVENT STARTING A BLOCKED TASK
        if ("IN_PROGRESS".equalsIgnoreCase(newStatus)
                && !areDependenciesCompleted(issue)) {

            throw new RuntimeException(
                "This task is blocked. Complete its dependent tasks first."
            );
        }

        // UPDATE ISSUE DETAILS
        issue.setTitle(updated.getTitle());
        issue.setDescription(updated.getDescription());
        issue.setStatus(newStatus);
        issue.setPriority(updated.getPriority());
        issue.setAssigneeId(newAssigneeId);
        issue.setOrder(updated.getOrder());
        issue.setComments(updated.getComments());
        issue.setUpdatedAt(Instant.now());

        // UPDATE DEPENDENCIES IF PROVIDED
        if (updated.getDependsOnIssueIds() != null) {
            validateDependencies(
                issue,
                updated.getDependsOnIssueIds()
            );

            issue.setDependsOnIssueIds(
                updated.getDependsOnIssueIds()
            );
        }

        Issue saved = issueRepository.save(issue);
        eventPublisher.publish(saved, "UPDATED");

        if (newAssigneeId != null
                && !newAssigneeId.equals(oldAssigneeId)) {
            notifyAssignment(saved);
        }

        if (newStatus != null
                && !newStatus.equalsIgnoreCase(
                        oldStatus == null ? "" : oldStatus)) {
            notifyStatusChange(saved);
        }

        return saved;
    }

    // NOTIFY NEW ASSIGNEE
    private void notifyAssignment(Issue issue) {

        if (issue.getAssigneeId() == null) {
            return;
        }

        String eventKey = issue.getId()
                + ":ASSIGNED:"
                + issue.getUpdatedAt().toEpochMilli();

        notificationService.notifyIssueEvent(
                issue.getAssigneeId(),
                issue.getProjectId(),
                issue.getId(),
                issue.getSprintId(),
                "TASK_ASSIGNED",
                eventKey,
                "Task assigned to you",
                "You have been assigned task: " + issue.getTitle()
        );
    }

    // NOTIFY ASSIGNEE AND REPORTER ABOUT STATUS CHANGE
    private void notifyStatusChange(Issue issue) {

        Set<String> recipients = new HashSet<>();

        if (issue.getAssigneeId() != null) {
            recipients.add(issue.getAssigneeId());
        }

        if (issue.getReporterId() != null) {
            recipients.add(issue.getReporterId());
        }

        for (String recipientId : recipients) {

            String eventKey = issue.getId()
                    + ":STATUS:"
                    + issue.getUpdatedAt().toEpochMilli()
                    + ":"
                    + recipientId;

            notificationService.notifyIssueEvent(
                    recipientId,
                    issue.getProjectId(),
                    issue.getId(),
                    issue.getSprintId(),
                    "TASK_STATUS_CHANGED",
                    eventKey,
                    "Task status updated",
                    "Task '" + issue.getTitle()
                            + "' status changed to "
                            + issue.getStatus()
            );
        }
    }

    // ADD OR REPLACE DEPENDENCIES
    @PutMapping("/{id}/dependencies")
    public Issue updateDependencies(
            @PathVariable String id,
            @RequestBody List<String> dependencyIds) {

        Issue issue = getIssue(id);
        validateDependencies(issue, dependencyIds);

        issue.setDependsOnIssueIds(dependencyIds);
        issue.setUpdatedAt(Instant.now());

        Issue saved = issueRepository.save(issue);
        eventPublisher.publish(saved, "UPDATED");
        return saved;
    }

    // CHECK WHETHER ALL DEPENDENCIES ARE COMPLETED
    private boolean areDependenciesCompleted(Issue issue) {

        List<String> dependencies = issue.getDependsOnIssueIds();

        if (dependencies == null || dependencies.isEmpty()) {
            return true;
        }

        for (String dependencyId : dependencies) {
            Issue dependency = getIssue(dependencyId);

            if (!"DONE".equalsIgnoreCase(dependency.getStatus())) {
                return false;
            }
        }

        return true;
    }

    // VALIDATE DEPENDENCIES
    private void validateDependencies(
            Issue issue,
            List<String> dependencyIds) {

        if (dependencyIds == null) return;

        Set<String> uniqueIds = new HashSet<>(dependencyIds);

        if (uniqueIds.size() != dependencyIds.size()) {
            throw new RuntimeException(
                "Duplicate dependencies are not allowed"
            );
        }

        for (String dependencyId : dependencyIds) {

            Issue dependency = getIssue(dependencyId);

            if (issue.getId().equals(dependency.getId())) {
                throw new RuntimeException(
                    "A task cannot depend on itself"
                );
            }

            if (!issue.getProjectId().equals(
                    dependency.getProjectId())) {
                throw new RuntimeException(
                    "Dependencies must belong to the same project"
                );
            }

            if (hasCircularDependency(
                    dependencyId,
                    issue.getId(),
                    new HashSet<>())) {

                throw new RuntimeException(
                    "Circular task dependency detected"
                );
            }
        }
    }

    // PREVENT CIRCULAR DEPENDENCIES USING DFS
    private boolean hasCircularDependency(
            String currentId,
            String targetId,
            Set<String> visited) {

        if (currentId.equals(targetId)) return true;
        if (!visited.add(currentId)) return false;

        Issue current = getIssue(currentId);
        List<String> dependencies =
                current.getDependsOnIssueIds();

        if (dependencies == null) return false;

        for (String dependencyId : dependencies) {
            if (hasCircularDependency(
                    dependencyId, targetId, visited)) {
                return true;
            }
        }

        return false;
    }

    // DELETE ISSUE AND ITS ATTACHMENTS
    @DeleteMapping("/{id}")
    public void deleteIssue(@PathVariable String id) {

        Issue issue = getIssue(id);

        List<Issue> subtasks =
                issueRepository.findByParentIssueId(id);

        if (!subtasks.isEmpty()) {
            throw new RuntimeException(
                "Delete subtasks before deleting the parent task"
            );
        }

        // Delete attachment files and their MongoDB records first.
        attachmentService.deleteAllForIssue(id);

        issueRepository.deleteById(validateId(id));
        eventPublisher.publish(issue, "DELETED");
    }

    // HELPER: GET ISSUE
    private Issue getIssue(String id) {
        return issueRepository.findById(validateId(id))
                .orElseThrow(() ->
                    new RuntimeException("Issue not found"));
    }

    // HELPER: VALIDATE OBJECT ID
    private ObjectId validateId(String id) {
        if (id == null || !ObjectId.isValid(id)) {
            throw new RuntimeException("Invalid issue ID");
        }
        return new ObjectId(id);
    }
}
