package com.example.jira.repository;

import java.util.List;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.example.jira.model.Project;

public interface Projectrepository extends MongoRepository<Project, ObjectId> {
}
