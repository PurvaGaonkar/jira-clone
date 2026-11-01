package com.example.jira.controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import com.example.jira.model.Issue;
import com.example.jira.model.Sprint;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.SprintRepository;
import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;

    public SprintController(
            SprintRepository sprintRepository,
            IssueRepository issueRepository) {
        this.sprintRepository = sprintRepository;
        this.issueRepository = issueRepository;
    }

    // =========================
    // CREATE SPRINT
    // =========================
    @PostMapping
    public Sprint createSprint(@RequestBody Sprint sprint) {
        sprint.setStatus("PLANNED");
        return sprintRepository.save(sprint);
    }

    // =========================
    // GET SPRINTS BY PROJECT
    // =========================
    @GetMapping("/project/{projectId}")
    public List<Sprint> getSprintsByProject(@PathVariable String projectId) {
        return sprintRepository.findByProjectId(projectId);
    }

    // =========================
    // START SPRINT
    // =========================
    @PutMapping("/{id}/start")
    public Sprint startSprint(@PathVariable String id) {

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setStatus("ACTIVE");
        sprint.setStartDate(Instant.now());

        return sprintRepository.save(sprint);
    }

    // =========================
    // COMPLETE SPRINT
    // =========================
    @PutMapping("/{id}/complete")
    public Sprint completeSprint(@PathVariable String id) {

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setStatus("COMPLETED");
        sprint.setEndDate(Instant.now());

        return sprintRepository.save(sprint);
    }

    // =========================
    // UPDATE SPRINT DETAILS
    // =========================
    @PutMapping("/{id}")
    public Sprint updateSprint(
            @PathVariable String id,
            @RequestBody Sprint updated) {

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setName(updated.getName());
        sprint.setGoal(updated.getGoal());
        sprint.setStartDate(updated.getStartDate());
        sprint.setEndDate(updated.getEndDate());

        return sprintRepository.save(sprint);
    }

    // =========================
    // DELETE SPRINT
    // =========================
    @DeleteMapping("/{id}")
    public void deleteSprint(@PathVariable String id) {
        sprintRepository.deleteById(new ObjectId(id));
    }

    // =========================
    // ASSIGN ISSUE TO SPRINT
    // =========================
 
@PutMapping("/{sprintId}/issues/{issueId}")
public Issue addIssueToSprint(
        @PathVariable String sprintId,
        @PathVariable String issueId) {

    Sprint sprint = sprintRepository.findById(new ObjectId(sprintId))
            .orElseThrow(() -> new RuntimeException("Sprint not found"));

    Issue issue = issueRepository.findById(new ObjectId(issueId))
            .orElseThrow(() -> new RuntimeException("Issue not found"));

    if (!sprint.getProjectId().equals(issue.getProjectId())) {
        throw new RuntimeException("Issue and sprint belong to different projects");
    }

    issue.setSprintId(sprintId);
    issue.setUpdatedAt(Instant.now());

    return issueRepository.save(issue);
}

@DeleteMapping("/{sprintId}/issues/{issueId}")
public Issue removeIssueFromSprint(
        @PathVariable String sprintId,
        @PathVariable String issueId) {

    Sprint sprint = sprintRepository.findById(new ObjectId(sprintId))
            .orElseThrow(() -> new RuntimeException("Sprint not found"));

    Issue issue = issueRepository.findById(new ObjectId(issueId))
            .orElseThrow(() -> new RuntimeException("Issue not found"));

    if (!sprint.getProjectId().equals(issue.getProjectId())) {
        throw new RuntimeException("Issue and sprint belong to different projects");
    }

    issue.setSprintId(null);
    issue.setUpdatedAt(Instant.now());

    return issueRepository.save(issue);
}





}
