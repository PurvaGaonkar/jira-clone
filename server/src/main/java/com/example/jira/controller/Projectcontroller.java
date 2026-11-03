package com.example.jira.controller;

import java.util.List;
import java.util.ArrayList;

import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.jira.dto.ProjectResponse;
import com.example.jira.model.Project;
import com.example.jira.model.User;
import com.example.jira.repository.Projectrepository;
import com.example.jira.repository.UserRepository;
import com.example.jira.service.AuthService;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/projects")
public class Projectcontroller {

    private final Projectrepository projectrepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    public Projectcontroller(
            Projectrepository projectrepository,
            UserRepository userRepository,
            AuthService authService) {
        this.projectrepository = projectrepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @PostMapping
    public Project createProject(
            @RequestHeader("Authorization") String authorization,
            @RequestBody Project project) {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        User user = authService.authenticate(authorization.substring(7));

        String userId = user.getId();

        project.setOwnerId(userId);

        List<String> members = new ArrayList<>();

        if (project.getMemberIds() != null) {
            members.addAll(project.getMemberIds());
        }

        if (!members.contains(userId)) {
            members.add(userId);
        }

        project.setMemberIds(members);

        return projectrepository.save(project);
    }

    @GetMapping
    public List<Project> getAllProjects() {
        return projectrepository.findAll();
    }

    @GetMapping("/{id}")
    public ProjectResponse getProjectById(@PathVariable String id) {

        if (!ObjectId.isValid(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid project ID");
        }

        Project project = projectrepository.findById(new ObjectId(id))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Project not found"));

        // Fetch owner safely
        User owner = null;

        if (project.getOwnerId() != null &&
                ObjectId.isValid(project.getOwnerId())) {

            owner = userRepository.findById(
                    new ObjectId(project.getOwnerId())
            ).orElse(null);
        }

        // Fetch members safely
        List<ObjectId> memberObjectIds = new ArrayList<>();

        if (project.getMemberIds() != null) {
            for (String memberId : project.getMemberIds()) {
                if (memberId != null && ObjectId.isValid(memberId)) {
                    memberObjectIds.add(new ObjectId(memberId));
                }
            }
        }

        List<User> members = memberObjectIds.isEmpty()
                ? new ArrayList<>()
                : userRepository.findByIdIn(memberObjectIds);

        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                owner,
                members
        );
    }

    @PutMapping("/{id}")
    public Project updaProject(
            @PathVariable String id,
            @RequestBody Project updated) {

        if (!ObjectId.isValid(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid project ID");
        }

        Project project = projectrepository.findById(new ObjectId(id))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Project not found"));

        project.setName(updated.getName());
        project.setDescription(updated.getDescription());
        project.setMemberIds(updated.getMemberIds());

        return projectrepository.save(project);
    }

    @DeleteMapping("/{id}")
    public void deleteproject(@PathVariable String id) {

        if (!ObjectId.isValid(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid project ID");
        }

        projectrepository.deleteById(new ObjectId(id));
    }
}