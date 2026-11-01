
package com.example.jira.model;

import java.time.Instant;
import java.time.LocalDate;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "work_logs")
public class WorkLog {

    @Id
    private ObjectId id;

    private String issueId;
    private String userId;
    private LocalDate workDate;
    private double durationHours;
    private String description;

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    public String getId() {
        return id == null ? null : id.toHexString();
    }

    public void setId(ObjectId id) {
        this.id = id;
    }

    public String getIssueId() { return issueId; }
    public void setIssueId(String issueId) { this.issueId = issueId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public LocalDate getWorkDate() { return workDate; }
    public void setWorkDate(LocalDate workDate) { this.workDate = workDate; }

    public double getDurationHours() { return durationHours; }
    public void setDurationHours(double durationHours) {
        this.durationHours = durationHours;
    }

    public String getDescription() { return description; }
    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
