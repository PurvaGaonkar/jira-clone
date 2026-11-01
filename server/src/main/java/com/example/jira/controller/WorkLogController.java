
package com.example.jira.controller;

import com.example.jira.model.Issue;
import com.example.jira.model.User;
import com.example.jira.model.WorkLog;
import com.example.jira.model.WorkLogAudit;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.UserRepository;
import com.example.jira.repository.WorkLogRepository;
import com.example.jira.repository.WorkLogAuditRepository;

import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/worklogs")
public class WorkLogController {

    private final WorkLogRepository workLogRepository;
    private final IssueRepository issueRepository;
    private final WorkLogAuditRepository auditRepository;
    private final UserRepository userRepository;

    public WorkLogController(
            WorkLogRepository workLogRepository,
            IssueRepository issueRepository,
            WorkLogAuditRepository auditRepository,
            UserRepository userRepository) {

        this.workLogRepository = workLogRepository;
        this.issueRepository = issueRepository;
        this.auditRepository = auditRepository;
        this.userRepository = userRepository;
    }

    // CREATE WORK LOG
    @PostMapping
    public WorkLog createWorkLog(
            @RequestBody WorkLog log,
            @RequestHeader("Authorization") String header) {

        User user = authenticate(header);
        validateLog(log);

        Issue issue = getIssue(log.getIssueId());
        checkPermission(user, issue);

        log.setId(null);
        log.setUserId(user.getId());
        log.setUpdatedAt(Instant.now());

        WorkLog saved = workLogRepository.save(log);

        saveAudit(saved, "CREATE", user.getId(), null, saved);

        return saved;
    }

    // GET WORK LOGS FOR TASK
    @GetMapping("/issue/{issueId}")
    public List<WorkLog> getWorkLogs(
            @PathVariable String issueId) {

        getIssue(issueId);
        return workLogRepository.findByIssueId(issueId);
    }

    // GET TASK TOTAL HOURS
    @GetMapping("/issue/{issueId}/total")
    public double getTaskTotal(@PathVariable String issueId) {

        getIssue(issueId);

        return workLogRepository.findByIssueId(issueId)
                .stream()
                .mapToDouble(WorkLog::getDurationHours)
                .sum();
    }

    // GET SPRINT TOTAL HOURS
    @GetMapping("/sprint/{sprintId}/total")
    public double getSprintTotal(@PathVariable String sprintId) {

        return issueRepository.findAll()
                .stream()
                .filter(issue -> sprintId.equals(issue.getSprintId()))
                .flatMap(issue ->
                    workLogRepository.findByIssueId(issue.getId()).stream())
                .mapToDouble(WorkLog::getDurationHours)
                .sum();
    }

    // EDIT WORK LOG
    @PutMapping("/{id}")
    public WorkLog updateWorkLog(
            @PathVariable String id,
            @RequestBody WorkLog updated,
            @RequestHeader("Authorization") String header) {

        User user = authenticate(header);
        WorkLog log = getWorkLog(id);

        Issue issue = getIssue(log.getIssueId());
        checkPermission(user, issue);

        validateLog(updated);

        if (!log.getIssueId().equals(updated.getIssueId())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "A work log cannot be moved to another task"
            );
        }

        WorkLog oldLog = copyLog(log);

        log.setWorkDate(updated.getWorkDate());
        log.setDurationHours(updated.getDurationHours());
        log.setDescription(updated.getDescription());
        log.setUpdatedAt(Instant.now());

        WorkLog saved = workLogRepository.save(log);

        saveAudit(saved, "UPDATE", user.getId(), oldLog, saved);

        return saved;
    }

    // DELETE WORK LOG
    @DeleteMapping("/{id}")
    public void deleteWorkLog(
            @PathVariable String id,
            @RequestHeader("Authorization") String header) {

        User user = authenticate(header);
        WorkLog log = getWorkLog(id);

        Issue issue = getIssue(log.getIssueId());
        checkPermission(user, issue);

        saveAudit(log, "DELETE", user.getId(), log, null);

        workLogRepository.delete(log);
    }

    // GET AUDIT HISTORY
    // Works even after the work log has been deleted.
    @GetMapping("/{id}/audit")
    public List<WorkLogAudit> getAuditHistory(
            @PathVariable String id) {

        if (!ObjectId.isValid(id)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Invalid work log ID");
        }

        return auditRepository.findByWorkLogId(id);
    }

    // AUTHENTICATE USER USING SESSION TOKEN
    private User authenticate(String header) {

        if (header == null || !header.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Authentication required"
            );
        }

        String token = header.substring(7).trim();

        if (token.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid session"
            );
        }

        return userRepository.findBySessionToken(token)
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid session"
                ));
    }

    // CHECK TASK ASSIGNEE OR PROJECT MANAGER PERMISSION
    private void checkPermission(User user, Issue issue) {

        boolean isProjectManager =
            "PROJECT_MANAGER".equalsIgnoreCase(user.getRole());

        boolean isAssignee =
            user.getId() != null &&
            user.getId().equals(issue.getAssigneeId());

        if (!isProjectManager && !isAssignee) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only the task assignee or Project Manager can modify work logs"
            );
        }
    }

    // SAVE AUDIT RECORD
    private void saveAudit(
            WorkLog log,
            String action,
            String userId,
            WorkLog oldLog,
            WorkLog newLog) {

        WorkLogAudit audit = new WorkLogAudit();

        audit.setWorkLogId(log.getId());
        audit.setIssueId(log.getIssueId());
        audit.setAction(action);
        audit.setPerformedBy(userId);

        if (oldLog != null) {
            audit.setOldDescription(oldLog.getDescription());
            audit.setOldDuration(oldLog.getDurationHours());
        }

        if (newLog != null) {
            audit.setNewDescription(newLog.getDescription());
            audit.setNewDuration(newLog.getDurationHours());
        }

        auditRepository.save(audit);
    }

    // COPY OLD LOG FOR AUDIT
    private WorkLog copyLog(WorkLog source) {

        WorkLog copy = new WorkLog();

        copy.setId(new ObjectId(source.getId()));
        copy.setIssueId(source.getIssueId());
        copy.setUserId(source.getUserId());
        copy.setWorkDate(source.getWorkDate());
        copy.setDurationHours(source.getDurationHours());
        copy.setDescription(source.getDescription());

        return copy;
    }

    // VALIDATE WORK LOG
    private void validateLog(WorkLog log) {

        if (log.getIssueId() == null ||
                log.getIssueId().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Task ID is required");
        }

        if (log.getWorkDate() == null ||
                log.getWorkDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Work date cannot be in the future");
        }

        if (log.getDurationHours() <= 0 ||
                !Double.isFinite(log.getDurationHours())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Duration must be greater than zero");
        }

        if (log.getDescription() == null ||
                log.getDescription().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Work description is required");
        }
    }

    // GET TASK
    private Issue getIssue(String id) {

        if (!ObjectId.isValid(id)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Invalid task ID");
        }

        return issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Task not found"));
    }

    // GET WORK LOG
    private WorkLog getWorkLog(String id) {

        if (!ObjectId.isValid(id)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Invalid work log ID");
        }

        return workLogRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Work log not found"));
    }
}
