
package com.example.jira.controller;

import com.example.jira.model.Issue;
import com.example.jira.model.Sprint;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.SprintRepository;
import com.example.jira.service.NotificationService;

import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;
    private final NotificationService notificationService;

    public SprintController(
            SprintRepository sprintRepository,
            IssueRepository issueRepository,
            NotificationService notificationService) {
        this.sprintRepository = sprintRepository;
        this.issueRepository = issueRepository;
        this.notificationService = notificationService;
    }

    // CREATE SPRINT
    @PostMapping
    public Sprint createSprint(@RequestBody Sprint sprint) {
        sprint.setStatus("PLANNED");
        return sprintRepository.save(sprint);
    }

    // GET SPRINTS BY PROJECT
    @GetMapping("/project/{projectId}")
    public List<Sprint> getSprintsByProject(
            @PathVariable String projectId) {
        return sprintRepository.findByProjectId(projectId);
    }

    // START SPRINT
    @PutMapping("/{id}/start")
    public Sprint startSprint(@PathVariable String id) {

        Sprint sprint = getSprint(id);

        if ("ACTIVE".equalsIgnoreCase(sprint.getStatus())) {
            return sprint;
        }

        sprint.setStatus("ACTIVE");
        sprint.setStartDate(Instant.now());

        Sprint saved = sprintRepository.save(sprint);

        notifySprintUsers(saved, "SPRINT_STARTED");

        return saved;
    }

    // COMPLETE SPRINT
    @PutMapping("/{id}/complete")
    public Sprint completeSprint(@PathVariable String id) {

        Sprint sprint = getSprint(id);

        if ("COMPLETED".equalsIgnoreCase(sprint.getStatus())) {
            return sprint;
        }

        sprint.setStatus("COMPLETED");
        sprint.setEndDate(Instant.now());

        Sprint saved = sprintRepository.save(sprint);

        notifySprintUsers(saved, "SPRINT_COMPLETED");

        return saved;
    }

    // UPDATE SPRINT DETAILS
    @PutMapping("/{id}")
    public Sprint updateSprint(
            @PathVariable String id,
            @RequestBody Sprint updated) {

        Sprint sprint = getSprint(id);

        sprint.setName(updated.getName());
        sprint.setGoal(updated.getGoal());
        sprint.setStartDate(updated.getStartDate());
        sprint.setEndDate(updated.getEndDate());

        return sprintRepository.save(sprint);
    }

    // DELETE SPRINT
    @DeleteMapping("/{id}")
    public void deleteSprint(@PathVariable String id) {
        sprintRepository.deleteById(validateId(id));
    }

    // ASSIGN ISSUE TO SPRINT
    @PutMapping("/{sprintId}/issues/{issueId}")
    public Issue addIssueToSprint(
            @PathVariable String sprintId,
            @PathVariable String issueId) {

        Sprint sprint = getSprint(sprintId);
        Issue issue = getIssue(issueId);

        if (!sprint.getProjectId().equals(issue.getProjectId())) {
            throw new RuntimeException(
                    "Issue and sprint belong to different projects");
        }

        issue.setSprintId(sprintId);
        issue.setUpdatedAt(Instant.now());

        return issueRepository.save(issue);
    }

    // REMOVE ISSUE FROM SPRINT
    @DeleteMapping("/{sprintId}/issues/{issueId}")
    public Issue removeIssueFromSprint(
            @PathVariable String sprintId,
            @PathVariable String issueId) {

        Sprint sprint = getSprint(sprintId);
        Issue issue = getIssue(issueId);

        if (!sprint.getProjectId().equals(issue.getProjectId())) {
            throw new RuntimeException(
                    "Issue and sprint belong to different projects");
        }

        issue.setSprintId(null);
        issue.setUpdatedAt(Instant.now());

        return issueRepository.save(issue);
    }

    // NOTIFY SPRINT ASSIGNEES AND REPORTERS
    private void notifySprintUsers(Sprint sprint, String eventType) {

        List<Issue> projectIssues =
                issueRepository.findByProjectId(sprint.getProjectId());

        Set<String> recipients = new HashSet<>();

        for (Issue issue : projectIssues) {
            if (sprint.getId().equals(issue.getSprintId())) {

                if (issue.getAssigneeId() != null) {
                    recipients.add(issue.getAssigneeId());
                }

                if (issue.getReporterId() != null) {
                    recipients.add(issue.getReporterId());
                }
            }
        }

        String title = "SPRINT_STARTED".equals(eventType)
                ? "Sprint started"
                : "Sprint completed";

        String message = "Sprint '" + sprint.getName()
                + "' has "
                + ("SPRINT_STARTED".equals(eventType)
                    ? "started."
                    : "been completed.");

        for (String recipientId : recipients) {

            String eventKey = sprint.getId()
                    + ":" + eventType
                    + ":" + recipientId;

            notificationService.notifyIssueEvent(
                    recipientId,
                    sprint.getProjectId(),
                    null,
                    sprint.getId(),
                    eventType,
                    eventKey,
                    title,
                    message
            );
        }
    }

    private Sprint getSprint(String id) {
        return sprintRepository.findById(validateId(id))
                .orElseThrow(() ->
                        new RuntimeException("Sprint not found"));
    }

    private Issue getIssue(String id) {
        return issueRepository.findById(validateId(id))
                .orElseThrow(() ->
                        new RuntimeException("Issue not found"));
    }

    private ObjectId validateId(String id) {
        if (id == null || !ObjectId.isValid(id)) {
            throw new RuntimeException("Invalid ID");
        }
        return new ObjectId(id);
    }
}
