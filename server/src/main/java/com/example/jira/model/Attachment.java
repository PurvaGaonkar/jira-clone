
package com.example.jira.model;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "attachments")
public class Attachment {

    @Id
    private ObjectId id;

    private String issueId;
    private String projectId;
    private String originalFileName;
    private String storedFileName;
    private String contentType;
    private long size;
    private String uploadedBy;
    private Instant uploadedAt = Instant.now();

    public String getId() {
        return id != null ? id.toHexString() : null;
    }

    public void setId(ObjectId id) {
        this.id = id;
    }

    public String getIssueId() { return issueId; }
    public void setIssueId(String issueId) { this.issueId = issueId; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getStoredFileName() { return storedFileName; }
    public void setStoredFileName(String storedFileName) {
        this.storedFileName = storedFileName;
    }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }

    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public Instant getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(Instant uploadedAt) {
        this.uploadedAt = uploadedAt;
    }
}
