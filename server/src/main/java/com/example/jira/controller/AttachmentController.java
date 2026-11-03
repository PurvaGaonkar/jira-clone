
package com.example.jira.controller;

import com.example.jira.model.Attachment;
import com.example.jira.model.User;
import com.example.jira.service.AttachmentService;
import com.example.jira.service.AuthService;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;
    private final AuthService authService;

    public AttachmentController(
            AttachmentService attachmentService,
            AuthService authService) {
        this.attachmentService = attachmentService;
        this.authService = authService;
    }

    // Upload an attachment to an issue
    @PostMapping("/issue/{issueId}")
    public ResponseEntity<?> upload(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String issueId,
            @RequestParam("file") MultipartFile file) {

        User user = authenticateHeader(authorization);
        Attachment attachment = attachmentService.upload(issueId, file, user);

        return ResponseEntity.ok(toResponse(attachment));
    }

    // List attachments belonging to an issue
    @GetMapping("/issue/{issueId}")
    public ResponseEntity<?> getIssueAttachments(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String issueId) {

        User user = authenticateHeader(authorization);

        List<Map<String, Object>> result =
                attachmentService.getIssueAttachments(issueId, user)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(result);
    }

    // Download an attachment
    @GetMapping("/{attachmentId}/download")
    public ResponseEntity<Resource> download(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String attachmentId) {

        User user = authenticateHeader(authorization);

        Attachment attachment = attachmentService.getAttachment(attachmentId);
        Path filePath = attachmentService.getDownloadPath(attachmentId, user);

        Resource resource = new FileSystemResource(filePath);

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(attachment.getOriginalFileName(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getContentType()))
                .contentLength(attachment.getSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(resource);
    }

    // Delete an attachment
    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<?> delete(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String attachmentId) {

        User user = authenticateHeader(authorization);
        attachmentService.delete(attachmentId, user);

        return ResponseEntity.ok(Map.of("message", "Attachment deleted successfully"));
    }

    private User authenticateHeader(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Authentication required");
        }

        String token = authorization.startsWith("Bearer ")
                ? authorization.substring(7).trim()
                : authorization.trim();

        return authService.authenticate(token);
    }

    // Do not expose the internal stored filename
    private Map<String, Object> toResponse(Attachment attachment) {
        return Map.of(
                "id", attachment.getId(),
                "issueId", attachment.getIssueId(),
                "projectId", attachment.getProjectId(),
                "fileName", attachment.getOriginalFileName(),
                "contentType", attachment.getContentType(),
                "size", attachment.getSize(),
                "uploadedBy", attachment.getUploadedBy(),
                "uploadedAt", attachment.getUploadedAt(),
                "downloadUrl", "/api/attachments/" + attachment.getId() + "/download"
        );
    }
}
