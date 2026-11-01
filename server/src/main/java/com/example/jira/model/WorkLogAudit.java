
package com.example.jira.model;

import java.time.Instant;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "worklog_audits")
public class WorkLogAudit {

    @Id
    private ObjectId id;

    private String workLogId;
    private String issueId;
    private String action;
    private String performedBy;
    private String oldDescription;
    private String newDescription;
    private double oldDuration;
    private double newDuration;
    private Instant performedAt = Instant.now();

    public String getId() {
        return id == null ? null : id.toHexString();
    }

    public void setId(ObjectId id) { this.id = id; }

    public String getWorkLogId() { return workLogId; }
    public void setWorkLogId(String value) { workLogId = value; }

    public String getIssueId() { return issueId; }
    public void setIssueId(String value) { issueId = value; }

    public String getAction() { return action; }
    public void setAction(String value) { action = value; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String value) { performedBy = value; }

    public String getOldDescription() { return oldDescription; }
    public void setOldDescription(String value) { oldDescription = value; }

    public String getNewDescription() { return newDescription; }
    public void setNewDescription(String value) { newDescription = value; }

    public double getOldDuration() { return oldDuration; }
    public void setOldDuration(double value) { oldDuration = value; }

    public double getNewDuration() { return newDuration; }
    public void setNewDuration(double value) { newDuration = value; }

    public Instant getPerformedAt() { return performedAt; }
}
