
package com.example.jira.service;

import com.example.jira.model.Attachment;
import com.example.jira.model.Issue;
import com.example.jira.model.Project;
import com.example.jira.model.User;
import com.example.jira.repository.AttachmentRepository;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.Projectrepository;

import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class AttachmentService {

    private static final long MAX_SIZE = 10L * 1024 * 1024;

    private final AttachmentRepository attachmentRepository;
    private final IssueRepository issueRepository;
    private final Projectrepository projectRepository;
    private final Path storageDirectory;

    public AttachmentService(
            AttachmentRepository attachmentRepository,
            IssueRepository issueRepository,
            Projectrepository projectRepository,
            @Value("${app.attachments.directory:uploads/attachments}") String storageDirectory) {

        this.attachmentRepository = attachmentRepository;
        this.issueRepository = issueRepository;
        this.projectRepository = projectRepository;
        this.storageDirectory = Paths.get(storageDirectory)
                .toAbsolutePath().normalize();
    }

    public Attachment upload(String issueId, MultipartFile file, User user) {
        if (!ObjectId.isValid(issueId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid issue ID");
        }

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a file");
        }

        if (file.getSize() > MAX_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum file size is 10 MB");
        }

        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));

        Project project = getAuthorizedProject(issue.getProjectId(), user);

        String originalName = Paths.get(
                Objects.requireNonNullElse(file.getOriginalFilename(), "file")
                        .replace("\\", "/"))
                .getFileName().toString();

        String extension = getExtension(originalName);
        validateFile(file, extension);

        String storedName = UUID.randomUUID() + "." + extension;

        try {
            Files.createDirectories(storageDirectory);

            Path destination = storageDirectory.resolve(storedName).normalize();
            if (!destination.startsWith(storageDirectory)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid filename");
            }

            Files.copy(file.getInputStream(), destination, StandardCopyOption.COPY_ATTRIBUTES);

            Attachment attachment = new Attachment();
            attachment.setIssueId(issue.getId());
            attachment.setProjectId(project.getId());
            attachment.setOriginalFileName(originalName);
            attachment.setStoredFileName(storedName);
            attachment.setContentType(getContentType(extension));
            attachment.setSize(file.getSize());
            attachment.setUploadedBy(user.getId());
            attachment.setUploadedAt(Instant.now());

            try {
                return attachmentRepository.save(attachment);
            } catch (RuntimeException ex) {
                Files.deleteIfExists(destination);
                throw ex;
            }

        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Could not save attachment");
        }
    }

    public List<Attachment> getIssueAttachments(String issueId, User user) {
        if (!ObjectId.isValid(issueId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid issue ID");
        }

        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));

        getAuthorizedProject(issue.getProjectId(), user);
        return attachmentRepository.findByIssueId(issueId);
    }

    public Path getDownloadPath(String attachmentId, User user) {
        Attachment attachment = getAttachment(attachmentId);
        getAuthorizedProject(attachment.getProjectId(), user);

        Path path = storageDirectory.resolve(attachment.getStoredFileName()).normalize();

        if (!path.startsWith(storageDirectory) || !Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment file not found");
        }

        return path;
    }

    public Attachment getAttachment(String attachmentId) {
        if (!ObjectId.isValid(attachmentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid attachment ID");
        }

        return attachmentRepository.findById(new ObjectId(attachmentId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Attachment not found"));
    }

    public void delete(String attachmentId, User user) {
        Attachment attachment = getAttachment(attachmentId);
        Project project = getAuthorizedProject(attachment.getProjectId(), user);

        boolean isUploader = user.getId().equals(attachment.getUploadedBy());
        boolean isOwner = user.getId().equals(project.getOwnerId());

        if (!isUploader && !isOwner) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Only the uploader or project owner can delete this attachment");
        }

        deleteAttachmentFile(attachment);
        attachmentRepository.delete(attachment);
    }

    public void deleteAllForIssue(String issueId) {
        List<Attachment> attachments = attachmentRepository.findByIssueId(issueId);

        for (Attachment attachment : attachments) {
            deleteAttachmentFile(attachment);
        }

        attachmentRepository.deleteByIssueId(issueId);
    }

    private Project getAuthorizedProject(String projectId, User user) {
        if (!ObjectId.isValid(projectId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid project ID");
        }

        Project project = projectRepository.findById(new ObjectId(projectId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        boolean isOwner = user.getId().equals(project.getOwnerId());
        boolean isMember = project.getMemberIds() != null
                && project.getMemberIds().contains(user.getId());

        if (!isOwner && !isMember) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this project");
        }

        return project;
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file type");
        }

        String extension = filename.substring(dot + 1).toLowerCase(Locale.ROOT);

        if (!Set.of("pdf", "png", "jpg", "jpeg", "docx").contains(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PDF, PNG, JPG and DOCX files are allowed");
        }

        return extension;
    }

    private void validateFile(MultipartFile file, String extension) {
        try (InputStream input = file.getInputStream()) {
            byte[] header = input.readNBytes(8);

            boolean valid = switch (extension) {
                case "pdf" -> startsWith(header, new byte[]{'%', 'P', 'D', 'F', '-'});
                case "png" -> startsWith(header, new byte[]{
                        (byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10});
                case "jpg", "jpeg" -> header.length >= 3
                        && (header[0] & 0xFF) == 0xFF
                        && (header[1] & 0xFF) == 0xD8
                        && (header[2] & 0xFF) == 0xFF;
                case "docx" -> isDocx(file);
                default -> false;
            };

            if (!valid) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "File content does not match its extension");
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read uploaded file");
        }
    }

    private boolean isDocx(MultipartFile file) throws IOException {
        boolean hasContentTypes = false;
        boolean hasDocument = false;

        try (ZipInputStream zip = new ZipInputStream(file.getInputStream())) {
            ZipEntry entry;

            while ((entry = zip.getNextEntry()) != null) {
                if ("[Content_Types].xml".equals(entry.getName())) {
                    hasContentTypes = true;
                }
                if ("word/document.xml".equals(entry.getName())) {
                    hasDocument = true;
                }

                if (hasContentTypes && hasDocument) {
                    return true;
                }
            }
        }

        return false;
    }

    private boolean startsWith(byte[] actual, byte[] expected) {
        if (actual.length < expected.length) return false;

        for (int i = 0; i < expected.length; i++) {
            if (actual[i] != expected[i]) return false;
        }

        return true;
    }

    private String getContentType(String extension) {
        return switch (extension) {
            case "pdf" -> "application/pdf";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            default -> "application/octet-stream";
        };
    }

    private void deleteAttachmentFile(Attachment attachment) {
        try {
            Path path = storageDirectory.resolve(attachment.getStoredFileName()).normalize();

            if (path.startsWith(storageDirectory)) {
                Files.deleteIfExists(path);
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Could not delete attachment file");
        }
    }
}
