package com.example.jira.dto;

import com.example.jira.model.User;
import java.util.List;

public class ProjectResponse {

    private String id;
    private String name;
    private String description;
    private User owner;
    private List<User> members;

    public ProjectResponse(
            String id,
            String name,
            String description,
            User owner,
            List<User> members
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.owner = owner;
        this.members = members;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public User getOwner() { return owner; }
    public List<User> getMembers() { return members; }
}
