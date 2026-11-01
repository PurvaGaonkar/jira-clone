
package com.example.jira.controller;

import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;

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

    public IssueController(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
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

        return issueRepository.save(issue);
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

        return issueRepository.save(subtask);
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

        String newStatus = updated.getStatus();

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
        issue.setAssigneeId(updated.getAssigneeId());
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

        return issueRepository.save(issue);
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

        return issueRepository.save(issue);
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

        if (dependencyIds == null) {
            return;
        }

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

        if (currentId.equals(targetId)) {
            return true;
        }

        if (!visited.add(currentId)) {
            return false;
        }

        Issue current = getIssue(currentId);

        List<String> dependencies =
                current.getDependsOnIssueIds();

        if (dependencies == null) {
            return false;
        }

        for (String dependencyId : dependencies) {

            if (hasCircularDependency(
                    dependencyId,
                    targetId,
                    visited)) {
                return true;
            }
        }

        return false;
    }

    // DELETE ISSUE
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

        issueRepository.deleteById(validateId(id));
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

